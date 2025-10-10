import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    // Check if there's already a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
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

    navigate("/");
    setLoading(false);
  }

  async function handleEmployeeLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('employee-pin-login', {
        body: { pin: pin.trim() },
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
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        toast.error("Échec de connexion");
        setLoading(false);
        return;
      }

      toast.success(`Bienvenue ${data.employee.name}`);

      // Smart redirect based on permissions
      const { data: perms } = await supabase
        .from("employee_permissions")
        .select("*")
        .eq("employee_id", data.employee.id)
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
    } catch (error) {
      console.error('Employee login error:', error);
      toast.error("Échec de connexion");
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
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
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
                    onChange={(e) => setPin(e.target.value)}
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
