-- Drop all existing public access policies
DROP POLICY IF EXISTS "Public access to suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public access to products" ON public.products;
DROP POLICY IF EXISTS "Public access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public access to purchases" ON public.purchases;
DROP POLICY IF EXISTS "Public access to sales" ON public.sales;

-- Create authenticated-only policies for suppliers table
CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (true);

-- Create authenticated-only policies for products table
CREATE POLICY "Authenticated users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (true);

-- Create authenticated-only policies for categories table
CREATE POLICY "Authenticated users can view categories"
ON public.categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (true);

-- Create authenticated-only policies for purchases table
CREATE POLICY "Authenticated users can view purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert purchases"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchases"
ON public.purchases
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchases"
ON public.purchases
FOR DELETE
TO authenticated
USING (true);

-- Create authenticated-only policies for sales table
CREATE POLICY "Authenticated users can view sales"
ON public.sales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (true);