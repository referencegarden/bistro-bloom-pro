-- Step 2: Add PIN authentication and permissions system

-- Add PIN authentication columns to employees table
ALTER TABLE public.employees 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN pin_hash text,
ADD COLUMN pin_enabled boolean NOT NULL DEFAULT false;

-- Create employee_permissions table for granular control
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  can_make_sales boolean NOT NULL DEFAULT true,
  can_view_products boolean NOT NULL DEFAULT true,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_manage_stock boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Enable RLS on employee_permissions
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_permissions
CREATE POLICY "Admins can manage all permissions"
ON public.employee_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own permissions"
ON public.employee_permissions
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Update sales RLS policies for employee access
CREATE POLICY "Employees can create sales"
ON public.sales
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'employee'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Employees can view own sales"
ON public.sales
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update products RLS policies for employee read access
CREATE POLICY "Employees can view products"
ON public.products
FOR SELECT
USING (
  has_role(auth.uid(), 'employee'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for employee_permissions updated_at
CREATE TRIGGER update_employee_permissions_updated_at
BEFORE UPDATE ON public.employee_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employee_permissions_employee_id ON public.employee_permissions(employee_id);