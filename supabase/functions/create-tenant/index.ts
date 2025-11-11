import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTenantRequest {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  planType: 'basic' | 'pro' | 'enterprise';
  subscriptionDays: number;
  adminEmail: string;
  adminPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify super admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Check if user is super admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Super admin access required');
    }

    const body: CreateTenantRequest = await req.json();

    console.log('Creating tenant:', body.name);

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: body.name,
        slug: body.slug,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone || null,
        address: body.address || null,
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    console.log('Tenant created:', tenant.id);

    // 2. Create subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + body.subscriptionDays);

    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: tenant.id,
        status: 'active',
        plan_type: body.planType,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: true,
      });

    if (subError) {
      console.error('Subscription creation error:', subError);
      throw new Error(`Failed to create subscription: ${subError.message}`);
    }

    console.log('Subscription created');

    // 3. Create admin user for this tenant
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: body.adminEmail,
      password: body.adminPassword,
      email_confirm: true,
    });

    if (createUserError) {
      console.error('User creation error:', createUserError);
      throw new Error(`Failed to create admin user: ${createUserError.message}`);
    }

    console.log('Admin user created:', newUser.user.id);

    // 4. Assign admin role
    const { error: roleAssignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin',
      });

    if (roleAssignError) {
      console.error('Role assignment error:', roleAssignError);
      throw new Error(`Failed to assign admin role: ${roleAssignError.message}`);
    }

    console.log('Admin role assigned');

    // 5. Link user to tenant
    const { error: linkError } = await supabase
      .from('tenant_users')
      .insert({
        user_id: newUser.user.id,
        tenant_id: tenant.id,
      });

    if (linkError) {
      console.error('Tenant link error:', linkError);
      throw new Error(`Failed to link user to tenant: ${linkError.message}`);
    }

    console.log('User linked to tenant');

    // 6. Create default app settings for this tenant
    const { error: settingsError } = await supabase
      .from('app_settings')
      .insert({
        tenant_id: tenant.id,
        restaurant_name: body.name,
        tax_rate: 0,
        primary_color: 'hsl(142.1 76.2% 36.3%)',
        secondary_color: 'hsl(221.2 83.2% 53.3%)',
        background_color: 'hsl(0 0% 100%)',
      });

    if (settingsError) {
      console.error('Settings creation error:', settingsError);
      // Non-fatal, continue
    }

    console.log('Default settings created');

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        admin: {
          email: body.adminEmail,
          userId: newUser.user.id,
        },
        message: 'Tenant created successfully with admin user and active subscription',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-tenant function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
