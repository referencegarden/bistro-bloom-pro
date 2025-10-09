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
    console.log('Looking for employee with encoded PIN');
    
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('pin_hash', encodedPin)
      .eq('is_active', true)
      .eq('pin_enabled', true)
      .single();

    if (employeeError || !employee) {
      console.error('Employee lookup failed:', employeeError);
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee found:', { id: employee.id, name: employee.name, has_user_id: !!employee.user_id });

    // Generate a unique email and password for this employee if they don't have a user_id
    let userId = employee.user_id;
    const uniqueEmail = `employee_${employee.id}@internal.app`;
    const employeePassword = `emp_${employee.id}_${employee.pin_hash}`;

    if (!userId) {
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: uniqueEmail,
        password: employeePassword,
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
    } else {
      // Update existing user's email and password to normalize the auth user
      console.log('Updating existing auth user to normalize credentials');
      await supabaseClient.auth.admin.updateUserById(userId, {
        email: uniqueEmail,
        password: employeePassword,
        email_confirm: true,
      });
    }

    console.log('User ID ready:', userId);
    console.log('Attempting sign in with email:', uniqueEmail);

    // Sign in the employee to get tokens
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: uniqueEmail,
      password: employeePassword,
    });

    if (signInError || !sessionData.session) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate login session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tokens generated successfully');

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
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
