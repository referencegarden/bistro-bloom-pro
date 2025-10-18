-- Function to revert stock when purchase is deleted
CREATE OR REPLACE FUNCTION public.revert_stock_on_purchase_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET current_stock = current_stock - OLD.quantity,
      updated_at = now()
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to revert stock when sale is deleted
CREATE OR REPLACE FUNCTION public.revert_stock_on_sale_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET current_stock = current_stock + OLD.quantity,
      updated_at = now()
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for purchase deletion
CREATE TRIGGER trigger_revert_stock_on_purchase_delete
  AFTER DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_stock_on_purchase_delete();

-- Trigger for sale deletion
CREATE TRIGGER trigger_revert_stock_on_sale_delete
  AFTER DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_stock_on_sale_delete();