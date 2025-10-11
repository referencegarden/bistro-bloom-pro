-- Add can_create_demands permission to employee_permissions table
ALTER TABLE public.employee_permissions 
ADD COLUMN can_create_demands BOOLEAN NOT NULL DEFAULT true;

-- Set existing employees to have demand permission
UPDATE public.employee_permissions 
SET can_create_demands = true;