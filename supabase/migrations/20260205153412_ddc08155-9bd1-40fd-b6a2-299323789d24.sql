-- Create plan_features table for managing features per subscription plan
CREATE TABLE public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  feature_description text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (plan_type, feature_key)
);

-- Enable RLS
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all plan features
CREATE POLICY "Super admins can manage plan features" ON public.plan_features
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Everyone can read plan features (needed for UI)
CREATE POLICY "Anyone can read plan features" ON public.plan_features
  FOR SELECT USING (true);

-- Seed default features for all plans
INSERT INTO public.plan_features (plan_type, feature_key, feature_name, feature_description, is_enabled) VALUES
-- Basic plan features
('basic', 'dashboard', 'Tableau de Bord', 'Accès au tableau de bord principal', true),
('basic', 'products', 'Gestion des Produits', 'Gérer les produits et le stock', true),
('basic', 'sales', 'Sortie de Stock', 'Enregistrer les sorties de stock', true),
('basic', 'purchases', 'Entrée de Stock', 'Enregistrer les achats et entrées', true),
('basic', 'categories', 'Catégories', 'Gérer les catégories de produits', true),
('basic', 'employees', 'Employés', 'Gérer les employés', true),
('basic', 'attendance', 'Présence', 'Suivi de présence des employés', true),
('basic', 'pos', 'Point de Vente', 'Système de point de vente', false),
('basic', 'pos_reports', 'Rapports POS', 'Rapports des ventes POS', false),
('basic', 'pos_orders', 'Commandes POS', 'Gestion des commandes POS', false),
('basic', 'kitchen_display', 'Affichage Cuisine', 'Écran cuisine', false),
('basic', 'bar_display', 'Affichage Bar', 'Écran bar', false),
('basic', 'menu_items', 'Articles Menu', 'Gérer le menu et recettes', false),
('basic', 'suppliers', 'Fournisseurs', 'Gérer les fournisseurs', true),
('basic', 'demands', 'Demandes', 'Gestion des demandes', true),
('basic', 'tables', 'Gestion Tables', 'Gérer les tables', false),
('basic', 'settings', 'Paramètres', 'Accès aux paramètres', true),

-- Pro plan features (all basic + more)
('pro', 'dashboard', 'Tableau de Bord', 'Accès au tableau de bord principal', true),
('pro', 'products', 'Gestion des Produits', 'Gérer les produits et le stock', true),
('pro', 'sales', 'Sortie de Stock', 'Enregistrer les sorties de stock', true),
('pro', 'purchases', 'Entrée de Stock', 'Enregistrer les achats et entrées', true),
('pro', 'categories', 'Catégories', 'Gérer les catégories de produits', true),
('pro', 'employees', 'Employés', 'Gérer les employés', true),
('pro', 'attendance', 'Présence', 'Suivi de présence des employés', true),
('pro', 'pos', 'Point de Vente', 'Système de point de vente', true),
('pro', 'pos_reports', 'Rapports POS', 'Rapports des ventes POS', true),
('pro', 'pos_orders', 'Commandes POS', 'Gestion des commandes POS', true),
('pro', 'kitchen_display', 'Affichage Cuisine', 'Écran cuisine', true),
('pro', 'bar_display', 'Affichage Bar', 'Écran bar', false),
('pro', 'menu_items', 'Articles Menu', 'Gérer le menu et recettes', true),
('pro', 'suppliers', 'Fournisseurs', 'Gérer les fournisseurs', true),
('pro', 'demands', 'Demandes', 'Gestion des demandes', true),
('pro', 'tables', 'Gestion Tables', 'Gérer les tables', true),
('pro', 'settings', 'Paramètres', 'Accès aux paramètres', true),

-- Enterprise plan features (all features)
('enterprise', 'dashboard', 'Tableau de Bord', 'Accès au tableau de bord principal', true),
('enterprise', 'products', 'Gestion des Produits', 'Gérer les produits et le stock', true),
('enterprise', 'sales', 'Sortie de Stock', 'Enregistrer les sorties de stock', true),
('enterprise', 'purchases', 'Entrée de Stock', 'Enregistrer les achats et entrées', true),
('enterprise', 'categories', 'Catégories', 'Gérer les catégories de produits', true),
('enterprise', 'employees', 'Employés', 'Gérer les employés', true),
('enterprise', 'attendance', 'Présence', 'Suivi de présence des employés', true),
('enterprise', 'pos', 'Point de Vente', 'Système de point de vente', true),
('enterprise', 'pos_reports', 'Rapports POS', 'Rapports des ventes POS', true),
('enterprise', 'pos_orders', 'Commandes POS', 'Gestion des commandes POS', true),
('enterprise', 'kitchen_display', 'Affichage Cuisine', 'Écran cuisine', true),
('enterprise', 'bar_display', 'Affichage Bar', 'Écran bar', true),
('enterprise', 'menu_items', 'Articles Menu', 'Gérer le menu et recettes', true),
('enterprise', 'suppliers', 'Fournisseurs', 'Gérer les fournisseurs', true),
('enterprise', 'demands', 'Demandes', 'Gestion des demandes', true),
('enterprise', 'tables', 'Gestion Tables', 'Gérer les tables', true),
('enterprise', 'settings', 'Paramètres', 'Accès aux paramètres', true);

-- Update get_pos_sales_report function to filter by tenant_id
CREATE OR REPLACE FUNCTION public.get_pos_sales_report(
  _start_date timestamp with time zone, 
  _end_date timestamp with time zone,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
  menu_item_id uuid, 
  menu_item_name text, 
  menu_item_category text, 
  total_quantity numeric, 
  total_revenue numeric, 
  order_count bigint, 
  avg_order_value numeric, 
  sales_percentage numeric, 
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_sales numeric;
BEGIN
  -- Calculate total sales for percentage (with tenant filter)
  SELECT COALESCE(SUM(oi.total_price), 0) INTO total_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed')
    AND (_tenant_id IS NULL OR o.tenant_id = _tenant_id);

  -- Return detailed sales report (with tenant filter)
  RETURN QUERY
  SELECT 
    mi.id AS menu_item_id,
    mi.name AS menu_item_name,
    mi.category AS menu_item_category,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity,
    COALESCE(SUM(oi.total_price), 0) AS total_revenue,
    COUNT(DISTINCT oi.order_id) AS order_count,
    CASE 
      WHEN COUNT(DISTINCT oi.order_id) > 0 
      THEN ROUND(COALESCE(SUM(oi.total_price), 0) / COUNT(DISTINCT oi.order_id), 2)
      ELSE 0 
    END AS avg_order_value,
    CASE 
      WHEN total_sales > 0 
      THEN ROUND((COALESCE(SUM(oi.total_price), 0) / total_sales * 100), 2)
      ELSE 0 
    END AS sales_percentage,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(oi.quantity), 0) DESC) AS rank
  FROM public.menu_items mi
  LEFT JOIN public.order_items oi ON oi.menu_item_id = mi.id
  LEFT JOIN public.orders o ON o.id = oi.order_id 
    AND o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed')
    AND (_tenant_id IS NULL OR o.tenant_id = _tenant_id)
  WHERE (_tenant_id IS NULL OR mi.tenant_id = _tenant_id)
  GROUP BY mi.id, mi.name, mi.category
  HAVING COALESCE(SUM(oi.quantity), 0) > 0
  ORDER BY total_quantity DESC;
END;
$function$;

-- Update get_pos_sales_by_employee function to filter by tenant_id
CREATE OR REPLACE FUNCTION public.get_pos_sales_by_employee(
  _start_date timestamp with time zone, 
  _end_date timestamp with time zone,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
  employee_id uuid, 
  employee_name text, 
  employee_position text, 
  total_orders bigint, 
  total_revenue numeric, 
  total_items_sold numeric, 
  avg_order_value numeric, 
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    e.position AS employee_position,
    COUNT(DISTINCT o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
    CASE 
      WHEN COUNT(DISTINCT o.id) > 0 
      THEN ROUND(COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT o.id), 2)
      ELSE 0 
    END AS avg_order_value,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(o.total_amount), 0) DESC) AS rank
  FROM public.employees e
  LEFT JOIN public.orders o ON o.employee_id = e.id
    AND o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed', 'served')
    AND (_tenant_id IS NULL OR o.tenant_id = _tenant_id)
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  WHERE e.is_active = true
    AND (_tenant_id IS NULL OR e.tenant_id = _tenant_id)
  GROUP BY e.id, e.name, e.position
  HAVING COUNT(DISTINCT o.id) > 0
  ORDER BY total_revenue DESC;
END;
$function$;