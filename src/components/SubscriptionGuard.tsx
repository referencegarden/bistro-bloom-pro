import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [subscriptionValid, setSubscriptionValid] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

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

        if (tenantError) throw tenantError;

        if (!tenant) {
          setSubscriptionValid(false);
          setLoading(false);
          return;
        }

        const subscription = tenant.subscriptions?.[0];
        setSubscriptionData({ tenant, subscription });

        // Check if tenant is active and has valid subscription
        if (!tenant.is_active) {
          setSubscriptionValid(false);
          setLoading(false);
          return;
        }

        if (!subscription) {
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
      } catch (error) {
        console.error("Error checking subscription:", error);
        setSubscriptionValid(false);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [tenantId]);

  const handleSignOut = async () => {
    const slug = localStorage.getItem('current_tenant_slug') || 'default-restaurant';
    await supabase.auth.signOut({ scope: 'local' });
    localStorage.clear();
    navigate(`/${slug}/auth`);
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
              {isSuspended ? "Abonnement Suspendu" : "Abonnement Expiré"}
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
              <p className="text-sm">
                Plan: <strong>{subscription?.plan_type || 'N/A'}</strong>
              </p>
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
