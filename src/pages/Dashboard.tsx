import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyReportExport } from "@/components/DailyReportExport";

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  totalSalesValue: number;
  totalPurchasesValue: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    current_stock: number;
    low_stock_threshold: number;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStock: 0,
    totalSalesValue: 0,
    totalPurchasesValue: 0,
    lowStockProducts: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const [productsRes, salesRes, purchasesRes] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("sales").select("total_price"),
      supabase.from("purchases").select("total_cost"),
    ]);

    if (productsRes.data) {
      const totalStock = productsRes.data.reduce((sum, p) => sum + p.current_stock, 0);
      const lowStock = productsRes.data.filter(
        (p) => p.current_stock <= p.low_stock_threshold
      );

      const totalSales = salesRes.data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      const totalPurchases =
        purchasesRes.data?.reduce((sum, p) => sum + Number(p.total_cost), 0) || 0;

      setStats({
        totalProducts: productsRes.data.length,
        totalStock,
        totalSalesValue: totalSales,
        totalPurchasesValue: totalPurchases,
        lowStockProducts: lowStock,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre inventaire</p>
        </div>
        <DailyReportExport />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Produits"
          value={stats.totalProducts}
          icon={Package}
        />
        <StatCard
          title="Total Stock"
          value={stats.totalStock}
          icon={Package}
        />
        <StatCard
          title="Total Ventes"
          value={`${stats.totalSalesValue.toFixed(2)} DH`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Total Achats"
          value={`${stats.totalPurchasesValue.toFixed(2)} DH`}
          icon={TrendingUp}
        />
      </div>

      {stats.lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertes Stock Faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock actuel: {product.current_stock} unités
                    </p>
                  </div>
                  <Badge variant="destructive">Stock Faible</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
