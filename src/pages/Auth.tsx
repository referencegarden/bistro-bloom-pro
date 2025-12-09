import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Auth() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { tenantId, tenantName, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["app-settings-public", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("app_settings")
        .select("login_logo_url, restaurant_name")
        .eq("tenant_id", tenantId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!tenantId,
  });

  // Helper function to get the best redirect route based on permissions
  const getPermissionBasedRoute = (perms: any): string => {
    // Priority order for redirects based on permissions
    if (perms?.can_view_kitchen_display) {
      return `/${slug}/pos/kitchen`;
    }
    if (perms?.can_view_bar_display) {
      return `/${slug}/pos/bar`;
    }
    if (perms?.can_use_pos) {
      return `/${slug}/pos`;
    }
    if (perms?.can_access_pos_reports) {
      return `/${slug}/pos/reports`;
    }
    if (perms?.can_make_sales) {
      return `/${slug}/sales`;
    }
    if (perms?.can_view_products) {
      return `/${slug}/products`;
    }
    if (perms?.can_manage_stock) {
      return `/${slug}/products`;
    }
    if (perms?.can_manage_suppliers) {
      return `/${slug}/suppliers`;
    }
    if (perms?.can_manage_attendance) {
      return `/${slug}/attendance`;
    }
    if (perms?.can_view_reports) {
      return `/${slug}/dashboard`;
    }
    if (perms?.can_create_demands) {
      return `/${slug}/demands`;
    }
    // Default fallback - attendance is always accessible
    return `/${slug}/attendance`;
  };

  useEffect(() => {
    // Don't run session checks until tenant is fully loaded
    if (!slug || tenantLoading || !tenantId) return;

    let isMounted = true;

    // Check existing session and redirect appropriately
    const checkSessionAndRedirect = async (session: any) => {
      if (!session || !isMounted) return;

      try {
        // Verify user belongs to this tenant - but DON'T sign out on failure
        const { data: tenantUser, error: tenantError } = await supabase
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", session.user.id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        // If query error, log it but don't sign out - just show login form
        if (tenantError) {
          console.warn("Tenant verification query error:", tenantError.message);
          return; // Show login form, don't destroy session
        }

        // If user doesn't belong to this tenant, just show login form
        // Don't sign them out - they may be logged into another tenant
        if (!tenantUser) {
          return; // Show login form
        }

        if (!isMounted) return;

        // Check if user is admin (admins go to dashboard)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (roleData?.role === 'admin' || roleData?.role === 'super_admin') {
          navigate(`/${slug}/dashboard`, { replace: true });
          return;
        }

        // For employees, check permissions and redirect to appropriate page
        if (roleData?.role === 'employee') {
          const { data: employee } = await supabase
            .from("employees")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (!isMounted) return;

          if (employee) {
            const { data: perms } = await supabase
              .from("employee_permissions")
              .select("*")
              .eq("employee_id", employee.id)
              .maybeSingle();

            if (!isMounted) return;

            const route = getPermissionBasedRoute(perms);
            navigate(route, { replace: true });
            return;
          }
        }

        // Default redirect for other cases
        navigate(`/${slug}/dashboard`, { replace: true });
      } catch (error) {
        // On error, just log it - don't sign out
        console.warn("Session check error:", error);
        // Show login form but preserve session
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session && isMounted) {
          await checkSessionAndRedirect(session);
        }
      }
    );

    // Check if there's already a session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && isMounted) {
        await checkSessionAndRedirect(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, slug, tenantId, tenantLoading]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) {
      toast.error("Restaurant not found");
      return;
    }

    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error("Échec de connexion: " + error.message);
      setLoading(false);
      return;
    }

    // Verify user belongs to this tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", authData.user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!tenantUser) {
      toast.error("Vous n'avez pas accès à ce restaurant");
      await supabase.auth.signOut({ scope: 'local' });
      setLoading(false);
      return;
    }

    // Store tenant slug for sign-out redirect
    localStorage.setItem('current_tenant_slug', slug || '');
    
    toast.success("Connexion réussie!");
    navigate(`/${slug}/dashboard`);
    setLoading(false);
  }

  async function handleEmployeeLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('employee-pin-login', {
        body: {
          pin: pin.trim(),
          tenantId: tenantId
        }
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      // Set the session using the tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });

      if (sessionError) {
        toast.error("Échec de connexion");
        setLoading(false);
        return;
      }

      // Store tenant slug for sign-out redirect
      localStorage.setItem('current_tenant_slug', slug || '');
      
      toast.success(`Bienvenue ${data.employee.name}`);

      // Smart redirect based on permissions
      const { data: perms } = await supabase
        .from("employee_permissions")
        .select("*")
        .eq("employee_id", data.employee.id)
        .maybeSingle();
      
      const route = getPermissionBasedRoute(perms);
      navigate(route);
    } catch (error) {
      console.error('Employee login error:', error);
      toast.error("Échec de connexion");
    } finally {
      setLoading(false);
    }
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Restaurant Not Found</CardTitle>
            <CardDescription className="text-center">
              The restaurant "{slug}" does not exist or is not active.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {settings?.login_logo_url ? (
              <img src={settings.login_logo_url} alt="Logo" className="h-16 w-16 object-contain" />
            ) : (
              <div className="bg-primary/10 p-3 rounded-full">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {settings?.restaurant_name || tenantName || "Gestion de Restaurant"}
          </CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin">Administrateur</TabsTrigger>
              <TabsTrigger value="employee">Employé</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input 
                    id="signin-email" 
                    type="email" 
                    placeholder="votre@email.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input 
                    id="signin-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-green-900 hover:bg-green-800">
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="employee" className="space-y-4 mt-4">
              <form onSubmit={handleEmployeeLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-pin">Code PIN</Label>
                  <Input 
                    id="employee-pin" 
                    type="password" 
                    placeholder="Entrez votre code PIN" 
                    maxLength={6} 
                    value={pin} 
                    onChange={e => setPin(e.target.value)} 
                    required 
                    autoFocus 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
              <p className="text-sm text-center text-muted-foreground mt-4">
                Contactez votre administrateur si vous avez oublié votre code PIN
              </p>
            </TabsContent>
          </Tabs>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Besoin d'un compte ? Contactez l'administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
