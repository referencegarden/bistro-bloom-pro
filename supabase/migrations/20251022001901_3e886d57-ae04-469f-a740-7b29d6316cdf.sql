-- Create unit conversion function
CREATE OR REPLACE FUNCTION public.get_unit_conversion_factor(
  from_unit text,
  to_unit text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Same unit, no conversion
  IF from_unit = to_unit THEN
    RETURN 1;
  END IF;
  
  -- Weight conversions
  IF (from_unit = 'g' AND to_unit = 'kg') THEN
    RETURN 0.001;
  END IF;
  IF (from_unit = 'kg' AND to_unit = 'g') THEN
    RETURN 1000;
  END IF;
  
  -- Volume conversions
  IF (from_unit = 'ml' AND to_unit = 'L') THEN
    RETURN 0.001;
  END IF;
  IF (from_unit = 'L' AND to_unit = 'ml') THEN
    RETURN 1000;
  END IF;
  
  -- Default: assume same unit if not recognized
  RETURN 1;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_menu_sale ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_menu_sale_delete ON public.menu_item_sales;
DROP TRIGGER IF EXISTS trigger_adjust_stock_on_menu_sale_update ON public.menu_item_sales;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.deduct_stock_on_menu_sale() CASCADE;
DROP FUNCTION IF EXISTS public.restore_stock_on_menu_sale_delete() CASCADE;
DROP FUNCTION IF EXISTS public.adjust_stock_on_menu_sale_update() CASCADE;

-- Function to deduct stock when menu sale is created
CREATE OR REPLACE FUNCTION public.deduct_stock_on_menu_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ingredient_record RECORD;
  conversion_factor numeric;
  deduction_amount numeric;
BEGIN
  -- Loop through all ingredients for this menu item
  FOR ingredient_record IN
    SELECT 
      mii.product_id,
      mii.quantity_per_unit,
      COALESCE(mii.unit_of_measure, p.unit_of_measure) as ingredient_unit,
      p.unit_of_measure as product_unit
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
    
    -- Deduct stock
    UPDATE public.products
    SET current_stock = current_stock - deduction_amount,
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to restore stock when menu sale is deleted
CREATE OR REPLACE FUNCTION public.restore_stock_on_menu_sale_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ingredient_record RECORD;
  conversion_factor numeric;
  restoration_amount numeric;
BEGIN
  -- Loop through all ingredients and restore stock
  FOR ingredient_record IN
    SELECT 
      mii.product_id,
      mii.quantity_per_unit,
      COALESCE(mii.unit_of_measure, p.unit_of_measure) as ingredient_unit,
      p.unit_of_measure as product_unit
    FROM public.menu_item_ingredients mii
    JOIN public.products p ON p.id = mii.product_id
    WHERE mii.menu_item_id = OLD.menu_item_id
  LOOP
    -- Get conversion factor
    conversion_factor := public.get_unit_conversion_factor(
      ingredient_record.ingredient_unit,
      ingredient_record.product_unit
    );
    
    -- Calculate restoration amount
    restoration_amount := ingredient_record.quantity_per_unit * OLD.quantity * conversion_factor;
    
    -- Restore stock
    UPDATE public.products
    SET current_stock = current_stock + restoration_amount,
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  
  RETURN OLD;
END;
$$;

-- Function to adjust stock when menu sale quantity is updated
CREATE OR REPLACE FUNCTION public.adjust_stock_on_menu_sale_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ingredient_record RECORD;
  conversion_factor numeric;
  delta_amount numeric;
BEGIN
  -- Only proceed if quantity or menu_item_id changed
  IF NEW.quantity = OLD.quantity AND NEW.menu_item_id = OLD.menu_item_id THEN
    RETURN NEW;
  END IF;
  
  -- If menu item changed, restore old and deduct new
  IF NEW.menu_item_id != OLD.menu_item_id THEN
    -- Restore old menu item stock
    FOR ingredient_record IN
      SELECT 
        mii.product_id,
        mii.quantity_per_unit,
        COALESCE(mii.unit_of_measure, p.unit_of_measure) as ingredient_unit,
        p.unit_of_measure as product_unit
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = OLD.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(
        ingredient_record.ingredient_unit,
        ingredient_record.product_unit
      );
      
      UPDATE public.products
      SET current_stock = current_stock + (ingredient_record.quantity_per_unit * OLD.quantity * conversion_factor),
          updated_at = now()
      WHERE id = ingredient_record.product_id;
    END LOOP;
    
    -- Deduct new menu item stock
    FOR ingredient_record IN
      SELECT 
        mii.product_id,
        mii.quantity_per_unit,
        COALESCE(mii.unit_of_measure, p.unit_of_measure) as ingredient_unit,
        p.unit_of_measure as product_unit
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = NEW.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(
        ingredient_record.ingredient_unit,
        ingredient_record.product_unit
      );
      
      UPDATE public.products
      SET current_stock = current_stock - (ingredient_record.quantity_per_unit * NEW.quantity * conversion_factor),
          updated_at = now()
      WHERE id = ingredient_record.product_id;
    END LOOP;
  ELSE
    -- Only quantity changed, adjust by delta
    FOR ingredient_record IN
      SELECT 
        mii.product_id,
        mii.quantity_per_unit,
        COALESCE(mii.unit_of_measure, p.unit_of_measure) as ingredient_unit,
        p.unit_of_measure as product_unit
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = NEW.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(
        ingredient_record.ingredient_unit,
        ingredient_record.product_unit
      );
      
      delta_amount := ingredient_record.quantity_per_unit * (NEW.quantity - OLD.quantity) * conversion_factor;
      
      UPDATE public.products
      SET current_stock = current_stock - delta_amount,
          updated_at = now()
      WHERE id = ingredient_record.product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_deduct_stock_on_menu_sale
  AFTER INSERT ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

CREATE TRIGGER trigger_restore_stock_on_menu_sale_delete
  AFTER DELETE ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();

CREATE TRIGGER trigger_adjust_stock_on_menu_sale_update
  AFTER UPDATE OF quantity, menu_item_id ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_stock_on_menu_sale_update();

-- Update calculate_ingredient_usage to use the same conversion logic
CREATE OR REPLACE FUNCTION public.calculate_ingredient_usage(_menu_item_id uuid, _quantity numeric)
RETURNS TABLE(product_id uuid, product_name text, quantity_needed numeric, unit_of_measure text, available_stock numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    (mii.quantity_per_unit * _quantity * public.get_unit_conversion_factor(
      COALESCE(mii.unit_of_measure, p.unit_of_measure),
      p.unit_of_measure
    )) as quantity_needed,
    p.unit_of_measure as unit_of_measure,
    p.current_stock
  FROM public.menu_item_ingredients mii
  JOIN public.products p ON p.id = mii.product_id
  WHERE mii.menu_item_id = _menu_item_id;
END;
$$;