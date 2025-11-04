import { NavLink, useNavigate } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users, LogOut, Settings, ClipboardList, UtensilsCrossed, ClipboardCheck, ShoppingBag, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
const navigation = [{
  name: "Tableau de bord",
  href: "/dashboard",
  icon: Home
}, {
  name: "Produits",
  href: "/products",
  icon: Package
}, {
  name: "Menu / Recettes",
  href: "/menu-items",
  icon: UtensilsCrossed
}, {
  name: "Sortie de Stock",
  href: "/sales",
  icon: ShoppingCart
}, {
  name: "Achats",
  href: "/purchases",
  icon: TrendingUp
}, {
  name: "Commandes",
  href: "/demands",
  icon: ClipboardList
}, {
  name: "Catégories",
  href: "/categories",
  icon: LayoutGrid
}, {
  name: "Fournisseurs",
  href: "/suppliers",
  icon: Users
}, {
  name: "Présence",
  href: "/attendance",
  icon: ClipboardCheck
}, {
  name: "Employés",
  href: "/employees",
  icon: Users
}, {
  name: "Point de Vente",
  href: "/pos",
  icon: ShoppingBag
}, {
  name: "Commandes POS",
  href: "/pos/orders",
  icon: ClipboardList
}, {
  name: "Affichage Cuisine",
  href: "/pos/kitchen",
  icon: ChefHat
}, {
  name: "Paramètres",
  href: "/settings",
  icon: Settings
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const {
    open
  } = useSidebar();
  const {
    isAdmin,
    permissions
  } = useEmployeePermissions();
  const {
    data: settings
  } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("app_settings").select("*").maybeSingle();
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
  const filteredNavigation = useMemo(() => {
    if (isAdmin) return navigation;
    return navigation.filter(item => {
      // Always show dashboard
      if (item.href === "/dashboard") return permissions.can_view_reports;
      // Settings only for admins
      if (item.href === "/settings") return false;
      // Categories, Suppliers, Employees only for admins
      if (["/categories", "/suppliers", "/employees"].includes(item.href)) return false;
      // Products visibility
      if (item.href === "/products") return permissions.can_view_products;
      // Menu items visibility (same as sales)
      if (item.href === "/menu-items") return permissions.can_make_sales;
      // Sales visibility
      if (item.href === "/sales") return permissions.can_make_sales;
      // Purchases only for admins or those who can manage stock
      if (item.href === "/purchases") return permissions.can_manage_stock;
      // Demands visible to all employees
      if (item.href === "/demands") return true;
      // POS permissions
      if (item.href === "/pos") return permissions.can_use_pos;
      if (item.href === "/pos/orders") return permissions.can_manage_orders;
      if (item.href === "/pos/kitchen") return permissions.can_view_kitchen_display;
      return true;
    });
  }, [isAdmin, permissions]);
  async function handleSignOut() {
    try {
      const {
        error
      } = await supabase.auth.signOut({
        scope: 'local'
      });
      if (error) throw error;
      toast.success("Déconnecté avec succès");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Force clear and navigation on error
      localStorage.clear();
      toast.success("Déconnecté");
      navigate("/");
    }
  }
  return <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          {settings?.admin_logo_url ? <img src={settings.admin_logo_url} alt="Logo" className="h-8 w-8 object-contain" /> : null}
          {open && <h1 className="text-xl font-bold text-green-800">
              {settings?.restaurant_name || "RestaurantPro"}
            </h1>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="rounded-none">
              {filteredNavigation.map(item => <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.href} end className={({
                  isActive
                }) => isActive ? "bg-primary text-primary-foreground" : ""}>
                      <item.icon className="h-5 w-5" />
                      <span className="text-lg font-semibold text-slate-800">{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
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
    </Sidebar>;
}