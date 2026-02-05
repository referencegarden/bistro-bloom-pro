import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, Crown, Gem, Loader2 } from "lucide-react";

interface PlanFeature {
  id: string;
  plan_type: string;
  feature_key: string;
  feature_name: string;
  feature_description: string | null;
  is_enabled: boolean;
}

const planIcons = {
  basic: Package,
  pro: Crown,
  enterprise: Gem,
};

const planColors = {
  basic: "bg-secondary",
  pro: "bg-primary",
  enterprise: "bg-amber-500",
};

const planNames = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function SuperAdminPlans() {
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .order("feature_key");

      if (error) throw error;
      setFeatures(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des fonctionnalités");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (feature: PlanFeature) => {
    setUpdating(feature.id);
    try {
      const { error } = await supabase
        .from("plan_features")
        .update({ is_enabled: !feature.is_enabled })
        .eq("id", feature.id);

      if (error) throw error;

      setFeatures((prev) =>
        prev.map((f) =>
          f.id === feature.id ? { ...f, is_enabled: !f.is_enabled } : f
        )
      );

      toast.success(
        `${feature.feature_name} ${!feature.is_enabled ? "activé" : "désactivé"} pour le plan ${planNames[feature.plan_type as keyof typeof planNames]}`
      );
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    } finally {
      setUpdating(null);
    }
  };

  const getFeaturesByPlan = (planType: string) => {
    return features.filter((f) => f.plan_type === planType);
  };

  const countEnabledFeatures = (planType: string) => {
    return features.filter((f) => f.plan_type === planType && f.is_enabled).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestion des Plans</h2>
        <p className="text-muted-foreground">
          Configurez les fonctionnalités disponibles pour chaque plan d'abonnement
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {(["basic", "pro", "enterprise"] as const).map((plan) => {
            const Icon = planIcons[plan];
            return (
              <TabsTrigger key={plan} value={plan} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{planNames[plan]}</span>
                <Badge variant="secondary" className="ml-1">
                  {countEnabledFeatures(plan)}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(["basic", "pro", "enterprise"] as const).map((plan) => {
          const Icon = planIcons[plan];
          const planFeatures = getFeaturesByPlan(plan);

          return (
            <TabsContent key={plan} value={plan}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${planColors[plan]} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Plan {planNames[plan]}</CardTitle>
                      <CardDescription>
                        {countEnabledFeatures(plan)} fonctionnalités activées sur{" "}
                        {planFeatures.length}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {planFeatures.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <Label
                            htmlFor={feature.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {feature.feature_name}
                          </Label>
                          {feature.feature_description && (
                            <p className="text-xs text-muted-foreground">
                              {feature.feature_description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {updating === feature.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          <Switch
                            id={feature.id}
                            checked={feature.is_enabled}
                            onCheckedChange={() => toggleFeature(feature)}
                            disabled={updating !== null}
                          />
                        </div>
                      </div>
                    ))}

                    {planFeatures.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucune fonctionnalité configurée pour ce plan
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
