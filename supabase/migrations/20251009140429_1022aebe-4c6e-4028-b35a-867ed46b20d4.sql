-- Allow employees to view their own record
CREATE POLICY "Employees can view own record"
ON public.employees
FOR SELECT
USING (user_id = auth.uid());