import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ColorPicker";
import { LogoUpload } from "@/components/LogoUpload";
import { Separator } from "@/components/ui/separator";
import { Wifi, Info, Search, Loader2, CheckCircle, Globe } from "lucide-react";
import { detectWifiConnection } from "@/lib/wifiDetection";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/translations";

export default function Settings() {
  const queryClient = useQueryClient();
  const { t, language: currentLanguage, setLanguage } = useLanguage();
  const {
    data: settings,
    isLoading
  } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").single();
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
  const [useTablesSystem, setUseTablesSystem] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("fr");
  
  const [requireWifiForAttendance, setRequireWifiForAttendance] = useState(false);
  const [wifiSsidName, setWifiSsidName] = useState("");
  const [wifiIpRange, setWifiIpRange] = useState("");
  const [wifiPublicIp, setWifiPublicIp] = useState("");
  const [isDetectingNetwork, setIsDetectingNetwork] = useState(false);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setRestaurantName(settings.restaurant_name);
      setAdminLogoUrl(settings.admin_logo_url || "");
      setLoginLogoUrl(settings.login_logo_url || "");
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setBackgroundColor(settings.background_color);
      setUseTablesSystem(settings.use_tables_system ?? true);
      setRequireWifiForAttendance((settings as any).require_wifi_for_attendance ?? false);
      setWifiSsidName((settings as any).wifi_ssid_name || "");
      setWifiIpRange((settings as any).wifi_ip_range || "");
      setWifiPublicIp((settings as any).wifi_public_ip || "");
      setSelectedLanguage(((settings as any).language as Language) || "fr");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("app_settings").update(data).eq("id", settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings-language"] });
      setLanguage(selectedLanguage);
      toast.success(t("settings.savedSuccess"));
    },
    onError: error => {
      console.error("Error updating settings:", error);
      toast.error(t("settings.saveFailed"));
    }
  });

  const isDirty = settings ? 
    restaurantName !== settings.restaurant_name || 
    adminLogoUrl !== (settings.admin_logo_url || "") || 
    loginLogoUrl !== (settings.login_logo_url || "") || 
    primaryColor !== settings.primary_color || 
    secondaryColor !== settings.secondary_color || 
    backgroundColor !== settings.background_color ||
    useTablesSystem !== (settings.use_tables_system ?? true) ||
    requireWifiForAttendance !== ((settings as any).require_wifi_for_attendance ?? false) ||
    wifiSsidName !== ((settings as any).wifi_ssid_name || "") ||
    wifiIpRange !== ((settings as any).wifi_ip_range || "") ||
    wifiPublicIp !== ((settings as any).wifi_public_ip || "") ||
    selectedLanguage !== (((settings as any).language as Language) || "fr")
    : false;

  const handleSaveAll = () => {
    if (!restaurantName.trim()) {
      toast.error(t("settings.nameEmpty"));
      return;
    }
    if (requireWifiForAttendance && !wifiIpRange.trim()) {
      toast.error(t("settings.ipRequired"));
      return;
    }
    updateMutation.mutate({
      restaurant_name: restaurantName,
      admin_logo_url: adminLogoUrl || null,
      login_logo_url: loginLogoUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      background_color: backgroundColor,
      use_tables_system: useTablesSystem,
      require_wifi_for_attendance: requireWifiForAttendance,
      wifi_ssid_name: wifiSsidName || null,
      wifi_ip_range: wifiIpRange || null,
      wifi_public_ip: wifiPublicIp || null,
      language: selectedLanguage,
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
      setUseTablesSystem(settings.use_tables_system ?? true);
      setRequireWifiForAttendance((settings as any).require_wifi_for_attendance ?? false);
      setWifiSsidName((settings as any).wifi_ssid_name || "");
      setWifiIpRange((settings as any).wifi_ip_range || "");
      setWifiPublicIp((settings as any).wifi_public_ip || "");
      setSelectedLanguage(((settings as any).language as Language) || "fr");
    }
  };

  const handleDetectNetwork = async () => {
    setIsDetectingNetwork(true);
    setDetectedIp(null);
    try {
      const wifiStatus = await detectWifiConnection();
      if (wifiStatus.ipAddress) {
        const ipParts = wifiStatus.ipAddress.split('.');
        if (ipParts.length >= 3) {
          const ipRange = ipParts.slice(0, 3).join('.');
          setWifiIpRange(ipRange);
          setDetectedIp(wifiStatus.ipAddress);
          toast.success(`${t("settings.networkDetected")} ${wifiStatus.ipAddress}`);
        }
      } else {
        toast.error(t("settings.saveFailed"));
      }
    } catch (error) {
      console.error("Network detection error:", error);
      toast.error(t("settings.saveFailed"));
    } finally {
      setIsDetectingNetwork(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>;
  }

  return <div className="space-y-6 pb-24 px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.language")}
          </CardTitle>
          <CardDescription>{t("settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedLanguage}
            onValueChange={(val) => setSelectedLanguage(val as Language)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <Label
              htmlFor="lang-fr"
              className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedLanguage === 'fr' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="fr" id="lang-fr" />
              <div>
                <p className="font-medium">🇫🇷 Français</p>
                <p className="text-xs text-muted-foreground">French</p>
              </div>
            </Label>
            <Label
              htmlFor="lang-en"
              className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedLanguage === 'en' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="en" id="lang-en" />
              <div>
                <p className="font-medium">🇬🇧 English</p>
                <p className="text-xs text-muted-foreground">English</p>
              </div>
            </Label>
            <Label
              htmlFor="lang-ar"
              className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedLanguage === 'ar' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="ar" id="lang-ar" />
              <div>
                <p className="font-medium">🇲🇦 الدارجة المغربية</p>
                <p className="text-xs text-muted-foreground">Moroccan Darija</p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.logos")}</CardTitle>
          <CardDescription>{t("settings.logosDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <LogoUpload label={t("settings.adminLogo")} currentUrl={adminLogoUrl} onChange={setAdminLogoUrl} bucketPath="admin-logo" />
            <LogoUpload label={t("settings.loginLogo")} currentUrl={loginLogoUrl} onChange={setLoginLogoUrl} bucketPath="login-logo" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.restaurantName")}</CardTitle>
          <CardDescription>{t("settings.restaurantNameDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restaurant-name">{t("settings.restaurantName")}</Label>
            <Input id="restaurant-name" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="RestaurantPro" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.posConfig")}</CardTitle>
          <CardDescription>{t("settings.posConfigDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="use-tables">{t("settings.useTablesSystem")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.useTablesSystemDesc")}
              </p>
            </div>
            <Switch
              id="use-tables"
              checked={useTablesSystem}
              onCheckedChange={setUseTablesSystem}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            {t("settings.wifiConfig")}
          </CardTitle>
          <CardDescription>
            {t("settings.wifiConfigDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-wifi">{t("settings.requireWifi")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.requireWifiDesc")}
              </p>
            </div>
            <Switch
              id="require-wifi"
              checked={requireWifiForAttendance}
              onCheckedChange={setRequireWifiForAttendance}
            />
          </div>

          {requireWifiForAttendance && (
            <div className="space-y-4 pt-4 border-t">
              <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t("settings.autoDetect")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.autoDetectDesc")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDetectNetwork}
                    disabled={isDetectingNetwork}
                    className="w-full sm:w-auto"
                  >
                    {isDetectingNetwork ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("settings.detecting")}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        {t("settings.detectNetwork")}
                      </>
                    )}
                  </Button>
                </div>
                {detectedIp && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("settings.networkDetected")} {detectedIp}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi-name">{t("settings.wifiName")}</Label>
                <Input
                  id="wifi-name"
                  value={wifiSsidName}
                  onChange={(e) => setWifiSsidName(e.target.value)}
                  placeholder={t("settings.wifiNamePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.wifiNameDesc")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi-ip-range">{t("settings.ipRange")}</Label>
                <Input
                  id="wifi-ip-range"
                  value={wifiIpRange}
                  onChange={(e) => setWifiIpRange(e.target.value)}
                  placeholder={t("settings.ipRangePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.ipRangeDesc")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi-public-ip">{t("settings.publicIp")}</Label>
                <Input
                  id="wifi-public-ip"
                  value={wifiPublicIp}
                  onChange={(e) => setWifiPublicIp(e.target.value)}
                  placeholder={t("settings.publicIpPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.publicIpDesc")}
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">{t("settings.howToFindIp")}</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>{t("settings.ipStep1")}</li>
                    <li>{t("settings.ipStep2")}</li>
                    <li>{t("settings.ipStep3")}</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.systemColors")}</CardTitle>
          <CardDescription>{t("settings.systemColorsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ColorPicker label={t("settings.primaryColor")} value={primaryColor} onChange={setPrimaryColor} />
            <ColorPicker label={t("settings.secondaryColor")} value={secondaryColor} onChange={setSecondaryColor} />
            <ColorPicker label={t("settings.backgroundColor")} value={backgroundColor} onChange={setBackgroundColor} />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">{t("settings.preview")}</h4>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="h-20 rounded-lg border" style={{ backgroundColor: primaryColor }}>
                <p className="text-center text-white text-sm font-medium pt-8">{t("settings.primary")}</p>
              </div>
              <div className="h-20 rounded-lg border" style={{ backgroundColor: secondaryColor }}>
                <p className="text-center text-white text-sm font-medium pt-8">{t("settings.secondary")}</p>
              </div>
              <div className="h-20 rounded-lg border" style={{ backgroundColor: backgroundColor }}>
                <p className="text-center text-foreground text-sm font-medium pt-8">{t("settings.background")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isDirty && <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
            <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending} className="w-full sm:w-auto">
              {t("settings.cancel")}
            </Button>
            <Button onClick={handleSaveAll} disabled={updateMutation.isPending || !settings} className="w-full sm:w-auto">
              {updateMutation.isPending ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </div>
        </div>}
    </div>;
}
