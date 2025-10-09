import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { pin } = await req.json();

    if (!pin) {
      return new Response(
        JSON.stringify({ error: 'PIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find employee by PIN hash
    const encodedPin = btoa(pin);
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('pin_hash', encodedPin)
      .eq('is_active', true)
      .eq('pin_enabled', true)
      .single();

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a unique email and password for this employee if they don't have a user_id
    let userId = employee.user_id;

    if (!userId) {
      const uniqueEmail = `employee_${employee.id}@internal.app`;
      const randomPassword = crypto.randomUUID();

      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: uniqueEmail,
        password: randomPassword,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        console.error('Auth creation error:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create employee account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;

      // Update employee with user_id
      const { error: updateError } = await supabaseClient
        .from('employees')
        .update({ user_id: userId })
        .eq('id', employee.id);

      if (updateError) {
        console.error('Failed to update employee user_id:', updateError);
      }

      // Assign employee role
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role: 'employee' });

      if (roleError) {
        console.error('Failed to assign employee role:', roleError);
      }
    }

    // Generate a one-time login link
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: `employee_${employee.id}@internal.app`,
    });

    if (linkError || !linkData) {
      console.error('Magic link error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate login session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the tokens from the link
    const url = new URL(linkData.properties.action_link);
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');

    if (!access_token || !refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token,
        refresh_token,
        employee: {
          id: employee.id,
          name: employee.name,
          position: employee.position,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Employee PIN login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
