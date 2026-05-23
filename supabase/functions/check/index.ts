/**
 * Edge Function: check
 *
 * Called by the PCBoost app every 24h to revalidate a stored license.
 * Verifies the key is still active and bound to the correct motherboard.
 *
 * POST body: { key: string, moboId: string }
 * Response:  { valid: boolean }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { key, moboId } = await req.json();

    if (!key || !moboId) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const normalizedKey = key.trim().toUpperCase();

    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, status, mobo_id, plan, expires_at')
      .eq('key', normalizedKey)
      .single();

    if (error || !license) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Must be active
    if (license.status !== 'active') {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Must match motherboard
    if (license.mobo_id && license.mobo_id !== moboId) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check expiry for monthly plans
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('licenses')
        .update({ status: 'expired' })
        .eq('id', license.id);

      return new Response(
        JSON.stringify({ valid: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
