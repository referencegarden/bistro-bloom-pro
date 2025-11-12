-- Add RLS policy for tenant admins to view their own subscriptions
CREATE POLICY "Tenant admins can view own subscription"
ON subscriptions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);