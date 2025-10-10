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

    const trimmedPin = typeof pin === 'string' ? pin.trim() : '';
    if (!trimmedPin) {
      return new Response(
        JSON.stringify({ error: 'PIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find employee by PIN hash (ensure consistent trimming)
    const encodedPin = btoa(trimmedPin);
    console.log('Looking for employee with encoded PIN (trim applied)');

    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('pin_hash', encodedPin)
      .eq('is_active', true)
      .eq('pin_enabled', true)
      .maybeSingle();

    if (employeeError || !employee) {
      console.error('Employee lookup failed:', employeeError);
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee found:', { id: employee.id, name: employee.name, has_user_id: !!employee.user_id });

    // Generate a unique email and password for this employee
    let userId = employee.user_id;
    const uniqueEmail = `employee_${employee.id}@internal.app`;
    const employeePassword = `emp_${employee.id}_${employee.pin_hash}`;
    let signInEmail = uniqueEmail;

    if (!userId) {
      // Create new auth user
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
      // Update existing user's password only (avoid email collision)
      console.log('Updating existing auth user password');
      const { data: userData, error: fetchError } = await supabaseClient.auth.admin.getUserById(userId);
      
      if (fetchError) {
        console.error('Failed to fetch existing user:', fetchError);
      } else if (userData?.user?.email) {
        signInEmail = userData.user.email;
        console.log('Current auth email:', signInEmail);
      }

      const { error: pwError } = await supabaseClient.auth.admin.updateUserById(userId, {
        password: employeePassword,
      });

      if (pwError) {
        console.error('Failed to update password:', pwError);
      } else {
        console.log('Password updated successfully');
      }
    }

    console.log('User ID ready:', userId);
    console.log('Attempting sign in with email:', signInEmail);

    // Sign in the employee to get tokens
    let { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: signInEmail,
      password: employeePassword,
    });

    // Fallback: if sign-in failed and we used a different email, try uniqueEmail
    if (signInError && signInEmail !== uniqueEmail) {
      console.warn('Primary sign-in failed, retrying with uniqueEmail');
      ({ data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: uniqueEmail,
        password: employeePassword,
      }));
    }

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
