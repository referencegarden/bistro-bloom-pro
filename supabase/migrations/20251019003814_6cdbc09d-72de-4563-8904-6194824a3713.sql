-- Create menu_items table
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  selling_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_item_ingredients junction table
CREATE TABLE public.menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_per_unit numeric NOT NULL,
  unit_of_measure text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(menu_item_id, product_id)
);

-- Create menu_item_sales table
CREATE TABLE public.menu_item_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  total_price numeric,
  sale_date timestamptz DEFAULT now(),
  employee_id uuid REFERENCES public.employees(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_menu_item_ingredients_menu_item_id ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX idx_menu_item_ingredients_product_id ON public.menu_item_ingredients(product_id);
CREATE INDEX idx_menu_item_sales_menu_item_id ON public.menu_item_sales(menu_item_id);

-- Create function to calculate total ingredient usage
CREATE OR REPLACE FUNCTION public.calculate_ingredient_usage(
  _menu_item_id uuid,
  _quantity numeric
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  quantity_needed numeric,
  unit_of_measure text,
  available_stock numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    (mii.quantity_per_unit * _quantity) as quantity_needed,
    COALESCE(mii.unit_of_measure, p.unit_of_measure) as unit_of_measure,
    p.current_stock
  FROM public.menu_item_ingredients mii
  JOIN public.products p ON p.id = mii.product_id
  WHERE mii.menu_item_id = _menu_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to deduct stock when menu item is sold
CREATE OR REPLACE FUNCTION public.deduct_stock_on_menu_sale()
RETURNS TRIGGER AS $$
DECLARE
  ingredient_record RECORD;
BEGIN
  FOR ingredient_record IN
    SELECT product_id, quantity_per_unit
    FROM public.menu_item_ingredients
    WHERE menu_item_id = NEW.menu_item_id
  LOOP
    UPDATE public.products
    SET current_stock = current_stock - (ingredient_record.quantity_per_unit * NEW.quantity),
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_deduct_stock_on_menu_sale
  AFTER INSERT ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_menu_sale();

-- Create trigger to restore stock when menu sale is deleted
CREATE OR REPLACE FUNCTION public.restore_stock_on_menu_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
  ingredient_record RECORD;
BEGIN
  FOR ingredient_record IN
    SELECT product_id, quantity_per_unit
    FROM public.menu_item_ingredients
    WHERE menu_item_id = OLD.menu_item_id
  LOOP
    UPDATE public.products
    SET current_stock = current_stock + (ingredient_record.quantity_per_unit * OLD.quantity),
        updated_at = now()
    WHERE id = ingredient_record.product_id;
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_restore_stock_on_menu_sale_delete
  AFTER DELETE ON public.menu_item_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_menu_sale_delete();

-- Update trigger for updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_item_ingredients_updated_at
  BEFORE UPDATE ON public.menu_item_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_sales ENABLE ROW LEVEL SECURITY;

-- Menu items policies
CREATE POLICY "Admins and stock managers can manage menu items"
  ON public.menu_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'));

CREATE POLICY "Employees can view menu items"
  ON public.menu_items FOR SELECT
  USING (has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Menu item ingredients policies
CREATE POLICY "Admins and stock managers can manage ingredients"
  ON public.menu_item_ingredients FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'));

CREATE POLICY "Employees can view ingredients"
  ON public.menu_item_ingredients FOR SELECT
  USING (has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Menu item sales policies
CREATE POLICY "Admins can manage all menu sales"
  ON public.menu_item_sales FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can create menu sales"
  ON public.menu_item_sales FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view menu sales"
  ON public.menu_item_sales FOR SELECT
  USING (has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Report viewers can view menu sales"
  ON public.menu_item_sales FOR SELECT
  USING (has_employee_permission(auth.uid(), 'can_view_reports'));