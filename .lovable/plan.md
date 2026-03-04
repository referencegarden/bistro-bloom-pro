
# Comprehensive Plan: Multi-Tenant Data Separation, Bug Fixes, and Plan Management System

## Overview

This plan addresses four major requirements:
1. **POS Reports Tenant Isolation** - Ensure each restaurant sees only its own data
2. **Attendance Check-in Bug Fix** - Fix the error employees encounter when recording attendance
3. **Employee Dialog Simplification** - Remove the waiter role quick-add, keep only permissions-based employee creation
4. **Plan Management System** - Allow super admins to configure which features are included in each subscription plan

---

## Part 1: POS Reports Tenant Isolation

### Problem
The database functions `get_pos_sales_report` and `get_pos_sales_by_employee` do not filter by `tenant_id`. This means all restaurants' data is combined in reports.

### Solution
Update both database functions to accept and filter by `tenant_id`.

### Database Changes

**Update `get_pos_sales_report` function:**
```sql
CREATE OR REPLACE FUNCTION public.get_pos_sales_report(
  _start_date timestamp with time zone,
  _end_date timestamp with time zone,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (...) AS $function$
BEGIN
  -- Filter by tenant_id in both total_sales calculation and main query
  SELECT COALESCE(SUM(oi.total_price), 0) INTO total_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed')
    AND (_tenant_id IS NULL OR o.tenant_id = _tenant_id);

  RETURN QUERY
  SELECT ...
  FROM public.menu_items mi
  LEFT JOIN ...
  WHERE (_tenant_id IS NULL OR mi.tenant_id = _tenant_id)
  ...
END;
$function$;
```

**Update `get_pos_sales_by_employee` function:**
```sql
CREATE OR REPLACE FUNCTION public.get_pos_sales_by_employee(
  _start_date timestamp with time zone,
  _end_date timestamp with time zone,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (...) AS $function$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM public.employees e
  LEFT JOIN public.orders o ON o.employee_id = e.id
    AND o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed', 'served')
    AND (_tenant_id IS NULL OR o.tenant_id = _tenant_id)
  WHERE e.is_active = true
    AND (_tenant_id IS NULL OR e.tenant_id = _tenant_id)
  ...
END;
$function$;
```

### Frontend Changes

**File: `src/pages/POSReports.tsx`**
- Import `useTenant` hook
- Pass `tenantId` to both RPC calls

```typescript
import { useTenant } from "@/contexts/TenantContext";

// In component:
const { tenantId } = useTenant();

// In loadReport:
const [productsResult, employeesResult] = await Promise.all([
  supabase.rpc("get_pos_sales_report", {
    _start_date: startDate.toISOString(),
    _end_date: endDate.toISOString(),
    _tenant_id: tenantId,
  }),
  supabase.rpc("get_pos_sales_by_employee", {
    _start_date: startDate.toISOString(),
    _end_date: endDate.toISOString(),
    _tenant_id: tenantId,
  }),
]);
```

---

## Part 2: Fix Attendance Check-in Error

### Problem Analysis
Based on code review, the attendance check-in may fail because:
1. The `attendance` table upsert requires `tenant_id` which may not be passed
2. The upsert conflict resolution doesn't specify the conflict columns

### Solution
Update `src/pages/Attendance.tsx` to:
1. Include `tenant_id` in the attendance upsert
2. Properly specify conflict columns for upsert

**File: `src/pages/Attendance.tsx`**

```typescript
// In confirmAction function - check-in case:
const { error } = await supabase.from("attendance").upsert({
  employee_id: employeeId,
  date: today,
  check_in_time: new Date().toISOString(),
  wifi_ssid: wifiSettings.ssidName || wifiStatus.ssid || null,
  ip_address: wifiStatus.ipAddress,
  confirmed: true,
  tenant_id: tenantId,  // ADD THIS
}, {
  onConflict: 'employee_id,date'  // ADD THIS - specify conflict columns
});
```

---

## Part 3: Simplify Employee Dialog (Remove Waiter Quick-Add)

### Problem
The employee dialog has two role types: "Employé" and "Serveur". The waiter option should be removed, keeping only the permissions-based employee creation.

### Solution
Remove the role type selection buttons and waiter-specific logic from `EmployeeDialog.tsx`.

**File: `src/components/EmployeeDialog.tsx`**

Changes:
1. Remove `roleType` state and all waiter role detection logic
2. Remove the "Type de compte" buttons section (lines 307-338)
3. Remove `roleType === "waiter"` conditions throughout
4. Always show the permissions section
5. Keep PIN functionality available for all employees

---

## Part 4: Plan Management System

### Overview
Create a system where super admins can:
1. Define which features are available in each plan (basic, pro, enterprise)
2. When a restaurant subscribes to a plan, they only see features assigned to that plan

### Database Schema

**New table: `plan_features`**
```sql
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

-- Super admins can manage
CREATE POLICY "Super admins can manage plan features" ON public.plan_features
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Everyone can read
CREATE POLICY "Anyone can read plan features" ON public.plan_features
  FOR SELECT USING (true);
```

**Seed default features for all plans:**
```sql
INSERT INTO public.plan_features (plan_type, feature_key, feature_name, is_enabled) VALUES
-- Basic plan features
('basic', 'dashboard', 'Tableau de Bord', true),
('basic', 'products', 'Gestion des Produits', true),
('basic', 'sales', 'Sortie de Stock', true),
('basic', 'purchases', 'Entrée de Stock', true),
('basic', 'categories', 'Catégories', true),
('basic', 'employees', 'Employés', true),
('basic', 'attendance', 'Présence', true),
('basic', 'pos', 'Point de Vente', false),
('basic', 'pos_reports', 'Rapports POS', false),
('basic', 'kitchen_display', 'Affichage Cuisine', false),
('basic', 'bar_display', 'Affichage Bar', false),
('basic', 'menu_items', 'Articles Menu', false),
('basic', 'suppliers', 'Fournisseurs', true),
('basic', 'demands', 'Demandes', true),
('basic', 'tables', 'Gestion Tables', false),
-- Pro plan features (all basic + more)
('pro', 'dashboard', 'Tableau de Bord', true),
('pro', 'products', 'Gestion des Produits', true),
('pro', 'sales', 'Sortie de Stock', true),
('pro', 'purchases', 'Entrée de Stock', true),
('pro', 'categories', 'Catégories', true),
('pro', 'employees', 'Employés', true),
('pro', 'attendance', 'Présence', true),
('pro', 'pos', 'Point de Vente', true),
('pro', 'pos_reports', 'Rapports POS', true),
('pro', 'kitchen_display', 'Affichage Cuisine', true),
('pro', 'bar_display', 'Affichage Bar', false),
('pro', 'menu_items', 'Articles Menu', true),
('pro', 'suppliers', 'Fournisseurs', true),
('pro', 'demands', 'Demandes', true),
('pro', 'tables', 'Gestion Tables', true),
-- Enterprise plan features (all features)
('enterprise', 'dashboard', 'Tableau de Bord', true),
('enterprise', 'products', 'Gestion des Produits', true),
('enterprise', 'sales', 'Sortie de Stock', true),
('enterprise', 'purchases', 'Entrée de Stock', true),
('enterprise', 'categories', 'Catégories', true),
('enterprise', 'employees', 'Employés', true),
('enterprise', 'attendance', 'Présence', true),
('enterprise', 'pos', 'Point de Vente', true),
('enterprise', 'pos_reports', 'Rapports POS', true),
('enterprise', 'kitchen_display', 'Affichage Cuisine', true),
('enterprise', 'bar_display', 'Affichage Bar', true),
('enterprise', 'menu_items', 'Articles Menu', true),
('enterprise', 'suppliers', 'Fournisseurs', true),
('enterprise', 'demands', 'Demandes', true),
('enterprise', 'tables', 'Gestion Tables', true);
```

### Frontend Changes

**New file: `src/pages/SuperAdminPlans.tsx`**
- Display all plans (basic, pro, enterprise) in a tabbed or card layout
- For each plan, show toggleable feature list
- Allow super admin to enable/disable features per plan

**Update: `src/components/SuperAdminLayout.tsx`**
- Add "Plans" navigation item

**New file: `src/hooks/usePlanFeatures.ts`**
- Hook to fetch plan features for the current tenant's subscription
- Used by Sidebar to conditionally show/hide menu items

**Update: `src/components/Sidebar.tsx`**
- Import `usePlanFeatures` hook
- Filter navigation items based on:
  1. User permissions (existing logic)
  2. Plan features (new logic) - only show features enabled in tenant's plan

### React Context for Plan Features

**New file: `src/contexts/PlanFeaturesContext.tsx`**
```typescript
interface PlanFeaturesContextType {
  features: Record<string, boolean>;
  loading: boolean;
  hasFeature: (featureKey: string) => boolean;
}
```

This context:
1. Fetches the tenant's subscription plan type
2. Fetches enabled features for that plan
3. Provides `hasFeature()` helper to check if a feature is available

### Sidebar Integration

The Sidebar will check both:
- **Employee permissions** (can this user access this feature?)
- **Plan features** (is this feature available in the restaurant's plan?)

If either check fails, the menu item is hidden.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | Add plan_features table and seed data |
| `src/pages/POSReports.tsx` | Modify | Add tenant filtering to RPC calls |
| `src/pages/Attendance.tsx` | Modify | Fix upsert with tenant_id and conflict columns |
| `src/components/EmployeeDialog.tsx` | Modify | Remove waiter role quick-add option |
| `src/pages/SuperAdminPlans.tsx` | Create | New page for plan management |
| `src/components/SuperAdminLayout.tsx` | Modify | Add Plans navigation |
| `src/contexts/PlanFeaturesContext.tsx` | Create | Context for plan feature access |
| `src/hooks/usePlanFeatures.ts` | Create | Hook for plan feature queries |
| `src/components/Sidebar.tsx` | Modify | Add plan feature filtering |
| `src/App.tsx` | Modify | Add route for SuperAdminPlans |

---

## Technical Notes

### Data Flow for Plan Features
```text
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Super Admin    │────>│  plan_features   │<────│  subscriptions    │
│  Plans Page     │     │  table           │     │  (tenant plan)    │
└─────────────────┘     └──────────────────┘     └───────────────────┘
                               │
                               v
                        ┌──────────────────┐
                        │  PlanFeatures    │
                        │  Context         │
                        └──────────────────┘
                               │
                               v
                        ┌──────────────────┐
                        │  Sidebar         │
                        │  (shows only     │
                        │   enabled items) │
                        └──────────────────┘
```

### Backwards Compatibility
- Existing restaurants with no plan_features configuration will default to having all features enabled
- The system gracefully handles missing data

### Security
- Plan features are readable by all authenticated users (needed for UI)
- Only super admins can modify plan features
- Feature enforcement at the route level adds an additional security layer
