import { useState, useEffect } from "react";
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
  const {
    data: settings,
    isLoading
  } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("app_settings").select("*").single();
      if (error) throw error;
      return data;
    }
  });
  const [restaurantName, setRestaurantName] = useState("");
  const [adminLogoUrl, setAdminLogoUrl] = useState("");
  const [loginLogoUrl, setLoginLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("hsl(142.1 76.2% 36.3%)");
  const [secondaryColor, setSecondaryColor] = useState("hsl(221.2 83.2% 53.3%)");
  const [backgroundColor, setBackgroundColor] = useState("hsl(0 0% 100%)");

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setRestaurantName(settings.restaurant_name);
      setAdminLogoUrl(settings.admin_logo_url || "");
      setLoginLogoUrl(settings.login_logo_url || "");
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setBackgroundColor(settings.background_color);
    }
  }, [settings]);
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const {
        error
      } = await supabase.from("app_settings").update(data).eq("id", settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["app-settings"]
      });
      toast.success("Paramètres enregistrés avec succès");
    },
    onError: error => {
      console.error("Error updating settings:", error);
      toast.error("Échec de la mise à jour des paramètres");
    }
  });

  // Track if there are unsaved changes
  const isDirty = settings ? restaurantName !== settings.restaurant_name || adminLogoUrl !== (settings.admin_logo_url || "") || loginLogoUrl !== (settings.login_logo_url || "") || primaryColor !== settings.primary_color || secondaryColor !== settings.secondary_color || backgroundColor !== settings.background_color : false;
  const handleSaveAll = () => {
    if (!restaurantName.trim()) {
      toast.error("Le nom du restaurant ne peut pas être vide");
      return;
    }
    updateMutation.mutate({
      restaurant_name: restaurantName,
      admin_logo_url: adminLogoUrl || null,
      login_logo_url: loginLogoUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      background_color: backgroundColor
    });
  };
  const handleCancel = () => {
    if (settings) {
      setRestaurantName(settings.restaurant_name);
      setAdminLogoUrl(settings.admin_logo_url || "");
      setLoginLogoUrl(settings.login_logo_url || "");
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setBackgroundColor(settings.background_color);
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>;
  }
  return <div className="space-y-6 pb-24 px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Paramètres de l'Application</h1>
        <p className="text-muted-foreground">Personnalisez l'apparence et les informations de votre application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logos</CardTitle>
          <CardDescription>Téléchargez les logos pour l'interface admin et la page de connexion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <LogoUpload label="Logo Interface Admin" currentUrl={adminLogoUrl} onChange={setAdminLogoUrl} bucketPath="admin-logo" />
            <LogoUpload label="Logo Page de Connexion" currentUrl={loginLogoUrl} onChange={setLoginLogoUrl} bucketPath="login-logo" />
          </div>
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
            <Input id="restaurant-name" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="RestaurantPro" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Couleurs du Système</CardTitle>
          <CardDescription>Personnalisez les couleurs principales de votre application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ColorPicker label="Couleur Primaire" value={primaryColor} onChange={setPrimaryColor} />
            <ColorPicker label="Couleur Secondaire" value={secondaryColor} onChange={setSecondaryColor} />
            <ColorPicker label="Couleur de Fond" value={backgroundColor} onChange={setBackgroundColor} />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Aperçu</h4>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="h-20 rounded-lg border" style={{
              backgroundColor: primaryColor
            }}>
                <p className="text-center text-white text-sm font-medium pt-8">Primaire</p>
              </div>
              <div className="h-20 rounded-lg border" style={{
              backgroundColor: secondaryColor
            }}>
                <p className="text-center text-white text-sm font-medium pt-8">Secondaire</p>
              </div>
              <div className="h-20 rounded-lg border" style={{
              backgroundColor: backgroundColor
            }}>
                <p className="text-center text-foreground text-sm font-medium pt-8">Fond</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Save Bar */}
      {isDirty && <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
            <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={handleSaveAll} disabled={updateMutation.isPending || !settings} className="w-full sm:w-auto">
              {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>}
    </div>;
}