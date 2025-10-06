import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface DailyReportExportProps {
  date?: Date;
}

export function DailyReportExport({ date = new Date() }: DailyReportExportProps) {
  async function generatePDFReport() {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Fetch all data for the day
      const [productsRes, salesRes, purchasesRes] = await Promise.all([
        supabase.from("products").select("*, categories(name), suppliers(name)"),
        supabase
          .from("sales")
          .select("*, products(name)")
          .gte("sale_date", `${dateStr}T00:00:00`)
          .lte("sale_date", `${dateStr}T23:59:59`),
        supabase
          .from("purchases")
          .select("*, products(name), suppliers(name)")
          .gte("purchase_date", `${dateStr}T00:00:00`)
          .lte("purchase_date", `${dateStr}T23:59:59`),
      ]);

      if (productsRes.error || salesRes.error || purchasesRes.error) {
        toast.error("Failed to fetch report data");
        return;
      }

      const products = productsRes.data || [];
      const sales = salesRes.data || [];
      const purchases = purchasesRes.data || [];

      // Calculate inventory value
      const inventoryValue = products.reduce(
        (sum, p) => sum + p.current_stock * p.cost_price,
        0
      );

      // Calculate daily sales and purchases
      const dailySales = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
      const dailyPurchases = purchases.reduce(
        (sum, p) => sum + Number(p.total_cost || 0),
        0
      );

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Daily Report - ${format(date, "MMMM dd, yyyy")}</title>
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
          <h1>RestaurantPro - Daily Report</h1>
          <p style="text-align: center; color: #666;">${format(date, "MMMM dd, yyyy")}</p>
          
          <div class="summary">
            <h2>Summary</h2>
            <div class="summary-item">
              <span class="summary-label">Total Inventory Value:</span>
              <span class="summary-value">${inventoryValue.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Sales (Today):</span>
              <span class="summary-value">${dailySales.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Purchases (Today):</span>
              <span class="summary-value">${dailyPurchases.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Products:</span>
              <span class="summary-value">${products.length}</span>
            </div>
          </div>

          <h2>Current Inventory</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Cost Price</th>
                <th>Sales Price</th>
                <th>Inventory Value</th>
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
          <h2>Today's Sales</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sales
                .map(
                  (s) => `
                <tr>
                  <td>${format(new Date(s.sale_date), "HH:mm")}</td>
                  <td>${s.products?.name || "N/A"}</td>
                  <td>${s.quantity}</td>
                  <td>${s.unit_price.toFixed(2)} DH</td>
                  <td>${s.total_price?.toFixed(2) || "0.00"} DH</td>
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
          <h2>Today's Purchases</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Product</th>
                <th>Supplier</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${purchases
                .map(
                  (p) => `
                <tr>
                  <td>${format(new Date(p.purchase_date), "HH:mm")}</td>
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

      // Create blob and download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-report-${dateStr}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    }
  }

  return (
    <Button onClick={generatePDFReport} variant="outline">
      <FileDown className="mr-2 h-4 w-4" />
      Exporter Rapport Journalier
    </Button>
  );
}
