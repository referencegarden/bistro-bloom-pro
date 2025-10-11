import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportExport } from "@/components/ReportExport";

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  totalSalesQuantity: number;
  totalSalesValue: number;
  totalPurchasesValue: number;
  totalStockValue: number;
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
    totalSalesQuantity: 0,
    totalSalesValue: 0,
    totalPurchasesValue: 0,
    totalStockValue: 0,
    lowStockProducts: [],
  });
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(stats.lowStockProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = stats.lowStockProducts.slice(startIndex, endIndex);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [stats.lowStockProducts.length]);

  async function loadDashboardData() {
    const [productsRes, salesRes, purchasesRes] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("sales").select("quantity, unit_price, total_price"),
      supabase.from("purchases").select("total_cost"),
    ]);

    if (productsRes.data) {
      const totalStock = productsRes.data.reduce((sum, p) => sum + p.current_stock, 0);
      const totalStockValue = productsRes.data.reduce(
        (sum, p) => sum + (p.current_stock * Number(p.cost_price)), 0
      );
      const lowStock = productsRes.data.filter(
        (p) => p.current_stock <= p.low_stock_threshold
      );

      const totalSalesQty = salesRes.data?.reduce((sum, s) => sum + s.quantity, 0) || 0;
      const totalSalesValue = salesRes.data?.reduce(
        (sum, s) => sum + Number(s.total_price || (s.quantity * s.unit_price)), 0
      ) || 0;
      const totalPurchases =
        purchasesRes.data?.reduce((sum, p) => sum + Number(p.total_cost), 0) || 0;

      setStats({
        totalProducts: productsRes.data.length,
        totalStock,
        totalSalesQuantity: totalSalesQty,
        totalSalesValue,
        totalPurchasesValue: totalPurchases,
        totalStockValue,
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
        <ReportExport />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          title="Valeur Totale Stock"
          value={`${stats.totalStockValue.toFixed(2)} DH`}
          icon={Package}
        />
        <StatCard
          title="Total Sorties de Stock"
          value={`${stats.totalSalesQuantity} unités`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Valeur Sorties de Stock"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <p className="font-medium truncate" title={product.name}>
                    {product.name}
                  </p>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="text-muted-foreground">
                      Stock: <span className="font-semibold text-destructive">{product.current_stock}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Seuil: {product.low_stock_threshold}
                    </p>
                  </div>
                  <Badge variant="destructive" className="w-fit">
                    Alerte
                  </Badge>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
