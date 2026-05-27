/**
 * Edge Function: admin
 *
 * Multi-route admin API for managing licenses, affiliates, and payments.
 * Authentication: Bearer token (admin password or affiliate JWT).
 *
 * Routes (via POST body "action"):
 *
 * ── Public routes (no auth) ──
 *   coupon.validate        — Validate a coupon code
 *   coupon.redeem           — Redeem a 100% coupon (creates license directly)
 *
 * ── Owner routes (require ADMIN_SECRET) ──
 *   admin.overview         — Dashboard stats
 *   admin.licenses         — List all licenses (with pagination/search)
 *   admin.license.create   — Create a new license
 *   admin.license.edit     — Edit license fields
 *   admin.revoke           — Revoke a license
 *   admin.transfer         — Transfer mobo binding
 *   admin.coupons          — List all coupons
 *   admin.coupon.create    — Create a new coupon
 *   admin.coupon.toggle    — Enable/disable coupon
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
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';
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
    // PUBLIC COUPON ROUTES (no auth required)
    // ═══════════════════════════════════════════════════

    if (action === 'coupon.validate') {
      const { code } = body;
      if (!code) return errorResponse('Codigo obrigatorio.');

      // Check standalone coupons table first
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id, code, discount_pct, max_uses, current_uses, active')
        .eq('code', code.toUpperCase())
        .single();

      if (coupon && coupon.active && coupon.current_uses < coupon.max_uses) {
        return jsonResponse({ valid: true, discountPct: coupon.discount_pct });
      }

      // Check affiliate coupons
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('coupon_code, discount_pct, active')
        .eq('coupon_code', code.toUpperCase())
        .single();

      if (affiliate && affiliate.active) {
        return jsonResponse({ valid: true, discountPct: affiliate.discount_pct });
      }

      return jsonResponse({ valid: false });
    }

    if (action === 'coupon.redeem') {
      const { code, email } = body;
      if (!code || !email) return errorResponse('Codigo e email obrigatorios.');

      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (!coupon || !coupon.active || coupon.current_uses >= coupon.max_uses) {
        return errorResponse('Cupom invalido ou esgotado.');
      }

      if (coupon.discount_pct !== 100) {
        return errorResponse('Este cupom nao e 100%%. Use o checkout normal com desconto.');
      }

      // Generate license key
      const { data: key } = await supabase.rpc('generate_license_key');
      if (!key) return errorResponse('Erro ao gerar chave.');

      // Create license (lifetime, pending activation)
      const { data: license, error: licError } = await supabase
        .from('licenses')
        .insert({
          key,
          email: email.toLowerCase(),
          plan: 'vitalicio',
          status: 'pending',
          expires_at: null,
        })
        .select('id, key, email, plan, status')
        .single();

      if (licError) return errorResponse('Erro ao criar licenca.');

      // Increment coupon usage
      await supabase
        .from('coupons')
        .update({ current_uses: coupon.current_uses + 1 })
        .eq('id', coupon.id);

      // Record payment with amount 0
      await supabase
        .from('payments')
        .insert({
          license_id: license.id,
          buyer_email: email.toLowerCase(),
          amount: 0,
          commission_amount: 0,
          status: 'paid',
          coupon_code_used: coupon.code,
        });

      // Send license email via Resend
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (RESEND_API_KEY) {
        const downloadUrl = 'https://github.com/NTZPCBooster/ntzpcbooster-app/releases/latest/download/NTZ-PCBooster-Setup.exe';
        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#00ff41;font-size:22px;margin:0;letter-spacing:1px;">NTZ PCBOOSTER</h1>
      <p style="color:#666;font-size:13px;margin:6px 0 0;">Otimizacao de PC para jogos</p>
    </div>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:32px;text-align:center;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Resgate confirmado!</h2>
      <p style="color:#888;font-size:14px;margin:0 0 28px;">Cupom <strong style="color:#00ff41;">${coupon.code}</strong> aplicado. Aqui esta sua chave:</p>
      <div style="background:#0a0a0a;border:2px solid #00ff41;border-radius:8px;padding:18px 24px;margin:0 0 24px;">
        <span style="color:#00ff41;font-family:'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:3px;">${key}</span>
      </div>
      <p style="color:#666;font-size:12px;margin:0 0 28px;">Plano: <strong style="color:#fff;">Vitalicio</strong></p>
      <div style="margin:0 0 24px;">
        <a href="${downloadUrl}" style="display:inline-block;background:#00ff41;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Baixar NTZ PCBooster
        </a>
      </div>
      <div style="text-align:left;background:#0d0d0d;border-radius:8px;padding:20px 24px;">
        <p style="color:#fff;font-size:14px;font-weight:600;margin:0 0 14px;">Como ativar:</p>
        <p style="color:#aaa;font-size:13px;margin:0 0 10px;"><span style="color:#00ff41;font-weight:bold;">1.</span> Baixe e instale o NTZ PCBooster</p>
        <p style="color:#aaa;font-size:13px;margin:0 0 10px;"><span style="color:#00ff41;font-weight:bold;">2.</span> Abra o app e clique em "Ativar licenca"</p>
        <p style="color:#aaa;font-size:13px;margin:0;"><span style="color:#00ff41;font-weight:bold;">3.</span> Cole a chave acima e pronto!</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:28px;">
      <p style="color:#444;font-size:12px;margin:0;">Duvidas? <a href="mailto:suporte@ntzpcbooster.com" style="color:#00ff41;text-decoration:none;">suporte@ntzpcbooster.com</a></p>
    </div>
  </div>
</body>
</html>`;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'NTZ PCBooster <noreply@ntzpcbooster.com>',
              to: [email.toLowerCase()],
              subject: 'Sua chave NTZ PCBooster — Resgate gratuito',
              html: emailHtml,
            }),
          });
        } catch (emailErr) {
          console.error('Failed to send redeem email:', emailErr);
        }
      }

      return jsonResponse({ success: true, license });
    }

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

      const valid = bcrypt.compareSync(password, affiliate.password_hash);
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

    // ── Create License ──
    if (action === 'admin.license.create') {
      const { email, plan, duration } = body;
      // duration: '7d' | '30d' | '365d' | 'lifetime'
      if (!email || !plan) return errorResponse('email e plan obrigatorios.');

      // Generate key via DB function
      const { data: keyRow } = await supabase.rpc('generate_license_key');
      const key = keyRow;
      if (!key) return errorResponse('Erro ao gerar chave.');

      let expiresAt: string | null = null;
      if (duration && duration !== 'lifetime') {
        const days = parseInt(duration);
        if (!isNaN(days) && days > 0) {
          const d = new Date();
          d.setDate(d.getDate() + days);
          expiresAt = d.toISOString();
        }
      }

      const { data, error } = await supabase
        .from('licenses')
        .insert({
          key,
          email: email.toLowerCase(),
          plan: ['mensal', 'anual', 'vitalicio'].includes(plan) ? plan : 'vitalicio',
          status: 'pending',
          expires_at: expiresAt,
        })
        .select('id, key, email, plan, status, expires_at, created_at')
        .single();

      if (error) return errorResponse(`Erro ao criar licenca: ${error.message}`);
      return jsonResponse({ success: true, license: data });
    }

    // ── Edit License ──
    if (action === 'admin.license.edit') {
      const { licenseId, email, plan, status, expiresAt, moboId } = body;
      if (!licenseId) return errorResponse('licenseId obrigatorio.');

      const updates: Record<string, unknown> = {};
      if (email !== undefined) updates.email = email.toLowerCase();
      if (plan !== undefined) updates.plan = plan;
      if (status !== undefined) updates.status = status;
      if (expiresAt !== undefined) updates.expires_at = expiresAt;
      if (moboId !== undefined) updates.mobo_id = moboId || null;

      if (Object.keys(updates).length === 0) return errorResponse('Nenhum campo pra atualizar.');

      const { error } = await supabase
        .from('licenses')
        .update(updates)
        .eq('id', licenseId);

      if (error) return errorResponse(`Erro ao editar: ${error.message}`);
      return jsonResponse({ success: true });
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

    // ── Coupons List ──
    if (action === 'admin.coupons') {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      return jsonResponse({ coupons: data });
    }

    // ── Create Coupon ──
    if (action === 'admin.coupon.create') {
      const { code, discountPct, maxUses } = body;
      if (!code || !discountPct) return errorResponse('code e discountPct obrigatorios.');

      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code: code.toUpperCase(),
          discount_pct: discountPct,
          max_uses: maxUses || 1,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') return errorResponse('Codigo ja existe.');
        return errorResponse('Erro ao criar cupom.');
      }

      return jsonResponse({ success: true, coupon: data });
    }

    // ── Toggle Coupon ──
    if (action === 'admin.coupon.toggle') {
      const { couponId, active } = body;
      if (!couponId || active === undefined) return errorResponse('couponId e active obrigatorios.');

      const { error } = await supabase
        .from('coupons')
        .update({ active })
        .eq('id', couponId);

      if (error) return errorResponse('Erro ao atualizar cupom.');
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

      const hash = bcrypt.hashSync(password, 10);

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
