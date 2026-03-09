import { NavLink, useNavigate, useParams } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users, LogOut, Settings, ClipboardList, UtensilsCrossed, ClipboardCheck, ShoppingBag, ChefHat, BarChart3, Wine, Grid3X3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { useTenant } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { open } = useSidebar();
  const { tenantId } = useTenant();
  const { isAdmin, permissions, loading: permissionsLoading } = useEmployeePermissions();

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["tenant-subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, status, end_date")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: enabledFeatures, isLoading: featuresLoading } = useQuery({
    queryKey: ["plan-features", subscription?.plan_type],
    queryFn: async () => {
      if (!subscription?.plan_type) return [];
      const { data, error } = await supabase
        .from("plan_features")
        .select("feature_key")
        .eq("plan_type", subscription.plan_type)
        .eq("is_enabled", true);
      if (error) throw error;
      return data?.map(f => f.feature_key) || [];
    },
    enabled: !!subscription?.plan_type,
  });

  const { data: employeeData } = useQuery({
    queryKey: ["current-employee-sidebar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("name, position")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const normalize = (val?: string | null) => {
        if (!val) return undefined;
        const trimmed = val.trim();
        const match = trimmed.match(/^hsl\((.*)\)$/i);
        return match ? match[1] : trimmed;
      };
      const primary = normalize(settings.primary_color);
      const secondary = normalize(settings.secondary_color);
      const background = normalize(settings.background_color);
      if (primary) {
        document.documentElement.style.setProperty("--primary", primary);
        document.documentElement.style.setProperty("--accent", primary);
        document.documentElement.style.setProperty("--ring", primary);
      }
      if (secondary) {
        document.documentElement.style.setProperty("--secondary", secondary);
      }
      if (background) {
        document.documentElement.style.setProperty("--background", background);
      }
      if (settings.restaurant_name) {
        document.title = settings.restaurant_name;
      }
    }
  }, [settings]);

  // Navigation grouped by section
  const operationsNav = [
    { name: "Tableau de bord", href: `/${slug}/dashboard`, icon: Home, permission: "can_view_reports", featureKey: "dashboard" },
    { name: "Produits", href: `/${slug}/products`, icon: Package, permission: "can_view_products", featureKey: "products" },
    { name: "Menu / Recettes", href: `/${slug}/menu-items`, icon: UtensilsCrossed, permission: "can_view_products", featureKey: "menu_items" },
    { name: "Catégories", href: `/${slug}/category-management`, icon: LayoutGrid, permission: "can_view_products", featureKey: "categories" },
    { name: "Fournisseurs", href: `/${slug}/suppliers`, icon: Users, permission: "can_manage_suppliers", featureKey: "suppliers" },
    { name: "Tables", href: `/${slug}/tables`, icon: Grid3X3, permission: "can_manage_stock", featureKey: "tables" },
  ];

  const salesNav = [
    { name: "Sortie de Stock", href: `/${slug}/sales`, icon: ShoppingCart, permission: "can_make_sales", featureKey: "sales" },
    { name: "Achats", href: `/${slug}/purchases`, icon: TrendingUp, permission: "can_manage_stock", featureKey: "purchases" },
    { name: "Commandes", href: `/${slug}/demands`, icon: ClipboardList, permission: "can_create_demands", featureKey: "demands" },
    { name: "Point de Vente", href: `/${slug}/pos`, icon: ShoppingBag, permission: "can_use_pos", featureKey: "pos" },
    { name: "Commandes POS", href: `/${slug}/pos/orders`, icon: ClipboardList, permission: "can_manage_orders", featureKey: "pos_orders" },
  ];

  const managementNav = [
    { name: "Affichage Cuisine", href: `/${slug}/pos/kitchen`, icon: ChefHat, permission: "can_view_kitchen_display", featureKey: "kitchen_display" },
    { name: "Affichage Bar", href: `/${slug}/pos/bar`, icon: Wine, permission: "can_view_bar_display", featureKey: "bar_display" },
    { name: "Rapports POS", href: `/${slug}/pos/reports`, icon: BarChart3, permission: "can_access_pos_reports", featureKey: "pos_reports" },
    { name: "Présence", href: `/${slug}/attendance`, icon: ClipboardCheck, permission: null, featureKey: "attendance" },
    { name: "Employés", href: `/${slug}/employees`, icon: Users, permission: "can_manage_attendance", featureKey: "employees" },
    { name: "Paramètres", href: `/${slug}/settings`, icon: Settings, permission: "can_view_reports", featureKey: "settings" },
  ];

  const planLoading = subscriptionLoading || featuresLoading;

  const filterItems = (items: typeof operationsNav) => {
    if (permissionsLoading || planLoading) return [];
    
    const planFiltered = items.filter(item => {
      if (!enabledFeatures || enabledFeatures.length === 0) return true;
      return enabledFeatures.includes(item.featureKey);
    });
    
    if (isAdmin) return planFiltered;
    
    return planFiltered.filter(item => {
      if (item.permission === null) return true;
      return permissions[item.permission as keyof typeof permissions] === true;
    });
  };

  const filteredOps = useMemo(() => filterItems(operationsNav), [permissionsLoading, planLoading, enabledFeatures, isAdmin, permissions, slug]);
  const filteredSales = useMemo(() => filterItems(salesNav), [permissionsLoading, planLoading, enabledFeatures, isAdmin, permissions, slug]);
  const filteredMgmt = useMemo(() => filterItems(managementNav), [permissionsLoading, planLoading, enabledFeatures, isAdmin, permissions, slug]);

  async function handleSignOut() {
    try {
      const currentSlug = slug || localStorage.getItem('current_tenant_slug') || 'default-restaurant';
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      localStorage.clear();
      toast.success("Déconnecté avec succès");
      navigate(`/${currentSlug}`);
    } catch (error) {
      console.error("Logout error:", error);
      const currentSlug = slug || localStorage.getItem('current_tenant_slug') || 'default-restaurant';
      localStorage.clear();
      toast.success("Déconnecté");
      navigate(`/${currentSlug}`);
    }
  }

  const initials = employeeData?.name
    ? employeeData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const renderNavGroup = (label: string, items: typeof operationsNav) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-widest font-semibold px-3 mb-1">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(item => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.href}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2.5">
          {settings?.admin_logo_url && (
            <img src={settings.admin_logo_url} alt="Logo" className="h-8 w-8 object-contain rounded" />
          )}
          {open && (
            <h1 className="text-lg font-bold text-sidebar-foreground truncate">
              {settings?.restaurant_name || "RestaurantPro"}
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {renderNavGroup("Opérations", filteredOps)}
        {renderNavGroup("Ventes", filteredSales)}
        {renderNavGroup("Gestion", filteredMgmt)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {open && employeeData && (
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{employeeData.name}</span>
              <span className="text-[11px] text-sidebar-foreground/60 truncate">{employeeData.position}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {open && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
