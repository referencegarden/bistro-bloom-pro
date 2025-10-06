import { NavLink } from "react-router-dom";
import { Home, Package, ShoppingCart, TrendingUp, LayoutGrid, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tableau de bord", href: "/", icon: Home },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Ventes", href: "/sales", icon: ShoppingCart },
  { name: "Achats", href: "/purchases", icon: TrendingUp },
  { name: "Catégories", href: "/categories", icon: LayoutGrid },
  { name: "Fournisseurs", href: "/suppliers", icon: Users },
];

export function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">RestaurantPro</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
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
        ))}
      </nav>
    </div>
  );
}
