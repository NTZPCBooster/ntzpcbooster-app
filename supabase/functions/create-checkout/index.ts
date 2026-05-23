/**
 * Edge Function: create-checkout
 *
 * Called by the landing page to create a Stripe Checkout session.
 * Validates coupon code (if any), applies discount, and redirects to Stripe.
 *
 * POST body: {
 *   plan: 'vitalicio' | 'mensal',
 *   couponCode?: string,
 *   successUrl: string,
 *   cancelUrl: string,
 * }
 *
 * Response: { url: string } — Stripe Checkout URL to redirect to
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_LIFETIME  — price_xxx for R$79.90 one-time
 *   STRIPE_PRICE_MONTHLY   — price_xxx for R$19.90 recurring
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { plan, couponCode, successUrl, cancelUrl } = await req.json();

    if (!plan || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'plan, successUrl e cancelUrl obrigatorios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Determine price ID
    const priceId = plan === 'mensal'
      ? Deno.env.get('STRIPE_PRICE_MONTHLY')!
      : Deno.env.get('STRIPE_PRICE_LIFETIME')!;

    // Check coupon code for discount
    let discountPct = 0;
    let validCoupon: string | null = null;

    if (couponCode) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('coupon_code, discount_pct, active')
        .eq('coupon_code', couponCode.toUpperCase())
        .single();

      if (affiliate && affiliate.active) {
        discountPct = affiliate.discount_pct;
        validCoupon = affiliate.coupon_code;
      }
    }

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: plan === 'mensal' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan,
        coupon_code: validCoupon || '',
      },
      locale: 'pt-BR',
    };

    // Apply discount via Stripe coupon (create on-the-fly if needed)
    if (discountPct > 0) {
      // Create a Stripe coupon for this discount
      const stripeCoupon = await stripe.coupons.create({
        percent_off: discountPct,
        duration: 'once',
        name: `Cupom ${validCoupon} (${discountPct}% off)`,
      });

      if (plan === 'mensal') {
        sessionParams.discounts = [{ coupon: stripeCoupon.id }];
      } else {
        sessionParams.discounts = [{ coupon: stripeCoupon.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao criar sessao de pagamento.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
