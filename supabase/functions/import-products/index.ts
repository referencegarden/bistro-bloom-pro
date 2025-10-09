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

    // Verify user is admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { products } = await req.json();

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
        if (!product.name || !product.cost) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name || 'Unknown',
            error: 'Missing required fields (name or cost)',
          });
          continue;
        }

        // Match category
        const categoryName = product.category_name?.toLowerCase().trim();
        const categoryId = categoryName ? categoryMap.get(categoryName) : null;

        if (product.category_name && !categoryId) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name,
            error: `Category not found: ${product.category_name}`,
          });
          continue;
        }

        // Parse cost
        const cost = parseFloat(product.cost);
        if (isNaN(cost) || cost < 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: product.name,
            error: `Invalid cost value: ${product.cost}`,
          });
          continue;
        }

        // Prepare product data
        const productData = {
          name: product.name.trim(),
          unit_of_measure: product.unit_of_measure?.trim() || 'unité',
          cost_price: cost,
          sales_price: cost * 1.3, // Default 30% markup
          current_stock: 0,
          low_stock_threshold: 10,
          category_id: categoryId,
        };

        // Check if product exists
        const { data: existingProduct } = await supabaseClient
          .from('products')
          .select('id')
          .eq('name', productData.name)
          .maybeSingle();

        if (existingProduct) {
          // Update existing product
          const { error: updateError } = await supabaseClient
            .from('products')
            .update(productData)
            .eq('id', existingProduct.id);

          if (updateError) {
            console.error(`Error updating product ${productData.name}:`, updateError);
            results.failed++;
            results.errors.push({
              row: rowNumber,
              name: productData.name,
              error: updateError.message,
            });
          } else {
            results.success++;
          }
        } else {
          // Insert new product
          const { error: insertError } = await supabaseClient
            .from('products')
            .insert(productData);

          if (insertError) {
            console.error(`Error inserting product ${productData.name}:`, insertError);
            results.failed++;
            results.errors.push({
              row: rowNumber,
              name: productData.name,
              error: insertError.message,
            });
          } else {
            results.success++;
          }
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
