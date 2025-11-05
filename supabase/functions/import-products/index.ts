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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has admin role or can_manage_stock permission
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = userRole?.role === 'admin';

    // If not admin, check employee permissions
    let hasPermission = isAdmin;
    if (!isAdmin) {
      const { data: employee } = await supabaseClient
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (employee) {
        const { data: permissions } = await supabaseClient
          .from('employee_permissions')
          .select('can_manage_stock')
          .eq('employee_id', employee.id)
          .maybeSingle();

        hasPermission = permissions?.can_manage_stock === true;
      }
    }

    if (!hasPermission) {
      console.log('Unauthorized import attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin privileges or stock management permission required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { products } = await req.json();

    // Rate limiting: max 500 products per request
    if (products && Array.isArray(products) && products.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Maximum 500 products per import request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ error: 'Invalid products data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${products.length} products for import`);

    // Get all categories for matching
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('categories')
      .select('id, name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch categories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryMap = new Map(
      categories?.map(cat => [cat.name.toLowerCase().trim(), cat.id]) || []
    );

    // Extract all unique categories from products and auto-create missing ones
    const uniqueCategories = new Map<string, string>(); // normalized -> original name
    products.forEach(product => {
      if (product.category_name) {
        const normalized = product.category_name.toLowerCase().trim();
        if (!categoryMap.has(normalized) && !uniqueCategories.has(normalized)) {
          uniqueCategories.set(normalized, product.category_name.trim());
        }
      }
    });

    // Create missing categories
    if (uniqueCategories.size > 0) {
      const categoriesToCreate = Array.from(uniqueCategories.values()).map(name => ({
        name,
        description: null,
      }));

      console.log(`Creating ${categoriesToCreate.length} missing categories:`, categoriesToCreate.map(c => c.name));

      const { data: newCategories, error: createError } = await supabaseClient
        .from('categories')
        .insert(categoriesToCreate)
        .select('id, name');

      if (createError) {
        console.error('Error creating categories:', createError);
      } else if (newCategories) {
        // Add newly created categories to the map
        newCategories.forEach(cat => {
          categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
        });
        console.log(`Successfully created ${newCategories.length} categories`);
      }
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNumber = i + 2; // +2 for header and 0-index

      try {
        // Validate required fields
        if (!product.name || typeof product.name !== 'string') {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name || 'Unknown',
            error: 'Missing or invalid product name',
          });
          continue;
        }

        // Validate name length
        if (product.name.trim().length === 0 || product.name.trim().length > 200) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name,
            error: 'Product name must be between 1 and 200 characters',
          });
          continue;
        }

        if (product.cost === undefined || product.cost === null) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name,
            error: 'Missing cost/price value',
          });
          continue;
        }

        // Match category (should now exist after auto-creation)
        const categoryName = product.category_name?.toLowerCase().trim();
        const categoryId = categoryName ? categoryMap.get(categoryName) : null;

        // Parse and validate cost
        const cost = parseFloat(product.cost);
        if (isNaN(cost) || !isFinite(cost) || cost < 0 || cost > 1000000) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name,
            error: `Invalid cost value: ${product.cost} (must be 0-1,000,000)`,
          });
          continue;
        }

        // Validate unit of measure
        const unitOfMeasure = product.unit_of_measure?.trim() || 'unité';
        if (unitOfMeasure.length > 50) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name,
            error: 'Unit of measure too long (max 50 characters)',
          });
          continue;
        }

        // Prepare product data with validated values
        const productData = {
          name: product.name.trim().substring(0, 200),
          unit_of_measure: unitOfMeasure.substring(0, 50),
          cost_price: cost,
          sales_price: cost * 1.3, // Default 30% markup
          current_stock: 0,
          low_stock_threshold: 10,
          category_id: categoryId,
        };

        // Upsert product (update if exists, insert if new)
        const { error: upsertError } = await supabaseClient
          .from('products')
          .upsert(productData, { 
            onConflict: 'name',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error(`Error upserting product ${productData.name}:`, upsertError);
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: productData.name,
            error: upsertError.message,
          });
        } else {
          results.success++;
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          name: product.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('Import results:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import products error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
