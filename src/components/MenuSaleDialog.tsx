import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MenuSaleDialogProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  name: string;
  selling_price: number;
}

interface Employee {
  id: string;
  name: string;
}

interface IngredientUsage {
  product_id: string;
  product_name: string;
  quantity_needed: number;
  unit_of_measure: string;
  available_stock: number;
}

export function MenuSaleDialog({ open, onClose }: MenuSaleDialogProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientUsage, setIngredientUsage] = useState<IngredientUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMenuItems();
      loadEmployees();
    }
  }, [open]);

  useEffect(() => {
    if (selectedMenuItemId && quantity) {
      calculateIngredientUsage();
    } else {
      setIngredientUsage([]);
    }
  }, [selectedMenuItemId, quantity]);

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, selling_price")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const calculateIngredientUsage = async () => {
    try {
      const { data, error } = await supabase.rpc("calculate_ingredient_usage", {
        _menu_item_id: selectedMenuItemId,
        _quantity: parseFloat(quantity),
      });

      if (error) throw error;
      setIngredientUsage(data || []);
    } catch (error: any) {
      console.error("Error calculating ingredient usage:", error);
      setIngredientUsage([]);
    }
  };

  const hasInsufficientStock = ingredientUsage.some(
    (ing) => ing.quantity_needed > ing.available_stock
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMenuItemId || !quantity) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
      });
      return;
    }

    if (hasInsufficientStock) {
      toast({
        variant: "destructive",
        title: "Stock insuffisant",
        description: "Certains ingrédients n'ont pas assez de stock",
      });
      return;
    }

    setLoading(true);

    try {
      const selectedMenuItem = menuItems.find((m) => m.id === selectedMenuItemId);
      if (!selectedMenuItem) throw new Error("Item du menu non trouvé");

      const saleData = {
        menu_item_id: selectedMenuItemId,
        quantity: parseFloat(quantity),
        total_price: selectedMenuItem.selling_price * parseFloat(quantity),
        employee_id: selectedEmployeeId || null,
        notes: notes || null,
      };

      const { error } = await supabase.from("menu_item_sales").insert([saleData]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Vente enregistrée avec succès",
      });

      resetForm();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMenuItemId("");
    setQuantity("1");
    setSelectedEmployeeId("");
    setNotes("");
    setIngredientUsage([]);
  };

  const selectedMenuItem = menuItems.find((m) => m.id === selectedMenuItemId);
  const totalPrice = selectedMenuItem
    ? selectedMenuItem.selling_price * parseFloat(quantity || "0")
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer Vente Menu</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="menuItem">Item du Menu *</Label>
            <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
              <SelectTrigger id="menuItem">
                <SelectValue placeholder="Sélectionner un item" />
              </SelectTrigger>
              <SelectContent>
                {menuItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - {item.selling_price.toFixed(2)} DH
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Employé</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {ingredientUsage.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Ingrédients requis:</h4>
              <div className="space-y-2">
                {ingredientUsage.map((ing, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center text-sm p-2 rounded ${
                      ing.quantity_needed > ing.available_stock
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{ing.product_name}</div>
                      <div className="text-xs">
                        Requis: {ing.quantity_needed} {ing.unit_of_measure}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">
                        Stock: {ing.available_stock} {ing.unit_of_measure}
                      </div>
                      {ing.quantity_needed > ing.available_stock && (
                        <div className="text-xs font-semibold">Insuffisant!</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasInsufficientStock && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Stock insuffisant pour certains ingrédients. Veuillez ajuster la quantité
                    ou réapprovisionner le stock.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {totalPrice > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Prix Total:</span>
                <span>{totalPrice.toFixed(2)} DH</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || hasInsufficientStock}>
              {loading ? "Enregistrement..." : "Enregistrer Vente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
