import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    current_stock: number;
    unit_of_measure?: string;
  } | null;
}

export function StockAdjustmentDialog({ open, onClose, product }: StockAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<"set" | "adjust">("adjust");
  const [newStock, setNewStock] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setNewStock("");
    setAdjustmentAmount("");
    setNotes("");
    setAdjustmentType("adjust");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);

    try {
      let finalStock: number;

      if (adjustmentType === "set") {
        const stockValue = parseFloat(newStock);
        if (isNaN(stockValue) || stockValue < 0) {
          toast.error("Veuillez entrer une quantité valide");
          setLoading(false);
          return;
        }
        finalStock = stockValue;
      } else {
        const adjustment = parseFloat(adjustmentAmount);
        if (isNaN(adjustment)) {
          toast.error("Veuillez entrer un ajustement valide");
          setLoading(false);
          return;
        }
        finalStock = product.current_stock + adjustment;
        
        if (finalStock < 0) {
          toast.error("Le stock ne peut pas être négatif");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("products")
        .update({ current_stock: finalStock })
        .eq("id", product.id);

      if (error) throw error;

      toast.success("Stock mis à jour avec succès");
      handleClose();
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Échec de la mise à jour du stock");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const previewStock = adjustmentType === "set" 
    ? parseFloat(newStock) || 0
    : product.current_stock + (parseFloat(adjustmentAmount) || 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajuster le Stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Produit:</span>
              <span className="text-sm">{product.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Stock Actuel:</span>
              <span className="text-sm font-bold">
                {product.current_stock} {product.unit_of_measure || "unité"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as "set" | "adjust")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="adjust">Ajustement</TabsTrigger>
                <TabsTrigger value="set">Définir Stock</TabsTrigger>
              </TabsList>

              <TabsContent value="adjust" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment">Ajustement (+/-)</Label>
              <Input
                id="adjustment"
                type="number"
                step="0.01"
                placeholder="Ex: +10 ou -5"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                required
              />
                  <p className="text-xs text-muted-foreground">
                    Entrez un nombre positif pour ajouter ou négatif pour retirer
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="set" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newStock">Nouveau Stock</Label>
                  <Input
                    id="newStock"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Nouvelle quantité"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    required
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Raison de l'ajustement..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {(adjustmentAmount || newStock) && (
              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Nouveau Stock:</span>
                  <span className="text-lg font-bold text-primary">
                    {previewStock} {product.unit_of_measure || "unité"}
                  </span>
                </div>
                {adjustmentType === "adjust" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {parseFloat(adjustmentAmount) > 0 ? "+" : ""}
                    {adjustmentAmount} {product.unit_of_measure || "unité"}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Mise à jour..." : "Confirmer"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
