-- Remove duplicate triggers causing double stock deduction on menu recipe sales
-- We drop all existing triggers on public.menu_item_sales and recreate a single canonical set

-- Drop all known triggers on menu_item_sales
DROP TRIGGER IF EXISTS trg_deduct_stock_on_menu_item_sale ON public.menu_item_sales; -- safety (old typo variant)
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_menu_sale ON public.menu_item_sales;   -- legacy name
DROP TRIGGER IF EXISTS deduct_stock_on_menu_sale_trigger ON public.menu_item_sales;   -- legacy name
DROP TRIGGER IF EXISTS trg_deduct_stock_on_menu_sale ON public.menu_item_sales;       -- currently present (duplicate)
DROP TRIGGER IF EXISTS trg_menu_sales_ai_deduct ON public.menu_item_sales;            -- currently present (duplicate)

DROP TRIGGER IF EXISTS trg_restore_stock_on_menu_item_sale_delete ON public.menu_item_sales; -- safety
DROP TRIGGER IF EXISTS trigger_restore_stock_on_menu_sale_delete ON public.menu_item_sales;   -- legacy name
DROP TRIGGER IF EXISTS restore_stock_on_menu_sale_delete_trigger ON public.menu_item_sales;   -- legacy name
DROP TRIGGER IF EXISTS trg_restore_stock_on_menu_sale_delete ON public.menu_item_sales;       -- currently present (duplicate)
DROP TRIGGER IF EXISTS trg_menu_sales_ad_restore ON public.menu_item_sales;                   -- currently present (duplicate)

DROP TRIGGER IF EXISTS trg_adjust_stock_on_menu_item_sale_update ON public.menu_item_sales; -- safety
DROP TRIGGER IF EXISTS trigger_adjust_stock_on_menu_sale_update ON public.menu_item_sales;  -- legacy name
DROP TRIGGER IF EXISTS adjust_stock_on_menu_sale_update_trigger ON public.menu_item_sales;  -- legacy name
DROP TRIGGER IF EXISTS trg_adjust_stock_on_menu_sale_update ON public.menu_item_sales;      -- currently present (duplicate)
DROP TRIGGER IF EXISTS trg_menu_sales_au_adjust ON public.menu_item_sales;                 -- currently present (duplicate)

-- Recreate the single canonical set of triggers
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