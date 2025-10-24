-- Clean up duplicate triggers and create canonical single triggers
-- This ensures stock adjustments happen exactly once per operation

-- ============================================
-- PURCHASES TABLE
-- ============================================

-- Drop all existing purchase triggers
DROP TRIGGER IF EXISTS trigger_update_stock_on_purchase ON public.purchases;
DROP TRIGGER IF EXISTS update_stock_on_purchase_trigger ON public.purchases;
DROP TRIGGER IF EXISTS trigger_revert_stock_on_purchase_delete ON public.purchases;
DROP TRIGGER IF EXISTS revert_stock_on_purchase_delete_trigger ON public.purchases;
DROP TRIGGER IF EXISTS fulfill_demand_on_purchase_trigger ON public.purchases;

-- Create canonical purchase triggers (single source of truth)
CREATE TRIGGER trg_purchases_ai_stock
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_purchase();

CREATE TRIGGER trg_purchases_ad_stock
  AFTER DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_stock_on_purchase_delete();

CREATE TRIGGER trg_purchases_ai_fulfill_demand
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_demand_on_purchase();

-- ============================================
-- SALES TABLE (direct product sales)
-- ============================================

-- Drop all existing sales triggers
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON public.sales;
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger ON public.sales;
DROP TRIGGER IF EXISTS trigger_revert_stock_on_sale_delete ON public.sales;
DROP TRIGGER IF EXISTS revert_stock_on_sale_delete_trigger ON public.sales;

-- Create canonical sales triggers (single source of truth)
CREATE TRIGGER trg_sales_ai_stock
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_sale();

CREATE TRIGGER trg_sales_ad_stock
  AFTER DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_stock_on_sale_delete();

-- ============================================
-- MENU_ITEM_SALES TABLE (recipe sales)
-- ============================================

-- Drop all existing menu sale triggers
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_menu_sale ON public.menu_item_sales;
DROP TRIGGER IF EXISTS deduct_stock_on_menu_sale_trigger ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_menu_sale_delete ON public.menu_item_sales;
DROP TRIGGER IF EXISTS restore_stock_on_menu_sale_delete_trigger ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_adjust_stock_on_menu_sale_update ON public.menu_item_sales;
DROP TRIGGER IF EXISTS adjust_stock_on_menu_sale_update_trigger ON public.menu_item_sales;

-- Create canonical menu sale triggers (single source of truth)
CREATE TRIGGER trg_menu_sales_ai_deduct
  AFTER INSERT ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

CREATE TRIGGER trg_menu_sales_ad_restore
  AFTER DELETE ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();

CREATE TRIGGER trg_menu_sales_au_adjust
  AFTER UPDATE OF quantity, menu_item_id ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_stock_on_menu_sale_update();

-- ============================================
-- VERIFY CASCADE DELETE FOR INGREDIENTS
-- ============================================

-- Ensure menu_item_ingredients cascade deletes when menu item is deleted
ALTER TABLE public.menu_item_ingredients 
  DROP CONSTRAINT IF EXISTS menu_item_ingredients_menu_item_id_fkey;

ALTER TABLE public.menu_item_ingredients
  ADD CONSTRAINT menu_item_ingredients_menu_item_id_fkey 
  FOREIGN KEY (menu_item_id) 
  REFERENCES public.menu_items(id) 
  ON DELETE CASCADE;

-- Ensure product_id remains RESTRICT (cannot delete products used in recipes)
ALTER TABLE public.menu_item_ingredients 
  DROP CONSTRAINT IF EXISTS menu_item_ingredients_product_id_fkey;

ALTER TABLE public.menu_item_ingredients
  ADD CONSTRAINT menu_item_ingredients_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE RESTRICT;