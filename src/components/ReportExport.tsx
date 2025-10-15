import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileDown, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ReportExport() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  async function generateReport() {
    // Validate dates
    if (!startDate || !endDate) {
      toast.error("Veuillez sélectionner les dates de début et de fin");
      return;
    }

    if (startDate > endDate) {
      toast.error("La date de début doit être antérieure à la date de fin");
      return;
    }

    try {
      const reportTitle = "Rapport Personnalisé";
      const dateDisplay = `${format(startDate, "dd MMMM yyyy", { locale: fr })} - ${format(endDate, "dd MMMM yyyy", { locale: fr })}`;
      const periodLabel = `Du ${format(startDate, "dd/MM/yyyy", { locale: fr })} au ${format(endDate, "dd/MM/yyyy", { locale: fr })}`;
      const fileName = `custom-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.html`;

      // Set time boundaries for accurate querying
      const queryStartDate = new Date(startDate.setHours(0, 0, 0, 0));
      const queryEndDate = new Date(endDate.setHours(23, 59, 59, 999));

      // Fetch all data for the period
      const [productsRes, salesRes, purchasesRes] = await Promise.all([
        supabase.from("products").select("*, categories(name), suppliers(name)"),
        supabase
          .from("sales")
          .select("*, products(name), employees(name)")
          .gte("sale_date", queryStartDate.toISOString())
          .lte("sale_date", queryEndDate.toISOString()),
        supabase
          .from("purchases")
          .select("*, products(name), suppliers(name)")
          .gte("purchase_date", queryStartDate.toISOString())
          .lte("purchase_date", queryEndDate.toISOString()),
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
      setOpen(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Échec de génération du rapport");
    }
  }

  const handleQuickSelect = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exporter Rapport
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Exporter un Rapport Personnalisé</DialogTitle>
          <DialogDescription>
            Sélectionnez la période pour générer votre rapport
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sélection rapide</label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setStartDate(new Date(today.setHours(0, 0, 0, 0)));
                  setEndDate(new Date());
                }}
              >
                Aujourd'hui
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(7)}
              >
                7 derniers jours
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(30)}
              >
                30 derniers jours
              </Button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de début</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "dd MMMM yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "dd MMMM yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Selected Range Display */}
          {startDate && endDate && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">Période sélectionnée:</p>
              <p className="text-muted-foreground">
                Du {format(startDate, "dd MMMM yyyy", { locale: fr })} au{" "}
                {format(endDate, "dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
          )}

          {/* Generate Button */}
          <Button onClick={generateReport} className="w-full">
            <FileDown className="mr-2 h-4 w-4" />
            Générer le Rapport
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
