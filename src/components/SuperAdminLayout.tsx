import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, LayoutDashboard, Users, CreditCard, LogOut, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "super_admin")
        .single();

      setIsAuthorized(!!roleData);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      localStorage.clear();
      toast({
        title: "Signed Out",
        description: "You have been logged out successfully.",
      });
      navigate("/super-admin/login");
    } catch (error) {
      console.error("Sign out error:", error);
      localStorage.clear();
      navigate("/super-admin/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/super-admin/login" replace />;
  }

  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Super Admin Panel</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className={`rounded-none border-b-2 ${isActive("/super-admin/dashboard") ? "border-primary" : "border-transparent"}`}
              onClick={() => navigate("/super-admin/dashboard")}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className={`rounded-none border-b-2 ${isActive("/super-admin/tenants") ? "border-primary" : "border-transparent"}`}
              onClick={() => navigate("/super-admin/tenants")}
            >
              <Users className="h-4 w-4 mr-2" />
              Restaurants
            </Button>
            <Button
              variant="ghost"
              className={`rounded-none border-b-2 ${isActive("/super-admin/subscriptions") ? "border-primary" : "border-transparent"}`}
              onClick={() => navigate("/super-admin/subscriptions")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Subscriptions
            </Button>
            <Button
              variant="ghost"
              className={`rounded-none border-b-2 ${isActive("/super-admin/plans") ? "border-primary" : "border-transparent"}`}
              onClick={() => navigate("/super-admin/plans")}
            >
              <Package className="h-4 w-4 mr-2" />
              Plans
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
