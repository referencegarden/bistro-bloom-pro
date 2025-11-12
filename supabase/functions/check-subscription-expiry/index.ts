import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find all subscriptions that have passed their end_date but are still active or trial
    const { data: expiredSubscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('id, tenant_id, end_date, status')
      .lt('end_date', new Date().toISOString())
      .in('status', ['active', 'trial']);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No expired subscriptions found',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update all expired subscriptions to 'expired' status
    const subscriptionIds = expiredSubscriptions.map(sub => sub.id);
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('id', subscriptionIds);

    if (updateError) {
      throw updateError;
    }

    // Also set the tenants to inactive
    const tenantIds = expiredSubscriptions.map(sub => sub.tenant_id);
    await supabaseClient
      .from('tenants')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', tenantIds);

    console.log(`Updated ${expiredSubscriptions.length} expired subscriptions`);

    return new Response(
      JSON.stringify({ 
        message: 'Subscription expiry check completed',
        count: expiredSubscriptions.length,
        subscriptions: expiredSubscriptions.map(s => ({
          tenant_id: s.tenant_id,
          end_date: s.end_date,
          previous_status: s.status
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
