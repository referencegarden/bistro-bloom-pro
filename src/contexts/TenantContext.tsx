import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TenantContextType {
  tenantSlug: string | null;
  tenantId: string | null;
  tenantName: string | null;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantSlug: null,
  tenantId: null,
  tenantName: null,
  loading: true,
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadTenant(slug);
    } else {
      setLoading(false);
    }
  }, [slug]);

  const loadTenant = async (tenantSlug: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("slug", tenantSlug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        console.error("Tenant not found:", error);
        setTenantId(null);
        setTenantName(null);
      } else {
        setTenantId(data.id);
        setTenantName(data.name);
        localStorage.setItem("tenant_slug", tenantSlug);
        localStorage.setItem("tenant_id", data.id);
      }
    } catch (error) {
      console.error("Error loading tenant:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TenantContext.Provider value={{ tenantSlug: slug || null, tenantId, tenantName, loading }}>
      {children}
    </TenantContext.Provider>
  );
}
