-- Add DELETE policy for menu_item_sales to allow stock managers to delete
-- This is needed for CASCADE deletion when deleting menu items with sales

CREATE POLICY "Admins and stock managers can delete menu sales"
ON public.menu_item_sales
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_employee_permission(auth.uid(), 'can_manage_stock')
);