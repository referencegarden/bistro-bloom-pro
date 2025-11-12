-- Link super admin to default tenant if not already linked
INSERT INTO public.tenant_users (user_id, tenant_id)
SELECT 
  u.id,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_users tu 
    WHERE tu.user_id = u.id 
    AND tu.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  );

-- Also link any existing admin users to default tenant
INSERT INTO public.tenant_users (user_id, tenant_id)
SELECT 
  u.id,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_users tu 
    WHERE tu.user_id = u.id
  )
LIMIT 1;

-- Ensure default tenant has an active subscription
INSERT INTO public.subscriptions (tenant_id, status, plan_type, start_date, end_date, auto_renew)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'active',
  'enterprise',
  NOW(),
  NOW() + INTERVAL '365 days',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions 
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);