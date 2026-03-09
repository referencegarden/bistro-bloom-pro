import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, ClipboardList, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReportExport } from "@/components/ReportExport";
import { PurchasesChart, StockByCategoryChart } from "@/components/DashboardCharts";
import { useNavigate, useParams } from "react-router-dom";
import { format, subDays } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

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
  purchasesByDay: { date: string; total: number }[];
  stockByCategory: { name: string; value: number }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    totalPurchases: 0,
    dailyPurchases: 0,
    totalStockValue: 0,
    lowStockProducts: [],
    pendingDemands: 0,
    inStockDemands: 0,
    purchasesByDay: [],
    stockByCategory: [],
  });
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(stats.lowStockProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = stats.lowStockProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const dateLocale = language === "ar" ? ar : language === "en" ? enUS : fr;

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
    const sevenDaysAgo = subDays(today, 6);

    const [productsRes, salesRes, purchasesRes, dailyPurchasesRes, demandsRes, menuSalesRes, weekPurchasesRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("id, name, current_stock, cost_price, low_stock_threshold, category_id"),
      supabase.from("sales").select("total_price"),
      supabase.from("purchases").select("total_cost"),
      supabase.from("purchases").select("total_cost").gte("purchase_date", today.toISOString()).lt("purchase_date", tomorrow.toISOString()),
      supabase.from("product_demands").select("status"),
      supabase.from("menu_item_sales").select("total_price"),
      supabase.from("purchases").select("total_cost, purchase_date").gte("purchase_date", sevenDaysAgo.toISOString()),
      supabase.from("categories").select("id, name"),
    ]);

    const productSalesTotal = salesRes.data?.reduce((sum, s: any) => sum + Number(s.total_price), 0) || 0;
    const menuSalesTotal = menuSalesRes.data?.reduce((sum, s: any) => sum + Number(s.total_price), 0) || 0;
    const salesTotal = productSalesTotal + menuSalesTotal;
    const purchasesTotal = purchasesRes.data?.reduce((sum, p: any) => sum + Number(p.total_cost), 0) || 0;
    const dailyPurchasesTotal = dailyPurchasesRes.data?.reduce((sum, p: any) => sum + Number(p.total_cost), 0) || 0;
    const stockValue = productsRes.data?.reduce((sum, p: any) => sum + p.current_stock * Number(p.cost_price), 0) || 0;

    const lowStockDetails = (productsRes.data || [])
      .filter((p: any) => p.current_stock <= p.low_stock_threshold)
      .map((p: any) => ({ id: p.id, name: p.name, current_stock: p.current_stock, low_stock_threshold: p.low_stock_threshold }));

    const pendingDemands = (demandsRes.data || []).filter((d: any) => d.status === "pending").length;
    const inStockDemands = (demandsRes.data || []).filter((d: any) => d.status === "in_stock").length;

    const dayMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = subDays(today, 6 - i);
      dayMap[format(d, "dd/MM")] = 0;
    }
    (weekPurchasesRes.data || []).forEach((p: any) => {
      const key = format(new Date(p.purchase_date), "dd/MM");
      if (key in dayMap) dayMap[key] += Number(p.total_cost);
    });
    const purchasesByDay = Object.entries(dayMap).map(([date, total]) => ({ date, total }));

    const catMap = new Map<string, string>();
    (categoriesRes.data || []).forEach((c: any) => catMap.set(c.id, c.name));
    const catValues: Record<string, number> = {};
    (productsRes.data || []).forEach((p: any) => {
      const catName = p.category_id ? (catMap.get(p.category_id) || "Autre") : "Sans catégorie";
      catValues[catName] = (catValues[catName] || 0) + p.current_stock * Number(p.cost_price);
    });
    const stockByCategory = Object.entries(catValues)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    setStats({
      totalProducts: productsRes.data?.length || 0,
      totalSales: salesTotal,
      totalPurchases: purchasesTotal,
      dailyPurchases: dailyPurchasesTotal,
      totalStockValue: stockValue,
      lowStockProducts: lowStockDetails,
      pendingDemands,
      inStockDemands,
      purchasesByDay,
      stockByCategory,
    });
  }

  const todayFormatted = format(new Date(), "EEEE d MMMM yyyy", { locale: dateLocale });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t("dashboard.title")}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground capitalize">{todayFormatted}</p>
          </div>
        </div>
        <ReportExport />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("dashboard.totalProducts")} value={stats.totalProducts.toString()} icon={Package} variant="emerald" />
        <StatCard title={t("dashboard.totalPurchases")} value={`${stats.totalPurchases.toFixed(2)} DH`} icon={TrendingUp} variant="violet" />
        <StatCard title={t("dashboard.dailyPurchases")} value={`${stats.dailyPurchases.toFixed(2)} DH`} icon={ShoppingCart} variant="amber" />
        <StatCard title={t("dashboard.stockValue")} value={`${stats.totalStockValue.toFixed(2)} DH`} icon={Package} variant="blue" />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card
          className="cursor-pointer group border-l-4 border-l-[hsl(var(--warning))] bg-card transition-all hover:shadow-lg"
          onClick={() => navigate(`/${slug}/demands`)}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("dashboard.pendingOrders")}</p>
                <p className="text-4xl font-bold mt-2 text-foreground">{stats.pendingDemands}</p>
                <p className="text-xs text-[hsl(var(--warning))] font-semibold mt-1 uppercase">{t("dashboard.toProcess")}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--warning)/0.1)] flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-[hsl(var(--warning))]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span>{t("dashboard.manageOrders")}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer group border-l-4 border-l-[hsl(var(--success))] bg-card transition-all hover:shadow-lg"
          onClick={() => navigate(`/${slug}/demands`)}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("dashboard.inStockProducts")}</p>
                <p className="text-4xl font-bold mt-2 text-foreground">{stats.inStockDemands}</p>
                <p className="text-xs text-[hsl(var(--success))] font-semibold mt-1 uppercase">{t("dashboard.optimalLevel")}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--success)/0.1)] flex items-center justify-center">
                <Package className="h-7 w-7 text-[hsl(var(--success))]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span>{t("dashboard.readyToPurchase")}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <PurchasesChart data={stats.purchasesByDay} />
        <StockByCategoryChart data={stats.stockByCategory} />
      </div>

      {/* Low Stock Alerts */}
      {stats.lowStockProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                {t("dashboard.lowStockAlerts")}
                <Badge variant="destructive" className="ml-1 text-xs">
                  {stats.lowStockProducts.length}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {paginatedProducts.map((product) => {
                const ratio = product.low_stock_threshold > 0
                  ? (product.current_stock / product.low_stock_threshold) * 100
                  : 0;
                const severity = ratio <= 25 ? "destructive" : ratio <= 50 ? "warning" : "muted";

                return (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={Math.min(ratio, 100)} className="h-2 flex-1" />
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                          {product.current_stock}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">/ {product.low_stock_threshold}</span>
                      <Badge
                        variant={severity === "destructive" ? "destructive" : "secondary"}
                        className="text-[10px] px-1.5"
                      >
                        {severity === "destructive" ? t("dashboard.critical") : severity === "warning" ? t("dashboard.low") : t("dashboard.alert")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {t("dashboard.previous")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t("dashboard.next")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
