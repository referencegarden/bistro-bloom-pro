-- Add unique constraint to pin_hash to ensure PINs are unique
ALTER TABLE public.employees 
ADD CONSTRAINT employees_pin_hash_unique 
UNIQUE (pin_hash);

-- Update RLS policy to allow employees to view their own permissions
DROP POLICY IF EXISTS "Employees can view own permissions" ON public.employee_permissions;

CREATE POLICY "Employees can view own permissions"
ON public.employee_permissions
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);