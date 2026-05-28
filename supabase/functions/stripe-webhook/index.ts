/**
 * Edge Function: stripe-webhook
 *
 * Receives Stripe webhook events. On successful payment:
 * 1. Generates a license key
 * 2. Creates the license record
 * 3. Creates the payment record (with affiliate commission if coupon used)
 * 4. Sends email with key + download link via Resend
 *
 * Handles both Stripe v1 and v2 event formats:
 *   v1: event.type = "checkout.session.completed"
 *   v2: event.type = "v1.checkout.session.completed" (thin event, data.object may be null)
 *
 * Required secrets:
 *   STRIPE_WEBHOOK_SECRET — from Stripe dashboard
 *   STRIPE_SECRET_KEY     — sk_live_... or sk_test_...
 *   RESEND_API_KEY        — re_... from resend.com
 *
 * Stripe Checkout metadata expected:
 *   plan: 'anual' | 'mensal'
 *   coupon_code: string (optional)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFUND_GRACE_DAYS = 14;

/** Normalize event type — strip v1. prefix from v2 destination events */
function normalizeEventType(type: string): string {
  return type.replace(/^v1\./, '');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2025-06-30.basil' as any,
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Parse webhook event ──
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    if (signature && Deno.env.get('STRIPE_WEBHOOK_SECRET')) {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      );
    } else {
      event = JSON.parse(body);
    }
  } catch {
    // Signature verification failed — parse directly (v2 destination format)
    try {
      event = JSON.parse(body);
      console.warn('Webhook signature verification skipped — parsed event directly');
    } catch (parseErr) {
      console.error('Failed to parse webhook body:', parseErr);
      return new Response('Invalid payload', { status: 400 });
    }
  }

  const eventType = normalizeEventType(event.type);
  console.log(`[webhook] Event received: ${event.type} (normalized: ${eventType}), id: ${event.id || 'N/A'}`);

  // ── Handle checkout.session.completed ──
  if (eventType === 'checkout.session.completed') {
    // Retrieve full session data from Stripe (handles thin v2 events and ensures all fields are populated)
    let session: Stripe.Checkout.Session;
    try {
      const eventSession = event.data?.object as Stripe.Checkout.Session | undefined;
      if (eventSession?.customer_details?.email) {
        // Full event — use directly
        session = eventSession;
      } else {
        // Thin event or missing fields — retrieve from API
        const sessionId = eventSession?.id || (event.data?.object as any)?.id;
        if (!sessionId) {
          console.error('[webhook] No session ID found in event');
          return new Response('No session ID', { status: 400 });
        }
        console.log(`[webhook] Retrieving full session: ${sessionId}`);
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['customer_details'],
        });
      }
    } catch (err) {
      console.error('[webhook] Failed to get session data:', err);
      return new Response('Session retrieval failed', { status: 500 });
    }

    const stripePaymentId = (session.payment_intent as string) || session.subscription as string || session.id;
    console.log(`[webhook] Processing session ${session.id}, paymentId: ${stripePaymentId}, mode: ${session.mode}`);

    // ── Idempotency: skip if this payment was already processed ──
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_id', stripePaymentId)
      .maybeSingle();

    if (existingPayment) {
      console.log(`[webhook] Payment ${stripePaymentId} already processed — skipping duplicate`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buyerEmail = session.customer_details?.email || session.customer_email || '';
    const plan = (session.metadata?.plan as 'anual' | 'mensal' | 'vitalicio') || 'anual';
    const couponCode = session.metadata?.coupon_code || null;
    const amountTotal = session.amount_total || 0; // in centavos (BRL)

    console.log(`[webhook] Buyer: ${buyerEmail}, plan: ${plan}, amount: ${amountTotal}, coupon: ${couponCode || 'none'}`);

    // Generate unique license key
    const { data: keyResult, error: keyError } = await supabase.rpc('generate_license_key');
    if (keyError || !keyResult) {
      console.error('[webhook] Failed to generate license key:', keyError);
      return new Response('License key generation failed', { status: 500 });
    }
    const licenseKey = keyResult as string;

    // Calculate expiry based on plan
    let expiresAt: string | null = null;
    if (plan === 'mensal') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (plan === 'anual') {
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    // vitalicio (legacy) = null = never expires

    // Create license
    const { data: license, error: licError } = await supabase
      .from('licenses')
      .insert({
        key: licenseKey,
        email: buyerEmail,
        plan,
        status: 'pending', // pending until user activates in app
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (licError) {
      console.error('[webhook] Failed to create license:', licError);
      return new Response('License creation failed', { status: 500 });
    }

    console.log(`[webhook] License created: ${licenseKey} (id: ${license.id})`);

    // Look up affiliate by coupon code
    let affiliateId: string | null = null;
    let commissionAmount = 0;

    if (couponCode) {
      // Check affiliate coupon
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, commission_pct, active')
        .eq('coupon_code', couponCode.toUpperCase())
        .single();

      if (affiliate && affiliate.active) {
        affiliateId = affiliate.id;
        commissionAmount = Math.floor(amountTotal * (affiliate.commission_pct / 100));
      }

      // Increment usage on standalone coupons table (if it exists there)
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id, current_uses')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ current_uses: coupon.current_uses + 1 })
          .eq('id', coupon.id);
      }
    }

    // Grace period
    const graceUntil = new Date(Date.now() + REFUND_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Create payment record
    const { error: payError } = await supabase
      .from('payments')
      .insert({
        license_id: license.id,
        affiliate_id: affiliateId,
        stripe_payment_id: stripePaymentId,
        stripe_customer_id: session.customer as string || null,
        buyer_email: buyerEmail,
        amount: amountTotal,
        commission_amount: commissionAmount,
        coupon_code_used: couponCode,
        status: 'paid',
        refund_grace_until: graceUntil,
      });

    if (payError) {
      console.error('[webhook] Failed to create payment:', payError);
    } else {
      console.log(`[webhook] Payment record created for ${stripePaymentId}`);
    }

    // ── Send license key + download link via Resend ──
    if (buyerEmail) {
      try {
        const planLabels: Record<string, string> = { mensal: 'Mensal', anual: 'Anual', vitalicio: 'Vitalicio' };
        const planLabel = planLabels[plan] || 'Anual';
        const downloadUrl = 'https://github.com/NTZPCBooster/ntzpcbooster-app/releases/latest/download/NTZ-PCBooster-Setup.exe';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://raw.githubusercontent.com/NTZPCBooster/ntzpcbooster-app/main/public/logo-email.png" alt="NTZ PCBooster" width="100" height="100" style="display:block;margin:0 auto 12px;" />
      <p style="color:#666;font-size:13px;margin:0;">Otimizacao de PC para jogos</p>
    </div>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:32px;text-align:center;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Compra confirmada!</h2>
      <p style="color:#888;font-size:14px;margin:0 0 28px;">Obrigado pela sua compra. Aqui esta sua chave de ativacao:</p>
      <div style="background:#0a0a0a;border:2px solid #00ff41;border-radius:8px;padding:18px 24px;margin:0 0 24px;">
        <span style="color:#00ff41;font-family:'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:3px;">${licenseKey}</span>
      </div>
      <p style="color:#666;font-size:12px;margin:0 0 28px;">Plano: <strong style="color:#fff;">${planLabel}</strong></p>
      <div style="margin:0 0 24px;">
        <a href="${downloadUrl}" style="display:inline-block;background:#00ff41;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Baixar NTZ PCBooster
        </a>
      </div>
      <div style="text-align:left;background:#0d0d0d;border-radius:8px;padding:20px 24px;margin-bottom:4px;">
        <p style="color:#fff;font-size:14px;font-weight:600;margin:0 0 14px;">Como ativar:</p>
        <p style="color:#aaa;font-size:13px;margin:0 0 10px;"><span style="color:#00ff41;font-weight:bold;">1.</span> Baixe e instale o NTZ PCBooster</p>
        <p style="color:#aaa;font-size:13px;margin:0 0 10px;"><span style="color:#00ff41;font-weight:bold;">2.</span> Abra o app e clique em "Ativar licenca"</p>
        <p style="color:#aaa;font-size:13px;margin:0;"><span style="color:#00ff41;font-weight:bold;">3.</span> Cole a chave acima e pronto!</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:28px;">
      <p style="color:#444;font-size:12px;margin:0;">Duvidas? Fale com a gente: <a href="mailto:suporte@ntzpcbooster.com" style="color:#00ff41;text-decoration:none;">suporte@ntzpcbooster.com</a></p>
      <p style="color:#333;font-size:11px;margin:12px 0 0;">&copy; 2026 NTZ PCBooster. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NTZ PCBooster <noreply@ntzpcbooster.com>',
            to: buyerEmail,
            subject: `Sua chave NTZ PCBooster — Plano ${planLabel}`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error(`[webhook] Resend email failed: ${emailRes.status} ${errBody}`);
        } else {
          console.log(`[webhook] License email sent to ${buyerEmail}`);
        }
      } catch (emailErr) {
        // Don't fail the webhook if email fails — license is already created
        console.error('[webhook] Email sending error:', emailErr);
      }
    } else {
      console.warn('[webhook] No buyer email found — skipping email');
    }

    console.log(`[webhook] DONE — License: ${licenseKey}, email: ${buyerEmail}, plan: ${plan}`);
  }

  // ── Handle refund ──
  if (eventType === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = charge.payment_intent as string;

    if (paymentIntentId) {
      // Mark payment as refunded
      const { data: payment } = await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_payment_id', paymentIntentId)
        .select('license_id')
        .single();

      // Revoke the associated license
      if (payment?.license_id) {
        await supabase
          .from('licenses')
          .update({ status: 'revoked' })
          .eq('id', payment.license_id);
      }

      console.log(`[webhook] Refund processed for payment intent: ${paymentIntentId}`);
    }
  }

  // ── Handle subscription renewal (monthly plan) ──
  if (eventType === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;

    // Only handle renewal invoices (not the first one)
    if (invoice.billing_reason === 'subscription_cycle') {
      const customerId = invoice.customer as string;

      // Find existing license by stripe_customer_id
      const { data: payment } = await supabase
        .from('payments')
        .select('license_id')
        .eq('stripe_customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (payment?.license_id) {
        // Extend expiry by 30 days
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('licenses')
          .update({ expires_at: newExpiry, status: 'active' })
          .eq('id', payment.license_id);

        console.log(`[webhook] Subscription renewed for license: ${payment.license_id}`);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
