import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface PlanFeature {
  feature_key: string;
  is_enabled: boolean;
}

export function usePlanFeatures() {
  const { tenantId } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["plan-features", tenantId],
    queryFn: async () => {
      if (!tenantId) return { planType: null, features: {} };

      // Get tenant's subscription plan type
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("plan_type")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error("Error fetching subscription:", subError);
        // Default to enterprise (all features) if subscription fetch fails
        return { planType: "enterprise", features: getAllFeaturesEnabled() };
      }

      const planType = subscription?.plan_type || "basic";

      // Get features for the plan
      const { data: planFeatures, error: featuresError } = await supabase
        .from("plan_features")
        .select("feature_key, is_enabled")
        .eq("plan_type", planType);

      if (featuresError) {
        console.error("Error fetching plan features:", featuresError);
        // Default to all features enabled if fetch fails
        return { planType, features: getAllFeaturesEnabled() };
      }

      // Convert to a lookup object
      const features: Record<string, boolean> = {};
      planFeatures?.forEach((f: PlanFeature) => {
        features[f.feature_key] = f.is_enabled;
      });

      return { planType, features };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasFeature = (featureKey: string): boolean => {
    // If still loading or no data, default to allowing access
    if (isLoading || !data?.features) return true;
    // If feature not in list, default to true (backwards compatibility)
    return data.features[featureKey] ?? true;
  };

  return {
    planType: data?.planType || null,
    features: data?.features || {},
    loading: isLoading,
    hasFeature,
  };
}

// Helper function to return all features enabled
function getAllFeaturesEnabled(): Record<string, boolean> {
  return {
    dashboard: true,
    products: true,
    sales: true,
    purchases: true,
    categories: true,
    employees: true,
    attendance: true,
    pos: true,
    pos_reports: true,
    pos_orders: true,
    kitchen_display: true,
    bar_display: true,
    menu_items: true,
    suppliers: true,
    demands: true,
    tables: true,
    settings: true,
  };
}
