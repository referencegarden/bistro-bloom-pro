

## Plan: Integrate Plan Features with Sidebar Navigation

### Problem Identified
The Sidebar currently shows all features to admins and filters only by employee permissions. It does **NOT** check the restaurant's subscription plan or the `plan_features` table. This means:
- A "basic" plan restaurant sees all features (POS, Kitchen Display, etc.) even though those are disabled in `plan_features`
- The plan management system in super-admin has no effect on what restaurants actually see

### Solution
Add plan-based feature filtering to the Sidebar:

1. **Fetch subscription plan** for the current tenant
2. **Fetch enabled features** for that plan from `plan_features`
3. **Filter navigation items** by both plan features AND employee permissions

### Files to Modify

#### 1. `src/components/Sidebar.tsx`
- Add `useTenant()` hook to get `tenantId`
- Query `subscriptions` table to get the tenant's `plan_type`
- Query `plan_features` for enabled features of that plan
- Add `featureKey` property to each navigation item
- Filter navigation by: plan features enabled → then employee permissions

#### 2. Navigation Item Mapping
Each nav item gets a `featureKey` to match against `plan_features`:

```typescript
const allNavigation = [
  { name: "Tableau de bord", href: `/${slug}/dashboard`, icon: Home, permission: "can_view_reports", featureKey: "dashboard" },
  { name: "Produits", href: `/${slug}/products`, icon: Package, permission: "can_view_products", featureKey: "products" },
  { name: "Menu / Recettes", href: `/${slug}/menu-items`, icon: UtensilsCrossed, permission: "can_view_products", featureKey: "menu_items" },
  { name: "Sortie de Stock", href: `/${slug}/sales`, icon: ShoppingCart, permission: "can_make_sales", featureKey: "sales" },
  { name: "Achats", href: `/${slug}/purchases`, icon: TrendingUp, permission: "can_manage_stock", featureKey: "purchases" },
  { name: "Commandes", href: `/${slug}/demands`, icon: ClipboardList, permission: "can_create_demands", featureKey: "demands" },
  { name: "Catégories", href: `/${slug}/category-management`, icon: LayoutGrid, permission: "can_view_products", featureKey: "categories" },
  { name: "Fournisseurs", href: `/${slug}/suppliers`, icon: Users, permission: "can_manage_suppliers", featureKey: "suppliers" },
  { name: "Tables", href: `/${slug}/tables`, icon: Grid3X3, permission: "can_manage_stock", featureKey: "tables" },
  { name: "Présence", href: `/${slug}/attendance`, icon: ClipboardCheck, permission: null, featureKey: "attendance" },
  { name: "Employés", href: `/${slug}/employees`, icon: Users, permission: "can_manage_attendance", featureKey: "employees" },
  { name: "Point de Vente", href: `/${slug}/pos`, icon: ShoppingBag, permission: "can_use_pos", featureKey: "pos" },
  { name: "Commandes POS", href: `/${slug}/pos/orders`, icon: ClipboardList, permission: "can_manage_orders", featureKey: "pos_orders" },
  { name: "Affichage Cuisine", href: `/${slug}/pos/kitchen`, icon: ChefHat, permission: "can_view_kitchen_display", featureKey: "kitchen_display" },
  { name: "Affichage Bar", href: `/${slug}/pos/bar`, icon: Wine, permission: "can_view_bar_display", featureKey: "bar_display" },
  { name: "Rapports POS", href: `/${slug}/pos/reports`, icon: BarChart3, permission: "can_access_pos_reports", featureKey: "pos_reports" },
  { name: "Paramètres", href: `/${slug}/settings`, icon: Settings, permission: "can_view_reports", featureKey: "settings" },
];
```

### Filtering Logic

```typescript
const filteredNavigation = useMemo(() => {
  if (permissionsLoading || planLoading) return [];
  
  // Step 1: Filter by plan features (only show features enabled for the plan)
  const planFilteredItems = allNavigation.filter(item => {
    // If no featureKey, always show (shouldn't happen)
    if (!item.featureKey) return true;
    // Check if feature is enabled in the plan
    return enabledFeatures.includes(item.featureKey);
  });
  
  // Step 2: Filter by employee permissions
  if (isAdmin) return planFilteredItems; // Admins see all plan-enabled features
  
  return planFilteredItems.filter(item => {
    if (item.permission === null) return true;
    return permissions[item.permission] === true;
  });
}, [isAdmin, permissions, permissionsLoading, planLoading, enabledFeatures]);
```

### Summary
- Restaurant dashboard will only show features enabled in their subscription plan
- Super-admin can toggle features on/off per plan, and changes reflect immediately
- Employee permissions are still respected within available plan features

