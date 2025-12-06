-- Allow employees to read their tenant's subscription (for SubscriptionGuard to work)
CREATE POLICY "Employees can view own tenant subscription"
ON public.subscriptions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'employee'::app_role) 
  AND tenant_id = public.get_user_tenant_id()
);