import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DailyReportExportProps {
  date?: Date;
}

export function DailyReportExport({ date = new Date() }: DailyReportExportProps) {
  const [showInventory, setShowInventory] = useState(true);
  const [showPurchases, setShowPurchases] = useState(true);
  const [showSales, setShowSales] = useState(true);

  async function generatePDFReport() {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Fetch all data for the day
      const [productsRes, salesRes, purchasesRes] = await Promise.all([
        supabase.from("products").select("*, categories(name), suppliers(name)"),
        supabase
          .from("sales")
          .select("*, products(name), employees(name)")
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
      const dailySalesQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rapport Journalier - ${format(date, "MMMM dd, yyyy")}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 20px; max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1 { color: #ea580c; text-align: center; font-size: 1.8em; }
            h2 { 
              color: #0891b2; 
              margin-top: 30px; 
              cursor: pointer; 
              user-select: none;
              position: relative;
              padding-left: 25px;
            }
            h2:before {
              content: '▼';
              position: absolute;
              left: 0;
              transition: transform 0.3s;
            }
            h2.collapsed:before {
              transform: rotate(-90deg);
            }
            .section-content {
              overflow: hidden;
              transition: max-height 0.3s ease-out;
            }
            .section-content.collapsed {
              max-height: 0 !important;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; overflow-x: auto; display: block; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; white-space: nowrap; }
            th { background-color: #f97316; color: white; position: sticky; top: 0; }
            .summary { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .summary-item { display: flex; justify-content: space-between; margin: 10px 0; flex-wrap: wrap; }
            .summary-label { font-weight: bold; }
            .summary-value { color: #0891b2; font-size: 1.1em; }
            
            @media (max-width: 768px) {
              body { padding: 10px; }
              h1 { font-size: 1.5em; }
              h2 { font-size: 1.2em; }
              th, td { padding: 6px; font-size: 0.9em; }
              .summary { padding: 10px; }
              .summary-item { flex-direction: column; }
              .summary-value { margin-top: 5px; }
            }
            
            @media print {
              h2:before { content: ''; }
              .section-content { max-height: none !important; }
            }
          </style>
          <script>
            function toggleSection(headerId) {
              const header = document.getElementById(headerId);
              const content = header.nextElementSibling;
              header.classList.toggle('collapsed');
              content.classList.toggle('collapsed');
              if (content.classList.contains('collapsed')) {
                content.style.maxHeight = '0';
              } else {
                content.style.maxHeight = content.scrollHeight + 'px';
              }
            }
            window.onload = function() {
              document.querySelectorAll('.section-content').forEach(el => {
                el.style.maxHeight = el.scrollHeight + 'px';
              });
            };
          </script>
        </head>
        <body>
          <h1>RestaurantPro - Rapport Journalier</h1>
          <p style="text-align: center; color: #666;">${format(date, "MMMM dd, yyyy")}</p>
          
          <div class="summary">
            <h2>Résumé</h2>
            <div class="summary-item">
              <span class="summary-label">Valeur Totale de l'Inventaire:</span>
              <span class="summary-value">${inventoryValue.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Sorties de Stock (Aujourd'hui):</span>
              <span class="summary-value">${dailySalesQuantity} unités</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Achats (Aujourd'hui):</span>
              <span class="summary-value">${dailyPurchases.toFixed(2)} DH</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Produits:</span>
              <span class="summary-value">${products.length}</span>
            </div>
          </div>

          ${
            showInventory
              ? `
          <h2 id="inventory-header" onclick="toggleSection('inventory-header')">Inventaire Actuel</h2>
          <div class="section-content">
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
          </div>
          `
              : ""
          }

          ${
            showSales && sales.length > 0
              ? `
          <h2 id="sales-header" onclick="toggleSection('sales-header')">Sorties de Stock du Jour</h2>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>Produit</th>
                  <th>Employé</th>
                  <th>Quantité</th>
                </tr>
              </thead>
              <tbody>
                ${sales
                  .map(
                    (s: any) => `
                  <tr>
                    <td>${format(new Date(s.sale_date), "HH:mm")}</td>
                    <td>${s.products?.name || "N/A"}</td>
                    <td>${s.employees?.name || "-"}</td>
                    <td>${s.quantity}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          ${
            showPurchases && purchases.length > 0
              ? `
          <h2 id="purchases-header" onclick="toggleSection('purchases-header')">Achats du Jour</h2>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>Heure</th>
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
          </div>
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exporter Rapport Journalier
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Options d'export</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-inventory"
                checked={showInventory}
                onCheckedChange={(checked) => setShowInventory(checked as boolean)}
              />
              <Label htmlFor="show-inventory" className="text-sm cursor-pointer">
                Inventaire Actuel
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-purchases"
                checked={showPurchases}
                onCheckedChange={(checked) => setShowPurchases(checked as boolean)}
              />
              <Label htmlFor="show-purchases" className="text-sm cursor-pointer">
                Achats du Jour
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-sales"
                checked={showSales}
                onCheckedChange={(checked) => setShowSales(checked as boolean)}
              />
              <Label htmlFor="show-sales" className="text-sm cursor-pointer">
                Sorties de Stock
              </Label>
            </div>
          </div>
          <Button onClick={generatePDFReport} className="w-full">
            Générer Rapport
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
