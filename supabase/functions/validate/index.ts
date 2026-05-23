/**
 * Edge Function: validate
 *
 * Called by the PCBoost app when a user enters a license key.
 * Validates the key and binds it to the user's motherboard serial.
 *
 * POST body: { key: string, moboId: string }
 * Response:  { valid: boolean, error?: string, email?: string, plan?: string, activatedAt?: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { key, moboId } = await req.json();

    if (!key || !moboId) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Chave e Hardware ID sao obrigatorios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Use service_role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Normalize key (trim, uppercase)
    const normalizedKey = key.trim().toUpperCase();

    // Look up the license
    const { data: license, error: fetchErr } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', normalizedKey)
      .single();

    if (fetchErr || !license) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Chave nao encontrada. Verifique e tente novamente.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check if revoked
    if (license.status === 'revoked') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Esta chave foi revogada. Entre em contato com o suporte.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check if expired (monthly plan)
    if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at) < new Date())) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Sua licenca expirou. Renove para continuar usando.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Pending: first activation ──
    if (license.status === 'pending') {
      const { error: updateErr } = await supabase
        .from('licenses')
        .update({
          mobo_id: moboId,
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', license.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Erro ao ativar. Tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          email: license.email,
          plan: license.plan,
          activatedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Active: check motherboard binding ──
    if (license.status === 'active') {
      if (license.mobo_id && license.mobo_id !== moboId) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Esta chave ja esta vinculada a outro computador. Entre em contato com o suporte para transferir.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Same mobo or mobo was null (bind now)
      if (!license.mobo_id) {
        await supabase
          .from('licenses')
          .update({ mobo_id: moboId })
          .eq('id', license.id);
      }

      return new Response(
        JSON.stringify({
          valid: true,
          email: license.email,
          plan: license.plan,
          activatedAt: license.activated_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fallback
    return new Response(
      JSON.stringify({ valid: false, error: 'Status de licenca desconhecido.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro interno do servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
