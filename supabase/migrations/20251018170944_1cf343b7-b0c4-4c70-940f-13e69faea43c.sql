-- Add can_manage_suppliers permission to employee_permissions table
ALTER TABLE public.employee_permissions
ADD COLUMN can_manage_suppliers boolean NOT NULL DEFAULT false;

-- Update RLS policies for suppliers to include the new permission
DROP POLICY IF EXISTS "Admins and stock managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and stock managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and stock managers can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins, stock managers and product viewers can view suppliers" ON public.suppliers;

CREATE POLICY "Admins and authorized employees can insert suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'::text) OR has_employee_permission(auth.uid(), 'can_manage_suppliers'::text));

CREATE POLICY "Admins and authorized employees can update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'::text) OR has_employee_permission(auth.uid(), 'can_manage_suppliers'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'::text) OR has_employee_permission(auth.uid(), 'can_manage_suppliers'::text));

CREATE POLICY "Admins and authorized employees can delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'::text) OR has_employee_permission(auth.uid(), 'can_manage_suppliers'::text));

CREATE POLICY "Admins and authorized employees can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock'::text) OR has_employee_permission(auth.uid(), 'can_manage_suppliers'::text) OR has_employee_permission(auth.uid(), 'can_view_products'::text));