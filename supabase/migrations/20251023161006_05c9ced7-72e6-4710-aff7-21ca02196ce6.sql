-- 1) Safer stock deduction for menu item sales + clearer errors + rounding
CREATE OR REPLACE FUNCTION public.deduct_stock_on_menu_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_record RECORD;
  conversion_factor numeric;
  deduction_amount numeric;
  current_qty numeric;
BEGIN
  -- Loop through all ingredients for this menu item
  FOR ingredient_record IN
    SELECT 
      mii.product_id,
      mii.quantity_per_unit,
      COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
      p.unit_of_measure AS product_unit,
      p.current_stock
    FROM public.menu_item_ingredients mii
    JOIN public.products p ON p.id = mii.product_id
    WHERE mii.menu_item_id = NEW.menu_item_id
  LOOP
    -- Get conversion factor from ingredient unit to product base unit
    conversion_factor := public.get_unit_conversion_factor(
      ingredient_record.ingredient_unit,
      ingredient_record.product_unit
    );

    -- Calculate total deduction with unit conversion
    deduction_amount := ingredient_record.quantity_per_unit * NEW.quantity * conversion_factor;

    -- Guard against tiny floating errors
    deduction_amount := ROUND(deduction_amount, 6);

    -- Validate stock sufficiency BEFORE update
    SELECT current_stock INTO current_qty FROM public.products WHERE id = ingredient_record.product_id FOR UPDATE;
    IF current_qty < deduction_amount THEN
      RAISE EXCEPTION 'Insufficient stock for product %: need %, have %', ingredient_record.product_id, deduction_amount, current_qty
        USING ERRCODE = 'P0001';
    END IF;

    -- Deduct stock with rounding to avoid negative epsilon
    UPDATE public.products
    SET current_stock = ROUND(current_stock - deduction_amount, 6),
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  RETURN NEW;
END;
$$;

-- 2) Safe restoration on delete (rounding)
CREATE OR REPLACE FUNCTION public.restore_stock_on_menu_sale_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_record RECORD;
  conversion_factor numeric;
  restoration_amount numeric;
BEGIN
  FOR ingredient_record IN
    SELECT 
      mii.product_id,
      mii.quantity_per_unit,
      COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
      p.unit_of_measure AS product_unit
    FROM public.menu_item_ingredients mii
    JOIN public.products p ON p.id = mii.product_id
    WHERE mii.menu_item_id = OLD.menu_item_id
  LOOP
    conversion_factor := public.get_unit_conversion_factor(
      ingredient_record.ingredient_unit,
      ingredient_record.product_unit
    );

    restoration_amount := ROUND(ingredient_record.quantity_per_unit * OLD.quantity * conversion_factor, 6);

    UPDATE public.products
    SET current_stock = ROUND(current_stock + restoration_amount, 6),
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  RETURN OLD;
END;
$$;

-- 3) Safe adjustment on update (stock check + rounding)
CREATE OR REPLACE FUNCTION public.adjust_stock_on_menu_sale_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_record RECORD;
  conversion_factor numeric;
  delta_amount numeric;
  current_qty numeric;
BEGIN
  IF NEW.quantity = OLD.quantity AND NEW.menu_item_id = OLD.menu_item_id THEN
    RETURN NEW;
  END IF;

  IF NEW.menu_item_id != OLD.menu_item_id THEN
    -- Restore old
    FOR ingredient_record IN
      SELECT mii.product_id, mii.quantity_per_unit,
             COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
             p.unit_of_measure AS product_unit
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = OLD.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(ingredient_record.ingredient_unit, ingredient_record.product_unit);
      UPDATE public.products
      SET current_stock = ROUND(current_stock + ROUND(ingredient_record.quantity_per_unit * OLD.quantity * conversion_factor, 6), 6),
          updated_at = now()
      WHERE id = ingredient_record.product_id;
    END LOOP;

    -- Deduct new with check
    FOR ingredient_record IN
      SELECT mii.product_id, mii.quantity_per_unit,
             COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
             p.unit_of_measure AS product_unit,
             p.current_stock
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = NEW.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(ingredient_record.ingredient_unit, ingredient_record.product_unit);
      delta_amount := ROUND(ingredient_record.quantity_per_unit * NEW.quantity * conversion_factor, 6);
      SELECT current_stock INTO current_qty FROM public.products WHERE id = ingredient_record.product_id FOR UPDATE;
      IF current_qty < delta_amount THEN
        RAISE EXCEPTION 'Insufficient stock for product %: need %, have %', ingredient_record.product_id, delta_amount, current_qty
          USING ERRCODE = 'P0001';
      END IF;
      UPDATE public.products
      SET current_stock = ROUND(current_stock - delta_amount, 6),
          updated_at = now()
      WHERE id = ingredient_record.product_id;
    END LOOP;
  ELSE
    -- Only quantity changed
    FOR ingredient_record IN
      SELECT mii.product_id, mii.quantity_per_unit,
             COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
             p.unit_of_measure AS product_unit,
             p.current_stock
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = NEW.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(ingredient_record.ingredient_unit, ingredient_record.product_unit);
      delta_amount := ROUND(ingredient_record.quantity_per_unit * (NEW.quantity - OLD.quantity) * conversion_factor, 6);
      IF delta_amount > 0 THEN
        -- deduct more -> check stock
        SELECT current_stock INTO current_qty FROM public.products WHERE id = ingredient_record.product_id FOR UPDATE;
        IF current_qty < delta_amount THEN
          RAISE EXCEPTION 'Insufficient stock for product %: need %, have %', ingredient_record.product_id, delta_amount, current_qty
            USING ERRCODE = 'P0001';
        END IF;
        UPDATE public.products
        SET current_stock = ROUND(current_stock - delta_amount, 6), updated_at = now()
        WHERE id = ingredient_record.product_id;
      ELSIF delta_amount < 0 THEN
        -- restore some
        UPDATE public.products
        SET current_stock = ROUND(current_stock - delta_amount, 6), updated_at = now() -- delta_amount is negative
        WHERE id = ingredient_record.product_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Recreate triggers for menu_item_sales to ensure they exist
DROP TRIGGER IF EXISTS trg_deduct_stock_on_menu_sale ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trg_restore_stock_on_menu_sale_delete ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trg_adjust_stock_on_menu_sale_update ON public.menu_item_sales;

CREATE TRIGGER trg_deduct_stock_on_menu_sale
AFTER INSERT ON public.menu_item_sales
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

CREATE TRIGGER trg_restore_stock_on_menu_sale_delete
AFTER DELETE ON public.menu_item_sales
FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();

CREATE TRIGGER trg_adjust_stock_on_menu_sale_update
AFTER UPDATE ON public.menu_item_sales
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_menu_sale_update();

-- 5) Ensure ON DELETE CASCADE for recipe ingredients when deleting a menu item
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'menu_item_ingredients_menu_item_id_fkey'
  ) THEN
    ALTER TABLE public.menu_item_ingredients
      DROP CONSTRAINT menu_item_ingredients_menu_item_id_fkey;
  END IF;
END $$;

ALTER TABLE public.menu_item_ingredients
  ADD CONSTRAINT menu_item_ingredients_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.menu_items(id)
  ON DELETE CASCADE;

-- Optional: keep product FK restrictive (do not cascade delete products by accident)
-- But recreate safely if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'menu_item_ingredients_product_id_fkey'
  ) THEN
    ALTER TABLE public.menu_item_ingredients
      ADD CONSTRAINT menu_item_ingredients_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id);
  END IF;
END $$;

-- 6) Round calculated ingredient usage for consistency
CREATE OR REPLACE FUNCTION public.calculate_ingredient_usage(_menu_item_id uuid, _quantity numeric)
 RETURNS TABLE(product_id uuid, product_name text, quantity_needed numeric, unit_of_measure text, available_stock numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    ROUND((mii.quantity_per_unit * _quantity * public.get_unit_conversion_factor(
      COALESCE(mii.unit_of_measure, p.unit_of_measure),
      p.unit_of_measure
    )), 6) AS quantity_needed,
    p.unit_of_measure AS unit_of_measure,
    p.current_stock
  FROM public.menu_item_ingredients mii
  JOIN public.products p ON p.id = mii.product_id
  WHERE mii.menu_item_id = _menu_item_id;
END;
$$;