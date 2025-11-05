-- Bootstrap admin user if they exist
-- This migration ensures the admin user has proper role assignment
-- Run this once to grant admin privileges to the initial admin account

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'ayoub.iqrae@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;