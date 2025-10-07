-- Create a security definer function to bootstrap admin for the specific email
-- This function can only be called once per user and only assigns admin role if no role exists
CREATE OR REPLACE FUNCTION public.bootstrap_admin(target_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  existing_role_count int;
  result jsonb;
BEGIN
  -- Only allow for the specific email
  IF target_email != 'ayoub.iqrae@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized email');
  END IF;

  -- Get the user ID for this email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Check if user already has a role
  SELECT COUNT(*) INTO existing_role_count
  FROM public.user_roles
  WHERE user_id = target_user_id;

  IF existing_role_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'User already has a role');
  END IF;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role);

  RETURN jsonb_build_object('success', true, 'message', 'Admin role assigned successfully');
END;
$$;