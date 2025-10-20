-- 1. Remove stock deduction trigger from regular sales (sortie de stock)
-- This allows tracking who takes products without affecting inventory value
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON public.sales;
DROP TRIGGER IF EXISTS trigger_revert_stock_on_sale_delete ON public.sales;

-- Keep the functions for potential future use but don't apply them to sales table
-- The sales table will now only track product exits without modifying stock

-- 2. Fix menu item sales stock deduction (ensure triggers are working correctly)
-- First, drop existing triggers if any
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_menu_sale ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_menu_sale_delete ON public.menu_item_sales;

-- Recreate the menu sale stock deduction trigger
CREATE TRIGGER trigger_deduct_stock_on_menu_sale
  AFTER INSERT ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

-- Recreate the menu sale stock restoration trigger
CREATE TRIGGER trigger_restore_stock_on_menu_sale_delete
  AFTER DELETE ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();