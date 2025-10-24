import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  cost_price: number;
  unit_of_measure: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseLine {
  id: string;
  product_id: string;
  product_name: string;
  unit_cost: number;
  quantity: number;
}

interface PurchaseMultiDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PurchaseMultiDialog({ open, onClose }: PurchaseMultiDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: crypto.randomUUID(), product_id: "", product_name: "", unit_cost: 0, quantity: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      loadProducts();
      loadSuppliers();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, current_stock, cost_price, unit_of_measure")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erreur lors du chargement des produits");
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      toast.error("Erreur lors du chargement des fournisseurs");
    }
  };

  const addLine = () => {
    setLines([
      ...lines,
      { id: crypto.randomUUID(), product_id: "", product_name: "", unit_cost: 0, quantity: 0 }
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast.error("Au moins une ligne est requise");
      return;
    }
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof PurchaseLine, value: any) => {
    setLines(lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const selectProduct = (lineId: string, product: Product) => {
    setLines(lines.map(line => 
      line.id === lineId 
        ? { 
            ...line, 
            product_id: product.id, 
            product_name: product.name,
            unit_cost: product.cost_price 
          } 
        : line
    ));
    setOpenPopovers({ ...openPopovers, [lineId]: false });
  };

  const getTotalCost = () => {
    return lines.reduce((sum, line) => sum + (line.unit_cost * line.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate lines
      const validLines = lines.filter(line => 
        line.product_id && line.quantity > 0 && line.unit_cost >= 0
      );

      if (validLines.length === 0) {
        toast.error("Veuillez ajouter au moins un produit valide");
        setLoading(false);
        return;
      }

      // Prepare purchase records
      const purchaseRecords = validLines.map(line => ({
        product_id: line.product_id,
        supplier_id: supplierId || null,
        unit_cost: line.unit_cost,
        quantity: line.quantity,
        total_cost: line.unit_cost * line.quantity,
        purchase_date: purchaseDate,
        notes: notes || null,
      }));

      // Insert all purchases
      const { error: insertError } = await supabase
        .from("purchases")
        .insert(purchaseRecords);

      if (insertError) throw insertError;

      // Update product cost_price and supplier for each product
      for (const line of validLines) {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            cost_price: line.unit_cost,
            supplier_id: supplierId || null,
          })
          .eq("id", line.product_id);

        if (updateError) {
          console.error("Error updating product:", updateError);
        }
      }

      toast.success(`${validLines.length} achat(s) enregistré(s) avec succès`);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error("Error saving purchases:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement des achats");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSupplierId("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setLines([
      { id: crypto.randomUUID(), product_id: "", product_name: "", unit_cost: 0, quantity: 0 }
    ]);
    setOpenPopovers({});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer Achats Multiples</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Date d'achat</Label>
              <Input
                id="purchase_date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Produits</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                  <div className="col-span-5">
                    {index === 0 && <Label className="text-xs mb-1 block">Produit</Label>}
                    <Popover
                      open={openPopovers[line.id]}
                      onOpenChange={(open) => setOpenPopovers({ ...openPopovers, [line.id]: open })}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !line.product_id && "text-muted-foreground")}
                        >
                          {line.product_name || "Sélectionner..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher un produit..." />
                          <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {products.map((product) => (
                              <CommandItem
                                key={product.id}
                                onSelect={() => selectProduct(line.id, product)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    line.product_id === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {product.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="col-span-3">
                    {index === 0 && <Label className="text-xs mb-1 block">Coût unitaire (DH)</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unit_cost || ""}
                      onChange={(e) => updateLine(line.id, "unit_cost", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs mb-1 block">Quantité</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.quantity || ""}
                      onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="col-span-1">
                    {index === 0 && <Label className="text-xs mb-1 block">Total</Label>}
                    <div className="text-sm font-medium py-2">
                      {(line.unit_cost * line.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-span-1">
                    {index === 0 && <div className="h-5" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end items-center gap-4 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-lg font-bold">{getTotalCost().toFixed(2)} DH</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer les achats"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
