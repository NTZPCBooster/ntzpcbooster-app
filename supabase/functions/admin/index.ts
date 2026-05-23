/**
 * Edge Function: admin
 *
 * Multi-route admin API for managing licenses, affiliates, and payments.
 * Authentication: Bearer token (admin password or affiliate JWT).
 *
 * Routes (via POST body "action"):
 *
 * ── Owner routes (require ADMIN_SECRET) ──
 *   admin.overview         — Dashboard stats
 *   admin.licenses         — List all licenses (with pagination/search)
 *   admin.revoke           — Revoke a license
 *   admin.transfer         — Transfer mobo binding
 *   admin.affiliates       — List all affiliates with stats
 *   admin.affiliate.create — Create new affiliate
 *   admin.affiliate.toggle — Enable/disable affiliate
 *   admin.payments         — List all payments
 *   admin.withdrawals      — List pending withdrawals
 *   admin.withdrawal.process — Approve/reject withdrawal
 *
 * ── Affiliate routes (require affiliate email + password) ──
 *   affiliate.login        — Login, returns JWT
 *   affiliate.dashboard    — View own stats
 *   affiliate.sales        — View own sales
 *   affiliate.withdraw     — Request withdrawal
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { create, verify } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// JWT key for affiliate tokens
async function getJwtKey() {
  const secret = Deno.env.get('ADMIN_SECRET')!;
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET')!;

  try {
    const body = await req.json();
    const { action } = body;
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    // ═══════════════════════════════════════════════════
    // AFFILIATE ROUTES
    // ═══════════════════════════════════════════════════

    if (action === 'affiliate.login') {
      const { email, password } = body;
      if (!email || !password) return errorResponse('Email e senha obrigatorios.');

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, name, email, password_hash, active')
        .eq('email', email.toLowerCase())
        .single();

      if (!affiliate) return errorResponse('Credenciais invalidas.', 401);
      if (!affiliate.active) return errorResponse('Conta desativada.', 403);

      const valid = await bcrypt.compare(password, affiliate.password_hash);
      if (!valid) return errorResponse('Credenciais invalidas.', 401);

      const key = await getJwtKey();
      const jwt = await create(
        { alg: 'HS256', typ: 'JWT' },
        {
          sub: affiliate.id,
          email: affiliate.email,
          name: affiliate.name,
          role: 'affiliate',
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
        },
        key,
      );

      return jsonResponse({ token: jwt, name: affiliate.name });
    }

    if (action?.startsWith('affiliate.')) {
      // Verify affiliate JWT
      let payload: any;
      try {
        const key = await getJwtKey();
        payload = await verify(token, key);
        if (payload.role !== 'affiliate') throw new Error();
      } catch {
        return errorResponse('Token invalido.', 401);
      }

      const affiliateId = payload.sub;

      if (action === 'affiliate.dashboard') {
        const { data } = await supabase
          .from('affiliate_dashboard')
          .select('*')
          .eq('affiliate_id', affiliateId)
          .single();

        if (!data) return errorResponse('Afiliado nao encontrado.');

        const balanceAvailable = data.commission_available_gross - data.total_withdrawn;

        return jsonResponse({
          ...data,
          balance_available: Math.max(0, balanceAvailable),
        });
      }

      if (action === 'affiliate.sales') {
        const page = body.page || 1;
        const perPage = 20;
        const offset = (page - 1) * perPage;

        const { data: sales, count } = await supabase
          .from('payments')
          .select('id, buyer_email, amount, commission_amount, coupon_code_used, status, refund_grace_until, created_at', { count: 'exact' })
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false })
          .range(offset, offset + perPage - 1);

        return jsonResponse({ sales, total: count, page, perPage });
      }

      if (action === 'affiliate.withdraw') {
        const { amount, pixKey } = body;
        if (!amount || amount < 1000) return errorResponse('Valor minimo: R$10,00');
        if (!pixKey) return errorResponse('Chave PIX obrigatoria.');

        // Check available balance
        const { data: stats } = await supabase
          .from('affiliate_dashboard')
          .select('commission_available_gross, total_withdrawn')
          .eq('affiliate_id', affiliateId)
          .single();

        if (!stats) return errorResponse('Afiliado nao encontrado.');

        const available = stats.commission_available_gross - stats.total_withdrawn;
        if (amount > available) {
          return errorResponse(`Saldo insuficiente. Disponivel: R$${(available / 100).toFixed(2)}`);
        }

        const { error } = await supabase
          .from('withdrawals')
          .insert({
            affiliate_id: affiliateId,
            amount,
            pix_key: pixKey,
            status: 'pending',
          });

        if (error) return errorResponse('Erro ao solicitar saque.');

        return jsonResponse({ success: true, message: 'Saque solicitado. Aguarde aprovacao.' });
      }

      return errorResponse('Acao desconhecida.');
    }

    // ═══════════════════════════════════════════════════
    // ADMIN ROUTES (require ADMIN_SECRET)
    // ═══════════════════════════════════════════════════

    if (token !== ADMIN_SECRET) {
      return errorResponse('Acesso negado.', 401);
    }

    // ── Overview ──
    if (action === 'admin.overview') {
      const { data } = await supabase
        .from('admin_overview')
        .select('*')
        .single();

      return jsonResponse(data || {});
    }

    // ── Licenses ──
    if (action === 'admin.licenses') {
      const page = body.page || 1;
      const perPage = 50;
      const offset = (page - 1) * perPage;
      const search = body.search || '';

      let query = supabase
        .from('licenses')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1);

      if (search) {
        query = query.or(`key.ilike.%${search}%,email.ilike.%${search}%,mobo_id.ilike.%${search}%`);
      }

      const { data, count } = await query;
      return jsonResponse({ licenses: data, total: count, page, perPage });
    }

    // ── Revoke License ──
    if (action === 'admin.revoke') {
      const { licenseId } = body;
      if (!licenseId) return errorResponse('licenseId obrigatorio.');

      const { error } = await supabase
        .from('licenses')
        .update({ status: 'revoked' })
        .eq('id', licenseId);

      if (error) return errorResponse('Erro ao revogar.');
      return jsonResponse({ success: true });
    }

    // ── Transfer Motherboard ──
    if (action === 'admin.transfer') {
      const { licenseId, newMoboId } = body;
      if (!licenseId || !newMoboId) return errorResponse('licenseId e newMoboId obrigatorios.');

      const { error } = await supabase
        .from('licenses')
        .update({ mobo_id: newMoboId })
        .eq('id', licenseId);

      if (error) return errorResponse('Erro ao transferir.');
      return jsonResponse({ success: true });
    }

    // ── Affiliates List ──
    if (action === 'admin.affiliates') {
      const { data } = await supabase
        .from('affiliate_dashboard')
        .select('*')
        .order('total_commission', { ascending: false });

      return jsonResponse({ affiliates: data });
    }

    // ── Create Affiliate ──
    if (action === 'admin.affiliate.create') {
      const { name, email, couponCode, password, commissionPct, discountPct } = body;
      if (!name || !email || !couponCode || !password) {
        return errorResponse('name, email, couponCode e password obrigatorios.');
      }

      const hash = await bcrypt.hash(password);

      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          name,
          email: email.toLowerCase(),
          password_hash: hash,
          coupon_code: couponCode.toUpperCase(),
          commission_pct: commissionPct || 20,
          discount_pct: discountPct || 10,
        })
        .select('id, coupon_code')
        .single();

      if (error) {
        if (error.code === '23505') {
          return errorResponse('Email ou cupom ja existe.');
        }
        return errorResponse('Erro ao criar afiliado.');
      }

      return jsonResponse({ success: true, affiliate: data });
    }

    // ── Toggle Affiliate ──
    if (action === 'admin.affiliate.toggle') {
      const { affiliateId, active } = body;
      if (!affiliateId || active === undefined) return errorResponse('affiliateId e active obrigatorios.');

      const { error } = await supabase
        .from('affiliates')
        .update({ active })
        .eq('id', affiliateId);

      if (error) return errorResponse('Erro ao atualizar.');
      return jsonResponse({ success: true });
    }

    // ── Payments ──
    if (action === 'admin.payments') {
      const page = body.page || 1;
      const perPage = 50;
      const offset = (page - 1) * perPage;

      const { data, count } = await supabase
        .from('payments')
        .select(`
          *,
          licenses ( key, email, plan ),
          affiliates ( name, coupon_code )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1);

      return jsonResponse({ payments: data, total: count, page, perPage });
    }

    // ── Pending Withdrawals ──
    if (action === 'admin.withdrawals') {
      const status = body.status || 'pending';

      const { data } = await supabase
        .from('withdrawals')
        .select(`
          *,
          affiliates ( name, email, coupon_code )
        `)
        .eq('status', status)
        .order('requested_at', { ascending: true });

      return jsonResponse({ withdrawals: data });
    }

    // ── Process Withdrawal ──
    if (action === 'admin.withdrawal.process') {
      const { withdrawalId, approve } = body;
      if (!withdrawalId || approve === undefined) {
        return errorResponse('withdrawalId e approve obrigatorios.');
      }

      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: approve ? 'paid' : 'rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId)
        .eq('status', 'pending'); // Only process pending ones

      if (error) return errorResponse('Erro ao processar saque.');
      return jsonResponse({ success: true });
    }

    return errorResponse('Acao desconhecida.');
  } catch (err) {
    console.error('Admin error:', err);
    return errorResponse('Erro interno.', 500);
  }
});
