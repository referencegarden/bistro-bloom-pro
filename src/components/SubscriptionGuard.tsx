import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [subscriptionValid, setSubscriptionValid] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSubscription() {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch tenant and subscription data
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select(`
            *,
            subscriptions (
              id,
              status,
              plan_type,
              end_date
            )
          `)
          .eq("id", tenantId)
          .maybeSingle();

        if (tenantError) {
          console.error("Tenant fetch error:", tenantError);
          // If RLS blocks access, the user might not have permission
          // Don't block access - let them through to their permitted routes
          if (tenantError.code === 'PGRST116' || tenantError.message?.includes('permission')) {
            setSubscriptionValid(true);
            setLoading(false);
            return;
          }
          throw tenantError;
        }

        if (!tenant) {
          setSubscriptionValid(false);
          setAccessError("Restaurant non trouvé");
          setLoading(false);
          return;
        }

        const subscription = Array.isArray(tenant.subscriptions) && tenant.subscriptions.length > 0
          ? tenant.subscriptions[0]
          : null;

        setSubscriptionData({ tenant, subscription });

        // Check if tenant is active
        if (!tenant.is_active) {
          setSubscriptionValid(false);
          setLoading(false);
          return;
        }

        // If no subscription found but tenant is active, allow access
        // This handles cases where RLS might block subscription read for employees
        if (!subscription) {
          // Check if we can at least verify the tenant is active
          if (tenant.is_active) {
            setSubscriptionValid(true);
            setLoading(false);
            return;
          }
          setSubscriptionValid(false);
          setLoading(false);
          return;
        }

        // Check subscription status
        if (subscription.status === 'expired' || subscription.status === 'suspended') {
          setSubscriptionValid(false);
          setLoading(false);
          return;
        }

        // Check if end date has passed
        if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
          setSubscriptionValid(false);
          setLoading(false);
          return;
        }

        setSubscriptionValid(true);
      } catch (error: any) {
        console.error("Error checking subscription:", error);
        // On error, don't block access - let permission checks handle it
        // This prevents employees from being blocked due to RLS restrictions
        setSubscriptionValid(true);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [tenantId]);

  const handleSignOut = async () => {
    const storedSlug = localStorage.getItem('current_tenant_slug') || slug || 'default-restaurant';
    await supabase.auth.signOut({ scope: 'local' });
    localStorage.clear();
    navigate(`/${storedSlug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Vérification de l'abonnement...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionValid) {
    const subscription = subscriptionData?.subscription;
    const isExpired = subscription?.status === 'expired' || (subscription?.end_date && new Date(subscription.end_date) < new Date());
    const isSuspended = subscription?.status === 'suspended';

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-lg font-semibold">
              {accessError || (isSuspended ? "Abonnement Suspendu" : "Abonnement Expiré")}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              {isExpired && (
                <p>
                  Votre abonnement a expiré le{" "}
                  {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('fr-FR') : 'date inconnue'}.
                </p>
              )}
              {isSuspended && (
                <p>
                  Votre abonnement a été suspendu. Veuillez contacter l'administrateur.
                </p>
              )}
              {!subscription && !accessError && (
                <p>
                  Aucun abonnement actif trouvé pour ce restaurant.
                </p>
              )}
              {subscription && (
                <p className="text-sm">
                  Plan: <strong>{subscription?.plan_type || 'N/A'}</strong>
                </p>
              )}
              <p className="mt-4">
                Pour renouveler votre abonnement, veuillez contacter l'administrateur du système.
              </p>
            </AlertDescription>
          </Alert>
          <Button onClick={handleSignOut} className="w-full" variant="outline">
            Retour à la page de connexion
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
