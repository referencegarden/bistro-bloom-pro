import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";

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

    const { pin, tenantId } = await req.json();

    const trimmedPin = typeof pin === 'string' ? pin.trim() : '';
    if (!trimmedPin) {
      return new Response(
        JSON.stringify({ error: 'PIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(trimmedPin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find all active employees with PIN enabled in this tenant
    const { data: employees, error: employeeError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .eq('pin_enabled', true)
      .eq('tenant_id', tenantId)
      .not('pin_hash', 'is', null);

    if (employeeError) {
      console.error('Employee lookup failed:', employeeError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find employee by comparing PIN hash using bcrypt (sync version - required in Deno)
    let employee = null;
    for (const emp of employees || []) {
      try {
        const isMatch = bcrypt.compareSync(trimmedPin, emp.pin_hash);
        if (isMatch) {
          employee = emp;
          break; // Exit loop early once we find a match
        }
      } catch (e) {
        console.error('Error comparing PIN for employee:', emp.id, e);
      }
    }

    if (!employee) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee found:', { id: employee.id, name: employee.name, has_user_id: !!employee.user_id });

    // Generate a unique email and password for this employee
    let userId = employee.user_id;
    const uniqueEmail = `employee_${employee.id}@internal.app`;
    // Generate a secure but simple password (not using pin_hash to avoid length issues)
    const employeePassword = `EmpPin${employee.id}2025!`;
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

      // Create tenant_users record
      const { error: tenantUserError } = await supabaseClient
        .from('tenant_users')
        .insert({ user_id: userId, tenant_id: employee.tenant_id });

      if (tenantUserError) {
        console.error('Failed to create tenant_users record:', tenantUserError);
      }
    } else {
      // Check if auth user exists
      console.log('Checking existing auth user');
      const { data: userData, error: fetchError } = await supabaseClient.auth.admin.getUserById(userId);
      
      if (fetchError || !userData?.user) {
        // Auth user doesn't exist (might have been deleted), create a new one
        console.log('Auth user not found, creating new one');
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

        // Update employee with new user_id
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

        // Create tenant_users record
        const { error: tenantUserError } = await supabaseClient
          .from('tenant_users')
          .insert({ user_id: userId, tenant_id: employee.tenant_id });

        if (tenantUserError) {
          console.error('Failed to create tenant_users record:', tenantUserError);
        }
      } else {
        // Update existing user's password
        signInEmail = userData.user.email ?? uniqueEmail;
        console.log('Current auth email:', signInEmail);

        const { error: pwError } = await supabaseClient.auth.admin.updateUserById(userId, {
          password: employeePassword,
        });

        if (pwError) {
          console.error('Failed to update password:', pwError);
        } else {
          console.log('Password updated successfully');
        }
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
