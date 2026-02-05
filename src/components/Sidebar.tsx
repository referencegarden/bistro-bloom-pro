import { NavLink, useNavigate, useParams } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users, LogOut, Settings, ClipboardList, UtensilsCrossed, ClipboardCheck, ShoppingBag, ChefHat, BarChart3, Wine, Grid3X3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";

export function AppSidebar() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { open } = useSidebar();
  const { isAdmin, permissions, loading: permissionsLoading } = useEmployeePermissions();
  const { hasFeature, loading: planLoading } = usePlanFeatures();

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Apply colors dynamically
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

  // All navigation items with their required permissions and plan feature keys
  const allNavigation = [
    { name: "Tableau de bord", href: `/${slug}/dashboard`, icon: Home, permission: "can_view_reports", feature: "dashboard" },
    { name: "Produits", href: `/${slug}/products`, icon: Package, permission: "can_view_products", feature: "products" },
    { name: "Menu / Recettes", href: `/${slug}/menu-items`, icon: UtensilsCrossed, permission: "can_view_products", feature: "menu_items" },
    { name: "Sortie de Stock", href: `/${slug}/sales`, icon: ShoppingCart, permission: "can_make_sales", feature: "sales" },
    { name: "Achats", href: `/${slug}/purchases`, icon: TrendingUp, permission: "can_manage_stock", feature: "purchases" },
    { name: "Commandes", href: `/${slug}/demands`, icon: ClipboardList, permission: "can_create_demands", feature: "demands" },
    { name: "Catégories", href: `/${slug}/category-management`, icon: LayoutGrid, permission: "can_view_products", feature: "categories" },
    { name: "Fournisseurs", href: `/${slug}/suppliers`, icon: Users, permission: "can_manage_suppliers", feature: "suppliers" },
    { name: "Tables", href: `/${slug}/tables`, icon: Grid3X3, permission: "can_manage_stock", feature: "tables" },
    { name: "Présence", href: `/${slug}/attendance`, icon: ClipboardCheck, permission: null, feature: "attendance" }, // Always visible to all employees
    { name: "Employés", href: `/${slug}/employees`, icon: Users, permission: "can_manage_attendance", feature: "employees" },
    { name: "Point de Vente", href: `/${slug}/pos`, icon: ShoppingBag, permission: "can_use_pos", feature: "pos" },
    { name: "Commandes POS", href: `/${slug}/pos/orders`, icon: ClipboardList, permission: "can_manage_orders", feature: "pos_orders" },
    { name: "Affichage Cuisine", href: `/${slug}/pos/kitchen`, icon: ChefHat, permission: "can_view_kitchen_display", feature: "kitchen_display" },
    { name: "Affichage Bar", href: `/${slug}/pos/bar`, icon: Wine, permission: "can_view_bar_display", feature: "bar_display" },
    { name: "Rapports POS", href: `/${slug}/pos/reports`, icon: BarChart3, permission: "can_access_pos_reports", feature: "pos_reports" },
    { name: "Paramètres", href: `/${slug}/settings`, icon: Settings, permission: "can_view_reports", feature: "settings" }, // Admin-level
  ];

  // Filter navigation based on permissions AND plan features
  const filteredNavigation = useMemo(() => {
    // While loading, show a minimal set for employees or nothing
    if (permissionsLoading || planLoading) {
      return [];
    }
    
    // Filter based on plan features first, then permissions
    return allNavigation.filter(item => {
      // Check if feature is enabled in the plan (admins can still see everything if plan allows)
      if (!hasFeature(item.feature)) {
        return false;
      }
      
      // Admins see everything that's in their plan
      if (isAdmin) return true;
      
      // Items with no permission requirement are visible to all (if plan allows)
      if (item.permission === null) return true;
      
      // Check specific permission
      return permissions[item.permission as keyof typeof permissions] === true;
    });
  }, [isAdmin, permissions, permissionsLoading, planLoading, slug, allNavigation, hasFeature]);

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
      // Force clear and navigation on error
      localStorage.clear();
      toast.success("Déconnecté");
      navigate(`/${currentSlug}`);
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          {settings?.admin_logo_url && (
            <img src={settings.admin_logo_url} alt="Logo" className="h-8 w-8 object-contain" />
          )}
          {open && (
            <h1 className="text-xl font-bold text-green-800">
              {settings?.restaurant_name || "RestaurantPro"}
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="rounded-none">
              {filteredNavigation.map(item => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.href} 
                      end 
                      className={({ isActive }) => 
                        isActive ? "bg-primary text-primary-foreground" : ""
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-lg font-semibold text-slate-800">{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="mr-2 h-5 w-5" />
          {open && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}