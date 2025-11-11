import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock } from "lucide-react";

export default function SuperAdminInitialize() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initSecret, setInitSecret] = useState("");

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('initialize-super-admin', {
        body: {
          email: 'admin@Servara.com',
          password: 'Ayoub1994??%%',
          initSecret,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Initialization Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Super admin account created successfully. You can now log in.",
      });

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate("/super-admin/login");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize super admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Initialize Super Admin</CardTitle>
          <CardDescription className="text-center">
            Enter your initialization secret to create the first super admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInitialize} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Email (pre-configured)</Label>
              <Input
                id="email"
                type="email"
                value="admin@Servara.com"
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Password (pre-configured)</Label>
              <Input
                id="password"
                type="password"
                value="••••••••••••"
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initSecret" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Initialization Secret
              </Label>
              <Input
                id="initSecret"
                type="password"
                placeholder="Enter initialization secret"
                value={initSecret}
                onChange={(e) => setInitSecret(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This is the INIT_SECRET you configured in your secrets
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Initializing..." : "Create Super Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
