-- Add POS permission columns to employee_permissions
ALTER TABLE public.employee_permissions
ADD COLUMN IF NOT EXISTS can_use_pos boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_orders boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_process_payments boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_view_kitchen_display boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_pos_reports boolean NOT NULL DEFAULT false;

-- Add tax_rate column to app_settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0;

-- Create tables table
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number text NOT NULL UNIQUE,
  seating_capacity integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'available',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and POS users can view tables"
ON public.tables FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos'));

CREATE POLICY "Admins can manage tables"
ON public.tables FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  order_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  table_id uuid REFERENCES public.tables(id),
  customer_name text,
  customer_phone text,
  notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  employee_id uuid REFERENCES public.employees(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and POS users can view orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos'));

CREATE POLICY "POS users can create orders"
ON public.orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos'));

CREATE POLICY "POS users can update orders"
ON public.orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_orders'));

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id),
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  special_instructions text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and POS users can view order items"
ON public.order_items FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos'));

CREATE POLICY "POS users can create order items"
ON public.order_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos'));

CREATE POLICY "POS users can update order items"
ON public.order_items FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_orders'));

CREATE POLICY "Admins can delete order items"
ON public.order_items FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount_paid numeric NOT NULL,
  change_amount numeric NOT NULL DEFAULT 0,
  employee_id uuid REFERENCES public.employees(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and report viewers can view payments"
ON public.payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_view_reports') OR has_employee_permission(auth.uid(), 'can_access_pos_reports'));

CREATE POLICY "POS payment processors can create payments"
ON public.payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_process_payments'));

-- Create payment_splits table
CREATE TABLE IF NOT EXISTS public.payment_splits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and report viewers can view payment splits"
ON public.payment_splits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_view_reports') OR has_employee_permission(auth.uid(), 'can_access_pos_reports'));

CREATE POLICY "POS payment processors can create payment splits"
ON public.payment_splits FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_process_payments'));

-- Create function to confirm order and deduct stock
CREATE OR REPLACE FUNCTION public.confirm_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_record RECORD;
  ingredient_record RECORD;
  conversion_factor numeric;
  deduction_amount numeric;
  current_qty numeric;
  insufficient_items jsonb := '[]'::jsonb;
BEGIN
  -- Check stock for all items
  FOR item_record IN
    SELECT oi.menu_item_id, oi.quantity, mi.name as menu_item_name
    FROM public.order_items oi
    JOIN public.menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.order_id = _order_id
  LOOP
    FOR ingredient_record IN
      SELECT 
        mii.product_id,
        mii.quantity_per_unit,
        COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
        p.unit_of_measure AS product_unit,
        p.current_stock,
        p.name as product_name
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = item_record.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(
        ingredient_record.ingredient_unit,
        ingredient_record.product_unit
      );
      deduction_amount := ROUND(ingredient_record.quantity_per_unit * item_record.quantity * conversion_factor, 6);
      
      IF ingredient_record.current_stock < deduction_amount THEN
        insufficient_items := insufficient_items || jsonb_build_object(
          'product_name', ingredient_record.product_name,
          'menu_item', item_record.menu_item_name,
          'needed', deduction_amount,
          'available', ingredient_record.current_stock
        );
      END IF;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(insufficient_items) > 0 THEN
    RETURN jsonb_build_object('success', false, 'insufficient_stock', insufficient_items);
  END IF;

  -- Deduct stock for all items
  FOR item_record IN
    SELECT oi.menu_item_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = _order_id
  LOOP
    FOR ingredient_record IN
      SELECT 
        mii.product_id,
        mii.quantity_per_unit,
        COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
        p.unit_of_measure AS product_unit
      FROM public.menu_item_ingredients mii
      JOIN public.products p ON p.id = mii.product_id
      WHERE mii.menu_item_id = item_record.menu_item_id
    LOOP
      conversion_factor := public.get_unit_conversion_factor(
        ingredient_record.ingredient_unit,
        ingredient_record.product_unit
      );
      deduction_amount := ROUND(ingredient_record.quantity_per_unit * item_record.quantity * conversion_factor, 6);
      
      UPDATE public.products
      SET current_stock = ROUND(current_stock - deduction_amount, 6),
          updated_at = now()
      WHERE id = ingredient_record.product_id;
    END LOOP;
  END LOOP;

  UPDATE public.orders
  SET status = 'confirmed', updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function to cancel order and restore stock
CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_record RECORD;
  ingredient_record RECORD;
  conversion_factor numeric;
  restoration_amount numeric;
  order_status text;
BEGIN
  SELECT status INTO order_status FROM public.orders WHERE id = _order_id;
  
  IF order_status = 'confirmed' OR order_status = 'preparing' OR order_status = 'ready' THEN
    FOR item_record IN
      SELECT oi.menu_item_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = _order_id
    LOOP
      FOR ingredient_record IN
        SELECT 
          mii.product_id,
          mii.quantity_per_unit,
          COALESCE(mii.unit_of_measure, p.unit_of_measure) AS ingredient_unit,
          p.unit_of_measure AS product_unit
        FROM public.menu_item_ingredients mii
        JOIN public.products p ON p.id = mii.product_id
        WHERE mii.menu_item_id = item_record.menu_item_id
      LOOP
        conversion_factor := public.get_unit_conversion_factor(
          ingredient_record.ingredient_unit,
          ingredient_record.product_unit
        );
        restoration_amount := ROUND(ingredient_record.quantity_per_unit * item_record.quantity * conversion_factor, 6);
        
        UPDATE public.products
        SET current_stock = ROUND(current_stock + restoration_amount, 6),
            updated_at = now()
        WHERE id = ingredient_record.product_id;
      END LOOP;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Enable realtime for POS tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Seed some initial tables
INSERT INTO public.tables (table_number, seating_capacity, status)
VALUES 
  ('T1', 4, 'available'),
  ('T2', 2, 'available'),
  ('T3', 6, 'available'),
  ('T4', 4, 'available'),
  ('T5', 2, 'available')
ON CONFLICT (table_number) DO NOTHING;