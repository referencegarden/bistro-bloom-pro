-- Add employee_id column to purchases table to track who made each purchase
ALTER TABLE public.purchases ADD COLUMN employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_purchases_employee_id ON public.purchases(employee_id);