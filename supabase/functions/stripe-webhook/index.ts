/**
 * Edge Function: stripe-webhook
 *
 * Receives Stripe webhook events. On successful payment:
 * 1. Generates a license key
 * 2. Creates the license record
 * 3. Creates the payment record (with affiliate commission if coupon used)
 * 4. TODO: Send email with key via Resend/Supabase
 *
 * Required secrets:
 *   STRIPE_WEBHOOK_SECRET — from Stripe dashboard
 *   STRIPE_SECRET_KEY     — sk_live_... or sk_test_...
 *
 * Stripe Checkout metadata expected:
 *   plan: 'vitalicio' | 'mensal'
 *   coupon_code: string (optional)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFUND_GRACE_DAYS = 14;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Verify Stripe signature ──
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // ── Handle checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const buyerEmail = session.customer_details?.email || session.customer_email || '';
    const plan = (session.metadata?.plan as 'vitalicio' | 'mensal') || 'vitalicio';
    const couponCode = session.metadata?.coupon_code || null;
    const amountTotal = session.amount_total || 0; // in centavos (BRL)

    // Generate unique license key
    const { data: keyResult } = await supabase.rpc('generate_license_key');
    const licenseKey = keyResult as string;

    // Calculate expiry for monthly plans (30 days)
    const expiresAt = plan === 'mensal'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

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
      console.error('Failed to create license:', licError);
      return new Response('License creation failed', { status: 500 });
    }

    // Look up affiliate by coupon code
    let affiliateId: string | null = null;
    let commissionAmount = 0;

    if (couponCode) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, commission_pct, active')
        .eq('coupon_code', couponCode.toUpperCase())
        .single();

      if (affiliate && affiliate.active) {
        affiliateId = affiliate.id;
        commissionAmount = Math.floor(amountTotal * (affiliate.commission_pct / 100));
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
        stripe_payment_id: session.payment_intent as string || session.id,
        stripe_customer_id: session.customer as string || null,
        buyer_email: buyerEmail,
        amount: amountTotal,
        commission_amount: commissionAmount,
        coupon_code_used: couponCode,
        status: 'paid',
        refund_grace_until: graceUntil,
      });

    if (payError) {
      console.error('Failed to create payment:', payError);
    }

    // TODO: Send email with license key
    // You can use Resend, SendGrid, or Supabase's built-in email
    // Example with Resend:
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'PCBoost <noreply@pcboost.com.br>',
    //     to: buyerEmail,
    //     subject: 'Sua chave PCBoost',
    //     html: `<h1>Obrigado pela compra!</h1>
    //            <p>Sua chave de ativacao:</p>
    //            <h2 style="font-family:monospace;letter-spacing:2px">${licenseKey}</h2>
    //            <p>Abra o PCBoost e insira essa chave para ativar.</p>`,
    //   }),
    // });

    console.log(`License created: ${licenseKey} for ${buyerEmail} (plan: ${plan})`);
  }

  // ── Handle refund ──
  if (event.type === 'charge.refunded') {
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

      console.log(`Refund processed for payment intent: ${paymentIntentId}`);
    }
  }

  // ── Handle subscription renewal (monthly plan) ──
  if (event.type === 'invoice.payment_succeeded') {
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

        console.log(`Subscription renewed for license: ${payment.license_id}`);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
