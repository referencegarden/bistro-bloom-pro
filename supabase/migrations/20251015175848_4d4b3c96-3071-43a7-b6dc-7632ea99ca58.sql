-- Create a security definer function to check employee permissions
create or replace function public.has_employee_permission(_user_id uuid, _permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    join public.employee_permissions ep on ep.employee_id = e.id
    where e.user_id = _user_id
      and (
        (_permission = 'can_make_sales' and ep.can_make_sales = true) or
        (_permission = 'can_view_products' and ep.can_view_products = true) or
        (_permission = 'can_view_reports' and ep.can_view_reports = true) or
        (_permission = 'can_manage_stock' and ep.can_manage_stock = true) or
        (_permission = 'can_create_demands' and ep.can_create_demands = true)
      )
  )
$$;

-- Update products table policies
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;

create policy "Admins and stock managers can insert products"
on public.products
for insert
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can update products"
on public.products
for update
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
)
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can delete products"
on public.products
for delete
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

-- Update sales table policies
drop policy if exists "Admins can view sales" on public.sales;
drop policy if exists "Employees can view own sales" on public.sales;

create policy "Admins and report viewers can view all sales"
on public.sales
for select
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_view_reports')
);

create policy "Employees can view own sales"
on public.sales
for select
using (
  employee_id in (
    select id from public.employees where user_id = auth.uid()
  )
);

-- Update purchases table policies
drop policy if exists "Admins can view purchases" on public.purchases;
drop policy if exists "Admins can insert purchases" on public.purchases;
drop policy if exists "Admins can update purchases" on public.purchases;

create policy "Admins and stock managers can view purchases"
on public.purchases
for select
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can insert purchases"
on public.purchases
for insert
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can update purchases"
on public.purchases
for update
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
)
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

-- Update categories table policies
drop policy if exists "Admins can view categories" on public.categories;
drop policy if exists "Admins can insert categories" on public.categories;
drop policy if exists "Admins can update categories" on public.categories;
drop policy if exists "Admins can delete categories" on public.categories;

create policy "Admins, stock managers and product viewers can view categories"
on public.categories
for select
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock') or
  has_employee_permission(auth.uid(), 'can_view_products')
);

create policy "Admins and stock managers can insert categories"
on public.categories
for insert
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can update categories"
on public.categories
for update
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
)
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can delete categories"
on public.categories
for delete
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

-- Update suppliers table policies
drop policy if exists "Admins can view suppliers" on public.suppliers;
drop policy if exists "Admins can insert suppliers" on public.suppliers;
drop policy if exists "Admins can update suppliers" on public.suppliers;
drop policy if exists "Admins can delete suppliers" on public.suppliers;

create policy "Admins, stock managers and product viewers can view suppliers"
on public.suppliers
for select
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock') or
  has_employee_permission(auth.uid(), 'can_view_products')
);

create policy "Admins and stock managers can insert suppliers"
on public.suppliers
for insert
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can update suppliers"
on public.suppliers
for update
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
)
with check (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);

create policy "Admins and stock managers can delete suppliers"
on public.suppliers
for delete
using (
  has_role(auth.uid(), 'admin'::app_role) or
  has_employee_permission(auth.uid(), 'can_manage_stock')
);