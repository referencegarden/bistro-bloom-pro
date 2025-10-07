import { NavLink, useNavigate } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users, LogOut, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";

const navigation = [
  { name: "Tableau de bord", href: "/", icon: Home, permission: "can_view_dashboard" as const },
  { name: "Produits", href: "/products", icon: Package, permission: "can_manage_products" as const },
  { name: "Ventes", href: "/sales", icon: ShoppingCart, permission: "can_manage_sales" as const },
  { name: "Achats", href: "/purchases", icon: TrendingUp, permission: "can_manage_purchases" as const },
  { name: "Catégories", href: "/categories", icon: LayoutGrid, permission: "can_manage_categories" as const },
  { name: "Fournisseurs", href: "/suppliers", icon: Users, permission: "can_manage_suppliers" as const },
  { name: "Utilisateurs", href: "/users", icon: UserCog, permission: "can_manage_users" as const },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { permissions, loading } = useUserPermissions();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Échec de déconnexion");
    } else {
      toast.success("Déconnecté avec succès");
      navigate("/auth");
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-64 flex-col border-r bg-card items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">RestaurantPro</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          // Check if user has permission to access this section
          if (!permissions[item.permission]) {
            return null;
          }
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
