import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Store, User, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeIdentifier, setEmployeeIdentifier] = useState("");
  const [pin, setPin] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["app-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("login_logo_url, restaurant_name")
        .single();
      
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Échec de connexion: " + error.message);
      setLoading(false);
      return;
    }

    // Bootstrap admin role for ayoub.iqrae@gmail.com if no role exists
    if (email === 'ayoub.iqrae@gmail.com') {
      const { data, error: rpcError } = await supabase.rpc('bootstrap_admin', {
        target_email: email
      });

      if (rpcError) {
        console.error('Bootstrap admin error:', rpcError);
      } else if (data && typeof data === 'object' && 'success' in data && data.success) {
        toast.success("Connexion réussie! Droits admin attribués.");
      } else {
        toast.success("Connexion réussie!");
      }
    } else {
      toast.success("Connexion réussie!");
    }

    setLoading(false);
  }

  async function handleEmployeeSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('employee-pin-login', {
        body: { employeeIdentifier, pin }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Use the magiclink properties to sign in
      const { data: signInData, error: signInError } = await supabase.auth.verifyOtp({
        token_hash: data.session.properties.hashed_token,
        type: 'magiclink',
      });

      if (signInError) throw signInError;

      toast.success(`Bienvenue ${data.employee.name}`);
      
      // Smart redirect based on permissions
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", signInData.user.id)
        .maybeSingle();

      if (employee) {
        const { data: perms } = await supabase
          .from("employee_permissions")
          .select("*")
          .eq("employee_id", employee.id)
          .maybeSingle();

        if (perms?.can_make_sales) {
          navigate("/sales");
        } else if (perms?.can_view_products) {
          navigate("/products");
        } else if (perms?.can_view_reports) {
          navigate("/");
        } else {
          navigate("/sales");
        }
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error during employee sign-in:", error);
      toast.error(error.message || "Code PIN invalide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {settings?.login_logo_url ? (
              <img 
                src={settings.login_logo_url} 
                alt="Logo" 
                className="h-16 w-16 object-contain"
              />
            ) : (
              <div className="bg-primary/10 p-3 rounded-full">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {settings?.restaurant_name || "Gestion de Restaurant"}
          </CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee">
                <User className="mr-2 h-4 w-4" />
                Employé
              </TabsTrigger>
              <TabsTrigger value="admin">
                <Lock className="mr-2 h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="mt-4">
              <form onSubmit={handleEmployeeSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Numéro ou Nom</Label>
                  <Input
                    id="employee"
                    type="text"
                    placeholder="Votre numéro ou nom"
                    value={employeeIdentifier}
                    onChange={(e) => setEmployeeIdentifier(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">Code PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={loading}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="mt-4">
              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
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
