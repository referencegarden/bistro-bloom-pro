import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { MenuItemIngredientRow } from "@/components/MenuItemIngredientRow";

interface MenuItemDialogProps {
  open: boolean;
  onClose: () => void;
  editingItem?: any;
}

interface Ingredient {
  id?: string;
  product_id: string;
  quantity_per_unit: number;
  unit_of_measure: string;
  product_name?: string;
  cost_price?: number;
}

export function MenuItemDialog({ open, onClose, editingItem }: MenuItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setName(editingItem.name);
        setDescription(editingItem.description || "");
        setCategory(editingItem.category || "");
        setSellingPrice(editingItem.selling_price.toString());
        setIsActive(editingItem.is_active);
        loadIngredients(editingItem.id);
      } else {
        resetForm();
      }
    }
  }, [editingItem, open]);

  const loadIngredients = async (menuItemId: string) => {
    try {
      const { data, error } = await supabase
        .from("menu_item_ingredients")
        .select("*, products(name, cost_price)")
        .eq("menu_item_id", menuItemId);

      if (error) throw error;

      setIngredients(
        data.map((ing) => ({
          id: ing.id,
          product_id: ing.product_id,
          quantity_per_unit: ing.quantity_per_unit,
          unit_of_measure: ing.unit_of_measure || "unité",
          product_name: ing.products?.name,
          cost_price: ing.products?.cost_price,
        }))
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setSellingPrice("");
    setIsActive(true);
    setIngredients([]);
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        product_id: "",
        quantity_per_unit: 1,
        unit_of_measure: "unité",
      },
    ]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    return ingredients.reduce((total, ing) => {
      return total + (ing.quantity_per_unit * (ing.cost_price || 0));
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!name || !sellingPrice) {
        throw new Error("Veuillez remplir tous les champs requis");
      }

      console.log("Submitting menu item with ingredients:", ingredients);

      const menuItemData = {
        name,
        description: description || null,
        category: category || null,
        selling_price: parseFloat(sellingPrice),
        is_active: isActive,
      };

      let menuItemId: string;

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(menuItemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        menuItemId = editingItem.id;

        // Delete existing ingredients
        await supabase
          .from("menu_item_ingredients")
          .delete()
          .eq("menu_item_id", menuItemId);
      } else {
        const { data, error } = await supabase
          .from("menu_items")
          .insert([menuItemData])
          .select()
          .single();

        if (error) throw error;
        menuItemId = data.id;
      }

      // Insert ingredients
      const validIngredients = ingredients.filter(
        (ing) => ing.product_id && ing.quantity_per_unit > 0
      );
      const incompleteIngredients = ingredients.filter(
        (ing) => !ing.product_id || !(ing.quantity_per_unit > 0)
      );

      console.log("Valid ingredients to insert:", validIngredients);

      if (ingredients.length > 0 && validIngredients.length === 0) {
        // No valid ingredient at all
        console.warn("All ingredients are incomplete:", ingredients);
        throw new Error("Veuillez remplir tous les champs des ingrédients ou les supprimer");
      }

      if (validIngredients.length > 0) {
        // Inform user that incomplete rows will be ignored (non-blocking)
        if (incompleteIngredients.length > 0) {
          toast({
            title: "Information",
            description: `${incompleteIngredients.length} ingrédient(s) incomplet(s) ont été ignoré(s).`,
          });
        }

        const ingredientsData = validIngredients.map((ing) => ({
          menu_item_id: menuItemId,
          product_id: ing.product_id,
          quantity_per_unit: ing.quantity_per_unit,
          unit_of_measure: ing.unit_of_measure || "unité",
        }));

        console.log("Inserting ingredients data:", ingredientsData);

        const { data: insertedData, error: ingredientsError } = await supabase
          .from("menu_item_ingredients")
          .insert(ingredientsData)
          .select();

        if (ingredientsError) {
          console.error("Error inserting ingredients:", ingredientsError);
          throw new Error(`Erreur lors de l'insertion des ingrédients: ${ingredientsError.message}`);
        }

        console.log("Successfully inserted ingredients:", insertedData);
      }

      toast({
        title: "Succès",
        description: editingItem
          ? "Item du menu mis à jour avec succès"
          : "Item du menu créé avec succès",
      });

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

  const totalCost = calculateTotalCost();
  const profit = parseFloat(sellingPrice || "0") - totalCost;
  const profitMargin = sellingPrice ? (profit / parseFloat(sellingPrice)) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Modifier" : "Créer"} Item du Menu
          </DialogTitle>
          <DialogDescription className="sr-only">
            Renseignez les détails de l'item et ses ingrédients puis enregistrez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ex: Plat Principal, Dessert"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix de vente (DH) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Actif</Label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Ingrédients</Label>
              <Button type="button" size="sm" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Ingrédient
              </Button>
            </div>

            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun ingrédient ajouté
              </p>
            ) : (
              <div className="space-y-2 border rounded-lg p-4">
                {ingredients.map((ingredient, index) => (
                  <MenuItemIngredientRow
                    key={index}
                    ingredient={ingredient}
                    onUpdate={(field, value) => updateIngredient(index, field, value)}
                    onRemove={() => removeIngredient(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {ingredients.length > 0 && sellingPrice && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Coût Total:</span>
                <span className="font-medium">{totalCost.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Prix de Vente:</span>
                <span className="font-medium">{parseFloat(sellingPrice).toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Marge:</span>
                <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                  {profit.toFixed(2)} DH ({profitMargin.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
