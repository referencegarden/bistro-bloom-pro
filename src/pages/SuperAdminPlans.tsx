import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface PlanFeature {
  id: string;
  feature_key: string;
  feature_name: string;
  feature_description: string | null;
  plan_type: string;
  is_enabled: boolean;
}

const PLAN_TYPES = ["basic", "pro", "enterprise"] as const;

export default function SuperAdminPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activePlan, setActivePlan] = useState<string>("basic");

  const { data: features, isLoading } = useQuery({
    queryKey: ["plan-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .order("feature_name");

      if (error) throw error;
      return data as PlanFeature[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("plan_features")
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-features"] });
      toast({
        title: "Succès",
        description: "Fonctionnalité mise à jour",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (id: string, currentValue: boolean) => {
    toggleMutation.mutate({ id, is_enabled: !currentValue });
  };

  const getFeaturesByPlan = (planType: string) => {
    return features?.filter((f) => f.plan_type === planType) || [];
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "basic":
        return "bg-gray-100 text-gray-800";
      case "pro":
        return "bg-blue-100 text-blue-800";
      case "enterprise":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestion des Plans</h2>
        <p className="text-muted-foreground">
          Configurez les fonctionnalités disponibles pour chaque type d'abonnement
        </p>
      </div>

      <Tabs value={activePlan} onValueChange={setActivePlan}>
        <TabsList className="grid w-full grid-cols-3">
          {PLAN_TYPES.map((plan) => (
            <TabsTrigger key={plan} value={plan} className="capitalize">
              {plan}
            </TabsTrigger>
          ))}
        </TabsList>

        {PLAN_TYPES.map((plan) => (
          <TabsContent key={plan} value={plan}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={getPlanColor(plan)}>{plan.toUpperCase()}</Badge>
                  <span>Fonctionnalités</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fonctionnalité</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Activée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFeaturesByPlan(plan).map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium">
                          {feature.feature_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {feature.feature_description || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={feature.is_enabled}
                            onCheckedChange={() =>
                              handleToggle(feature.id, feature.is_enabled)
                            }
                            disabled={toggleMutation.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {getFeaturesByPlan(plan).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Aucune fonctionnalité configurée pour ce plan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé des Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_TYPES.map((plan) => {
              const planFeatures = getFeaturesByPlan(plan);
              const enabledCount = planFeatures.filter((f) => f.is_enabled).length;
              return (
                <div
                  key={plan}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getPlanColor(plan)}>{plan.toUpperCase()}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {enabledCount}/{planFeatures.length} actives
                    </span>
                  </div>
                  <div className="space-y-1">
                    {planFeatures
                      .filter((f) => f.is_enabled)
                      .slice(0, 5)
                      .map((f) => (
                        <div
                          key={f.id}
                          className="text-sm flex items-center gap-1"
                        >
                          <span className="text-green-500">✓</span>
                          {f.feature_name}
                        </div>
                      ))}
                    {enabledCount > 5 && (
                      <div className="text-sm text-muted-foreground">
                        +{enabledCount - 5} autres...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
