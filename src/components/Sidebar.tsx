import { NavLink, useNavigate } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

const navigation = [
  { name: "Tableau de bord", href: "/", icon: Home },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Sortie de Stock", href: "/sales", icon: ShoppingCart },
  { name: "Achats", href: "/purchases", icon: TrendingUp },
  { name: "Catégories", href: "/categories", icon: LayoutGrid },
  { name: "Fournisseurs", href: "/suppliers", icon: Users },
  { name: "Employés", href: "/employees", icon: Users },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { open } = useSidebar();

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Apply colors dynamically
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty("--primary", settings.primary_color);
      document.documentElement.style.setProperty("--secondary", settings.secondary_color);
      document.documentElement.style.setProperty("--background", settings.background_color);
      
      // Update page title
      document.title = settings.restaurant_name;
    }
  }, [settings]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Échec de déconnexion");
    } else {
      toast.success("Déconnecté avec succès");
      navigate("/auth");
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          {settings?.admin_logo_url ? (
            <img 
              src={settings.admin_logo_url} 
              alt="Logo" 
              className="h-8 w-8 object-contain"
            />
          ) : null}
          {open && (
            <h1 className="text-xl font-bold text-primary">
              {settings?.restaurant_name || "RestaurantPro"}
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
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
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-5 w-5" />
          {open && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
