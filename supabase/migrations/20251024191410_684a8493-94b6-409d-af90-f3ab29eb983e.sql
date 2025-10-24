-- Fix CASCADE DELETE for menu_item_sales to allow deleting menu items that have sales
-- This allows deleting menu items while preserving sales history (or cascading depending on business logic)

-- Drop existing constraint
ALTER TABLE public.menu_item_sales
DROP CONSTRAINT IF EXISTS menu_item_sales_menu_item_id_fkey;

-- Recreate with CASCADE - when a menu item is deleted, its sales records are also deleted
ALTER TABLE public.menu_item_sales
ADD CONSTRAINT menu_item_sales_menu_item_id_fkey
FOREIGN KEY (menu_item_id)
REFERENCES public.menu_items(id)
ON DELETE CASCADE;

-- Also ensure employee_id constraint uses SET NULL to preserve sales even if employee is deleted
ALTER TABLE public.menu_item_sales
DROP CONSTRAINT IF EXISTS menu_item_sales_employee_id_fkey;

ALTER TABLE public.menu_item_sales
ADD CONSTRAINT menu_item_sales_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees(id)
ON DELETE SET NULL;