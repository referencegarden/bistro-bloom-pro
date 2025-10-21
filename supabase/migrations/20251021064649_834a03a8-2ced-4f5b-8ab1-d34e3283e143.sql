-- Ensure stock updates occur for menu item sales and product sales
-- Drop existing triggers if any to avoid duplicates
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_menu_sale ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_menu_sale_delete ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON public.sales;
DROP TRIGGER IF EXISTS trigger_revert_stock_on_sale_delete ON public.sales;

-- Create triggers for menu item sales (recipes)
CREATE TRIGGER trigger_deduct_stock_on_menu_sale
AFTER INSERT ON public.menu_item_sales
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

CREATE TRIGGER trigger_restore_stock_on_menu_sale_delete
AFTER DELETE ON public.menu_item_sales
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();

-- Create triggers for direct product sales
CREATE TRIGGER trigger_update_stock_on_sale
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_sale();

CREATE TRIGGER trigger_revert_stock_on_sale_delete
AFTER DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.revert_stock_on_sale_delete();