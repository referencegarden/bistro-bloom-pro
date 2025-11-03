-- Create POS Categories Table
CREATE TABLE public.pos_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'hsl(142.1 76.2% 36.3%)',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_categories
CREATE POLICY "Admins and stock managers can manage POS categories"
  ON public.pos_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'));

CREATE POLICY "Employees can view POS categories"
  ON public.pos_categories FOR SELECT
  USING (has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true);

-- Storage policies for menu images
CREATE POLICY "Anyone can view menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Admins and stock managers can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'))
  );

CREATE POLICY "Admins and stock managers can update menu images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'))
  );

CREATE POLICY "Admins and stock managers can delete menu images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'))
  );

-- Update menu_items table with new columns
ALTER TABLE public.menu_items
ADD COLUMN pos_category_id UUID REFERENCES public.pos_categories(id) ON DELETE SET NULL,
ADD COLUMN image_url TEXT,
ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Create index for better performance
CREATE INDEX idx_menu_items_pos_category ON public.menu_items(pos_category_id);
CREATE INDEX idx_menu_items_display_order ON public.menu_items(display_order);

-- Create receipt generation function
CREATE OR REPLACE FUNCTION public.generate_receipt_data(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'order', jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'order_type', o.order_type,
      'table_number', t.table_number,
      'customer_name', o.customer_name,
      'customer_phone', o.customer_phone,
      'total_amount', o.total_amount,
      'created_at', o.created_at,
      'status', o.status
    ),
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', mi.name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'special_instructions', oi.special_instructions
        )
      )
      FROM public.order_items oi
      JOIN public.menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = o.id
    ),
    'payment', (
      SELECT jsonb_build_object(
        'payment_method', p.payment_method,
        'amount_paid', p.amount_paid,
        'change_amount', p.change_amount,
        'created_at', p.created_at
      )
      FROM public.payments p
      WHERE p.order_id = o.id
      ORDER BY p.created_at DESC
      LIMIT 1
    ),
    'settings', (
      SELECT jsonb_build_object(
        'restaurant_name', restaurant_name,
        'login_logo_url', login_logo_url,
        'tax_rate', tax_rate
      )
      FROM public.app_settings
      LIMIT 1
    )
  ) INTO receipt_data
  FROM public.orders o
  LEFT JOIN public.tables t ON t.id = o.table_id
  WHERE o.id = _order_id;

  RETURN receipt_data;
END;
$$;

-- Trigger for pos_categories updated_at
CREATE TRIGGER update_pos_categories_updated_at
  BEFORE UPDATE ON public.pos_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();