import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, TrendingUp, DollarSign, ShoppingCart, Award } from "lucide-react";
import * as XLSX from "xlsx";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface SalesReportItem {
  menu_item_id: string;
  menu_item_name: string;
  menu_item_category: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
  sales_percentage: number;
  rank: number;
}

export default function POSReports() {
  const [reportData, setReportData] = useState<SalesReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));

  useEffect(() => {
    updateDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const updateDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "today":
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case "week":
        setStartDate(startOfDay(subDays(now, 7)));
        setEndDate(endOfDay(now));
        break;
      case "month":
        setStartDate(startOfDay(subDays(now, 30)));
        setEndDate(endOfDay(now));
        break;
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_pos_sales_report", {
        _start_date: startDate.toISOString(),
        _end_date: endDate.toISOString(),
      });

      if (error) throw error;
      setReportData(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement du rapport");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      reportData.map((item) => ({
        Rang: item.rank,
        "Nom du Produit": item.menu_item_name,
        Catégorie: item.menu_item_category || "-",
        "Quantité Vendue": item.total_quantity,
        "Revenu Total (DH)": item.total_revenue.toFixed(2),
        "Nombre de Commandes": item.order_count,
        "Valeur Moyenne (DH)": item.avg_order_value.toFixed(2),
        "% des Ventes": item.sales_percentage.toFixed(2) + "%",
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport POS");
    XLSX.writeFile(wb, `Rapport_POS_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Rapport exporté avec succès");
  };

  const totalRevenue = reportData.reduce((sum, item) => sum + item.total_revenue, 0);
  const totalOrders = reportData.reduce((sum, item) => sum + item.order_count, 0);
  const topProduct = reportData[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Rapports POS</h1>
          <p className="text-muted-foreground">Analyse des ventes et produits populaires</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} DH</div>
            <p className="text-xs text-muted-foreground">
              {format(startDate, "dd/MM")} - {format(endDate, "dd/MM")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">Commandes confirmées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produit #1</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{topProduct?.menu_item_name || "-"}</div>
            <p className="text-xs text-muted-foreground">
              {topProduct?.total_quantity || 0} vendus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"} DH
            </div>
            <p className="text-xs text-muted-foreground">Par commande</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Classement des Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rang</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Revenu</TableHead>
                  <TableHead className="text-right">Commandes</TableHead>
                  <TableHead className="text-right">% Ventes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucune vente trouvée pour cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((item) => (
                    <TableRow key={item.menu_item_id}>
                      <TableCell className="font-bold">#{item.rank}</TableCell>
                      <TableCell className="font-medium">{item.menu_item_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.menu_item_category || "-"}
                      </TableCell>
                      <TableCell className="text-right">{item.total_quantity}</TableCell>
                      <TableCell className="text-right">{item.total_revenue.toFixed(2)} DH</TableCell>
                      <TableCell className="text-right">{item.order_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(item.sales_percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{item.sales_percentage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
