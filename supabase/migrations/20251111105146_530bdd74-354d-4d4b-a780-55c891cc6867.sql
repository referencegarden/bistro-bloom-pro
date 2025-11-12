-- Allow anyone to read basic tenant info (needed for login page)
CREATE POLICY "Anyone can view active tenants basic info"
ON public.tenants
FOR SELECT
USING (is_active = true);