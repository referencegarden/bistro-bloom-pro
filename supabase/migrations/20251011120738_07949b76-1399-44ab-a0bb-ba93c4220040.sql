-- Create demand status enum
CREATE TYPE demand_status AS ENUM ('pending', 'in_stock', 'fulfilled', 'cancelled');

-- Create product_demands table
CREATE TABLE public.product_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status demand_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX idx_product_demands_status ON public.product_demands(status);
CREATE INDEX idx_product_demands_product ON public.product_demands(product_id);
CREATE INDEX idx_product_demands_requested_by ON public.product_demands(requested_by);

-- Enable RLS
ALTER TABLE public.product_demands ENABLE ROW LEVEL SECURITY;

-- Admins can manage all demands
CREATE POLICY "Admins can manage all demands"
  ON public.product_demands
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Employees can view demands
CREATE POLICY "Employees can view demands"
  ON public.product_demands
  FOR SELECT
  USING (
    has_role(auth.uid(), 'employee'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Employees can create demands
CREATE POLICY "Employees can create demands"
  ON public.product_demands
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'employee'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Employees can only update their own pending demands
CREATE POLICY "Employees can update own pending demands"
  ON public.product_demands
  FOR UPDATE
  USING (
    requested_by IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    ) AND status = 'pending'
  )
  WITH CHECK (
    requested_by IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    ) AND status = 'pending'
  );

-- Add demand_id to purchases table
ALTER TABLE public.purchases 
  ADD COLUMN demand_id UUID REFERENCES public.product_demands(id) ON DELETE SET NULL;

CREATE INDEX idx_purchases_demand ON public.purchases(demand_id);

-- Trigger to update updated_at on product_demands
CREATE TRIGGER update_product_demands_updated_at
  BEFORE UPDATE ON public.product_demands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-fulfill demand when purchase is recorded
CREATE OR REPLACE FUNCTION public.fulfill_demand_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.demand_id IS NOT NULL THEN
    UPDATE public.product_demands
    SET status = 'fulfilled',
        fulfilled_at = now()
    WHERE id = NEW.demand_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to fulfill demand after purchase
CREATE TRIGGER after_purchase_insert_fulfill_demand
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_demand_on_purchase();