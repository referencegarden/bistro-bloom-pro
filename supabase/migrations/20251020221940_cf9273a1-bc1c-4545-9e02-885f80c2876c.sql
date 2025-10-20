-- Ensure menu item sales properly update stock quantity
-- The inventory value is calculated automatically as current_stock * cost_price in the dashboard

-- Verify and recreate the menu sale stock deduction function
CREATE OR REPLACE FUNCTION public.deduct_stock_on_menu_sale()
RETURNS TRIGGER AS $$
DECLARE
  ingredient_record RECORD;
BEGIN
  -- Loop through all ingredients for this menu item and deduct stock
  FOR ingredient_record IN
    SELECT product_id, quantity_per_unit
    FROM public.menu_item_ingredients
    WHERE menu_item_id = NEW.menu_item_id
  LOOP
    -- Deduct stock for each ingredient (value updates automatically via cost_price)
    UPDATE public.products
    SET current_stock = current_stock - (ingredient_record.quantity_per_unit * NEW.quantity),
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify and recreate the menu sale stock restoration function
CREATE OR REPLACE FUNCTION public.restore_stock_on_menu_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
  ingredient_record RECORD;
BEGIN
  -- Loop through all ingredients and restore stock
  FOR ingredient_record IN
    SELECT product_id, quantity_per_unit
    FROM public.menu_item_ingredients
    WHERE menu_item_id = OLD.menu_item_id
  LOOP
    -- Restore stock for each ingredient
    UPDATE public.products
    SET current_stock = current_stock + (ingredient_record.quantity_per_unit * OLD.quantity),
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;