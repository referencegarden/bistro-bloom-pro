-- Add triggers for stock management

-- Triggers for purchases table
CREATE TRIGGER update_stock_on_purchase_trigger
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_purchase();

CREATE TRIGGER revert_stock_on_purchase_delete_trigger
  AFTER DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_stock_on_purchase_delete();

CREATE TRIGGER fulfill_demand_on_purchase_trigger
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_demand_on_purchase();

-- Triggers for sales table (direct product sales)
CREATE TRIGGER update_stock_on_sale_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_sale();

CREATE TRIGGER revert_stock_on_sale_delete_trigger
  AFTER DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_stock_on_sale_delete();

-- Triggers for menu_item_sales table (recipe/menu sales)
CREATE TRIGGER deduct_stock_on_menu_sale_trigger
  AFTER INSERT ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

CREATE TRIGGER restore_stock_on_menu_sale_delete_trigger
  AFTER DELETE ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();

CREATE TRIGGER adjust_stock_on_menu_sale_update_trigger
  AFTER UPDATE OF quantity, menu_item_id ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_stock_on_menu_sale_update();