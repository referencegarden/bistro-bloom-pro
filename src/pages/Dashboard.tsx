import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportExport } from "@/components/ReportExport";
import { useNavigate, useParams } from "react-router-dom";

interface DashboardStats {
  totalProducts: number;
  totalSales: number;
  totalPurchases: number;
  dailyPurchases: number;
  totalStockValue: number;
  lowStockProducts: {
    id: string;
    name: string;
    current_stock: number;
    low_stock_threshold: number;
  }[];
  pendingDemands: number;
  inStockDemands: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    totalPurchases: 0,
    dailyPurchases: 0,
    totalStockValue: 0,
    lowStockProducts: [],
    pendingDemands: 0,
    inStockDemands: 0,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [productsRes, salesRes, purchasesRes, dailyPurchasesRes, demandsRes, menuSalesRes] = await Promise.all([
      supabase.from("products").select("id, name, current_stock, cost_price, low_stock_threshold"),
      supabase.from("sales").select("total_price"),
      supabase.from("purchases").select("total_cost"),
      supabase
        .from("purchases")
        .select("total_cost")
        .gte("purchase_date", today.toISOString())
        .lt("purchase_date", tomorrow.toISOString()),
      supabase.from("product_demands").select("status"),
      supabase.from("menu_item_sales").select("total_price"),
    ]);

    const productSalesTotal =
      salesRes.data?.reduce((sum, sale: any) => sum + Number(sale.total_price), 0) || 0;
    
    const menuSalesTotal =
      menuSalesRes.data?.reduce((sum, sale: any) => sum + Number(sale.total_price), 0) || 0;
    
    const salesTotal = productSalesTotal + menuSalesTotal;

    const purchasesTotal =
      purchasesRes.data?.reduce((sum, purchase: any) => sum + Number(purchase.total_cost), 0) ||
      0;

    const dailyPurchasesTotal =
      dailyPurchasesRes.data?.reduce((sum, purchase: any) => sum + Number(purchase.total_cost), 0) ||
      0;

    const stockValue =
      productsRes.data?.reduce(
        (sum, product: any) =>
          sum + product.current_stock * Number(product.cost_price),
        0
      ) || 0;

    // Filter low stock products client-side (compare column values)
    const lowStockDetails = (productsRes.data || [])
      .filter((p: any) => p.current_stock <= p.low_stock_threshold)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        current_stock: p.current_stock,
        low_stock_threshold: p.low_stock_threshold,
      }));

    const pendingDemands = (demandsRes.data || []).filter((d: any) => d.status === 'pending').length;
    const inStockDemands = (demandsRes.data || []).filter((d: any) => d.status === 'in_stock').length;

    setStats({
      totalProducts: productsRes.data?.length || 0,
      totalSales: salesTotal,
      totalPurchases: purchasesTotal,
      dailyPurchases: dailyPurchasesTotal,
      totalStockValue: stockValue,
      lowStockProducts: lowStockDetails,
      pendingDemands,
      inStockDemands,
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre inventaire</p>
        </div>
        <ReportExport />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produits Totaux"
          value={stats.totalProducts.toString()}
          icon={Package}
        />
        <StatCard
          title="Achats Totaux"
          value={`${stats.totalPurchases.toFixed(2)} DH`}
          icon={TrendingUp}
        />
        <StatCard
          title="Achats du Jour"
          value={`${stats.dailyPurchases.toFixed(2)} DH`}
          icon={TrendingUp}
        />
        <StatCard
          title="Valeur Totale du Stock"
          value={`${stats.totalStockValue.toFixed(2)} DH`}
          icon={Package}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate(`/${slug}/demands`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes en Attente</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDemands}</div>
            <p className="text-xs text-muted-foreground">
              Cliquez pour gérer les commandes
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate(`/${slug}/demands`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits en Stock</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inStockDemands}</div>
            <p className="text-xs text-muted-foreground">
              Prêts pour l'achat
            </p>
          </CardContent>
        </Card>
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
