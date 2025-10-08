import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ColorPicker";
import { LogoUpload } from "@/components/LogoUpload";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
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

  const [restaurantName, setRestaurantName] = useState(settings?.restaurant_name || "");
  const [adminLogoUrl, setAdminLogoUrl] = useState(settings?.admin_logo_url || "");
  const [loginLogoUrl, setLoginLogoUrl] = useState(settings?.login_logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color || "hsl(142.1 76.2% 36.3%)");
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color || "hsl(221.2 83.2% 53.3%)");
  const [backgroundColor, setBackgroundColor] = useState(settings?.background_color || "hsl(0 0% 100%)");

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setRestaurantName(settings.restaurant_name);
      setAdminLogoUrl(settings.admin_logo_url || "");
      setLoginLogoUrl(settings.login_logo_url || "");
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setBackgroundColor(settings.background_color);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("app_settings")
        .update(data)
        .eq("id", settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Paramètres enregistrés avec succès");
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast.error("Échec de la mise à jour des paramètres");
    },
  });

  const handleSaveColors = () => {
    updateMutation.mutate({
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      background_color: backgroundColor,
    });
  };

  const handleSaveName = () => {
    if (!restaurantName.trim()) {
      toast.error("Le nom du restaurant ne peut pas être vide");
      return;
    }
    updateMutation.mutate({ restaurant_name: restaurantName });
  };

  const handleLogoUpdate = (type: "admin" | "login", url: string) => {
    if (type === "admin") {
      setAdminLogoUrl(url);
      updateMutation.mutate({ admin_logo_url: url });
    } else {
      setLoginLogoUrl(url);
      updateMutation.mutate({ login_logo_url: url });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres de l'Application</h1>
        <p className="text-muted-foreground">Personnalisez l'apparence et les informations de votre application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logos</CardTitle>
          <CardDescription>Téléchargez les logos pour l'interface admin et la page de connexion</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <LogoUpload
            label="Logo Interface Admin"
            currentUrl={adminLogoUrl}
            onUpload={(url) => handleLogoUpdate("admin", url)}
            bucketPath="admin-logo"
          />
          <LogoUpload
            label="Logo Page de Connexion"
            currentUrl={loginLogoUrl}
            onUpload={(url) => handleLogoUpdate("login", url)}
            bucketPath="login-logo"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nom du Restaurant</CardTitle>
          <CardDescription>Ce nom apparaîtra dans la barre latérale et le titre de la page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restaurant-name">Nom du Restaurant</Label>
            <Input
              id="restaurant-name"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="RestaurantPro"
            />
          </div>
          <Button onClick={handleSaveName} disabled={updateMutation.isPending}>
            Enregistrer le nom
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Couleurs du Système</CardTitle>
          <CardDescription>Personnalisez les couleurs principales de votre application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ColorPicker
              label="Couleur Primaire"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPicker
              label="Couleur Secondaire"
              value={secondaryColor}
              onChange={setSecondaryColor}
            />
            <ColorPicker
              label="Couleur de Fond"
              value={backgroundColor}
              onChange={setBackgroundColor}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Aperçu</h4>
            <div className="grid gap-2 md:grid-cols-3">
              <div 
                className="h-20 rounded-lg border"
                style={{ backgroundColor: primaryColor }}
              >
                <p className="text-center text-white text-sm font-medium pt-8">Primaire</p>
              </div>
              <div 
                className="h-20 rounded-lg border"
                style={{ backgroundColor: secondaryColor }}
              >
                <p className="text-center text-white text-sm font-medium pt-8">Secondaire</p>
              </div>
              <div 
                className="h-20 rounded-lg border"
                style={{ backgroundColor: backgroundColor }}
              >
                <p className="text-center text-foreground text-sm font-medium pt-8">Fond</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveColors} disabled={updateMutation.isPending}>
            Enregistrer les couleurs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
