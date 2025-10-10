import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

type ReportType = "daily" | "weekly" | "monthly";

export function ReportExport() {
  async function generateReport(reportType: ReportType) {
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let reportTitle: string;
      let dateDisplay: string;
      let periodLabel: string;
      let fileName: string;

      // Calculate date ranges based on report type
      switch (reportType) {
        case "daily":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          reportTitle = "Rapport Journalier";
          dateDisplay = format(startDate, "dd MMMM yyyy", { locale: fr });
          periodLabel = "Aujourd'hui";
          fileName = `daily-report-${format(startDate, "yyyy-MM-dd")}.html`;
          break;
        case "weekly":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          reportTitle = "Rapport Hebdomadaire";
          dateDisplay = `${format(startDate, "dd MMMM", { locale: fr })} - ${format(endDate, "dd MMMM yyyy", { locale: fr })}`;
          periodLabel = "Cette Semaine";
          fileName = `weekly-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.html`;
          break;
        case "monthly":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          reportTitle = "Rapport Mensuel";
          dateDisplay = format(startDate, "MMMM yyyy", { locale: fr });
          periodLabel = "Ce Mois";
          fileName = `monthly-report-${format(startDate, "yyyy-MM")}.html`;
          break;
      }

      // Fetch all data for the period
      const [productsRes, salesRes, purchasesRes] = await Promise.all([
        supabase.from("products").select("*, categories(name), suppliers(name)"),
        supabase
          .from("sales")
          .select("*, products(name), employees(name)")
          .gte("sale_date", startDate.toISOString())
          .lte("sale_date", endDate.toISOString()),
        supabase
          .from("purchases")
          .select("*, products(name), suppliers(name)")
          .gte("purchase_date", startDate.toISOString())
          .lte("purchase_date", endDate.toISOString()),
      ]);

      if (productsRes.error || salesRes.error || purchasesRes.error) {
        toast.error("Échec de récupération des données");
        return;
      }

      const products = productsRes.data || [];
      const sales = salesRes.data || [];
      const purchases = purchasesRes.data || [];

      // Calculate metrics
      const inventoryValue = products.reduce(
        (sum, p) => sum + p.current_stock * p.cost_price,
        0
      );

      const totalSalesQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);
      const totalSalesValue = sales.reduce(
        (sum, s) => sum + Number(s.total_price || (s.quantity * s.unit_price)),
        0
      );
      const totalPurchases = purchases.reduce(
        (sum, p) => sum + Number(p.total_cost || 0),
        0
      );

      // Create HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>RestaurantPro - ${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #ea580c; text-align: center; }
            h2 { color: #0891b2; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f97316; color: white; }
            .summary { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
            .summary-label { font-weight: bold; }
            .summary-value { color: #0891b2; font-size: 1.1em; }
          </style>
        </head>
        <body>
          <h1>RestaurantPro - ${reportTitle}</h1>
          <p style="text-align: center; color: #666;">${dateDisplay}</p>
          
          <div class="summary">
            <h2>Résumé</h2>
            <div class="summary-item">
              <span class="summary-label">Valeur Totale de l'Inventaire:</span>
              <span class="summary-value">${inventoryValue.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Sorties de Stock (${periodLabel}):</span>
              <span class="summary-value">${totalSalesQuantity} unités</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Valeur Sorties de Stock (${periodLabel}):</span>
              <span class="summary-value">${totalSalesValue.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Achats (${periodLabel}):</span>
              <span class="summary-value">${totalPurchases.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Produits:</span>
              <span class="summary-value">${products.length}</span>
            </div>
          </div>

          <h2>Inventaire Actuel</h2>
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Stock</th>
                <th>Prix de Revient</th>
                <th>Prix de Vente</th>
                <th>Valeur Inventaire</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map(
                  (p) => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.categories?.name || "N/A"}</td>
                  <td>${p.current_stock}</td>
                  <td>${p.cost_price.toFixed(2)} DH</td>
                  <td>${p.sales_price.toFixed(2)} DH</td>
                  <td>${(p.current_stock * p.cost_price).toFixed(2)} DH</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          ${
            sales.length > 0
              ? `
          <h2>Sorties de Stock - ${periodLabel}</h2>
          <table>
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Produit</th>
                <th>Employé</th>
                <th>Quantité</th>
                <th>Prix Unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sales
                .map(
                  (s: any) => `
                <tr>
                  <td>${format(new Date(s.sale_date), "dd/MM/yyyy HH:mm", { locale: fr })}</td>
                  <td>${s.products?.name || "N/A"}</td>
                  <td>${s.employees?.name || "-"}</td>
                  <td>${s.quantity}</td>
                  <td>${Number(s.unit_price || 0).toFixed(2)} DH</td>
                  <td>${Number(s.total_price || 0).toFixed(2)} DH</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          `
              : ""
          }

          ${
            purchases.length > 0
              ? `
          <h2>Achats - ${periodLabel}</h2>
          <table>
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Produit</th>
                <th>Fournisseur</th>
                <th>Quantité</th>
                <th>Coût Unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${purchases
                .map(
                  (p) => `
                <tr>
                  <td>${format(new Date(p.purchase_date), "dd/MM/yyyy HH:mm", { locale: fr })}</td>
                  <td>${p.products?.name || "N/A"}</td>
                  <td>${p.suppliers?.name || "N/A"}</td>
                  <td>${p.quantity}</td>
                  <td>${p.unit_cost.toFixed(2)} DH</td>
                  <td>${p.total_cost?.toFixed(2) || "0.00"} DH</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          `
              : ""
          }
        </body>
        </html>
      `;

      // Download HTML file
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Rapport exporté avec succès");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Échec de génération du rapport");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exporter Rapport
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => generateReport("daily")}>
          <Calendar className="mr-2 h-4 w-4" />
          Rapport Journalier
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generateReport("weekly")}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Rapport Hebdomadaire
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generateReport("monthly")}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Rapport Mensuel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
