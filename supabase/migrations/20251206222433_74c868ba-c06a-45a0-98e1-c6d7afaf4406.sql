-- Add can_view_bar_display column to employee_permissions table
ALTER TABLE public.employee_permissions 
ADD COLUMN IF NOT EXISTS can_view_bar_display boolean DEFAULT false;