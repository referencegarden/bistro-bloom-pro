import { NavLink, useNavigate, useParams } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users, LogOut, Settings, ClipboardList, UtensilsCrossed, ClipboardCheck, ShoppingBag, ChefHat, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function AppSidebar() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { open } = useSidebar();

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

  // Build slug-aware navigation - all features accessible to all restaurants
  const navigation = [
    { name: "Tableau de bord", href: `/${slug}/dashboard`, icon: Home },
    { name: "Produits", href: `/${slug}/products`, icon: Package },
    { name: "Menu / Recettes", href: `/${slug}/menu-items`, icon: UtensilsCrossed },
    { name: "Sortie de Stock", href: `/${slug}/sales`, icon: ShoppingCart },
    { name: "Achats", href: `/${slug}/purchases`, icon: TrendingUp },
    { name: "Commandes", href: `/${slug}/demands`, icon: ClipboardList },
    { name: "Catégories", href: `/${slug}/category-management`, icon: LayoutGrid },
    { name: "Fournisseurs", href: `/${slug}/suppliers`, icon: Users },
    { name: "Présence", href: `/${slug}/attendance`, icon: ClipboardCheck },
    { name: "Employés", href: `/${slug}/employees`, icon: Users },
    { name: "Point de Vente", href: `/${slug}/pos`, icon: ShoppingBag },
    { name: "Commandes POS", href: `/${slug}/pos/orders`, icon: ClipboardList },
    { name: "Affichage Cuisine", href: `/${slug}/pos/kitchen`, icon: ChefHat },
    { name: "Rapports POS", href: `/${slug}/pos/reports`, icon: BarChart3 },
    { name: "Paramètres", href: `/${slug}/settings`, icon: Settings },
  ];

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
              {navigation.map(item => (
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
