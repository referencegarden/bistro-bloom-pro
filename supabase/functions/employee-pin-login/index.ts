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
    const { employeeIdentifier, pin } = await req.json();

    if (!employeeIdentifier || !pin) {
      return new Response(
        JSON.stringify({ error: 'Employee identifier and PIN are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find employee by employee_number or name
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, name, employee_number, pin_hash, pin_enabled, is_active, user_id')
      .or(`employee_number.eq.${employeeIdentifier},name.ilike.${employeeIdentifier}`)
      .single();

    if (employeeError || !employee) {
      console.log('Employee not found:', employeeIdentifier);
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if employee is active and PIN is enabled
    if (!employee.is_active) {
      return new Response(
        JSON.stringify({ error: 'Employee account is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!employee.pin_enabled || !employee.pin_hash) {
      return new Response(
        JSON.stringify({ error: 'PIN login not enabled for this employee' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN (stored as Base64)
    const encodedPin = btoa(pin);
    const pinValid = encodedPin === employee.pin_hash;

    if (!pinValid) {
      console.log('Invalid PIN for employee:', employee.name);
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create auth user for this employee
    let userId = employee.user_id;

    if (!userId) {
      // Create a new auth user for this employee
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: `employee_${employee.employee_number || employee.id}@internal.app`,
        password: crypto.randomUUID(), // Random password, not to be used
        email_confirm: true,
        user_metadata: {
          employee_id: employee.id,
          employee_name: employee.name,
        },
      });

      if (authError) {
        console.error('Failed to create auth user:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
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
        return new Response(
          JSON.stringify({ error: 'Failed to link employee account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully updated employee user_id:', employee.id);

      // Assign employee role
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role: 'employee' });

      if (roleError) {
        console.error('Failed to assign employee role:', roleError);
        // Don't fail the login if role assignment fails, it might already exist
      }
    }

    // Generate session for the employee
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: `employee_${employee.employee_number || employee.id}@internal.app`,
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return session and employee info
    return new Response(
      JSON.stringify({
        session: sessionData,
        employee: {
          id: employee.id,
          name: employee.name,
          employee_number: employee.employee_number,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
