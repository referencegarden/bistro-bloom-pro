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

interface Product {
  id: string;
  name: string;
  current_stock: number;
  cost_price: number;
  unit_of_measure: string;
}

interface Ingredient {
  id?: string;
  tempId?: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProducts();
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

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, current_stock, cost_price, unit_of_measure")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les produits",
      });
    }
  };

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
    if (products.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Aucun produit disponible. Veuillez d'abord créer des produits.",
      });
      return;
    }

    setIngredients([
      ...ingredients,
      {
        tempId: crypto.randomUUID(),
        product_id: "",
        quantity_per_unit: 1,
        unit_of_measure: "unité",
        product_name: "",
        cost_price: 0,
      },
    ]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleProductSelect = (index: number, productId: string) => {
    // Check for duplicates
    const isDuplicate = ingredients.some((ing, idx) => idx !== index && ing.product_id === productId);
    if (isDuplicate) {
      toast({
        variant: "destructive",
        title: "Produit déjà ajouté",
        description: "Ce produit est déjà ajouté. Modifiez la quantité plutôt que de le dupliquer.",
      });
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product) {
      const updated = [...ingredients];
      updated[index] = {
        ...updated[index],
        product_id: productId,
        product_name: product.name,
        cost_price: product.cost_price,
        unit_of_measure: product.unit_of_measure,
      };
      setIngredients(updated);
    }
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
      const numericSellingPrice = parseFloat(String(sellingPrice).replace(',', '.'));
      if (!name.trim() || Number.isNaN(numericSellingPrice)) {
        throw new Error("Veuillez remplir tous les champs requis");
      }

      // Validate ingredients if any exist
      if (ingredients.length > 0) {
        const incomplete = ingredients.filter(
          (ing) => !ing.product_id || !(ing.quantity_per_unit > 0)
        );
        if (incomplete.length > 0) {
          toast({
            variant: "destructive",
            title: "Erreur de validation",
            description: "Veuillez sélectionner un produit et une quantité > 0 pour chaque ligne d'ingrédient.",
          });
          setLoading(false);
          return;
        }

        // Check for duplicate products
        const productIds = ingredients.map((ing) => ing.product_id);
        const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
          toast({
            variant: "destructive",
            title: "Produits en double",
            description: "Chaque produit ne peut être ajouté qu'une seule fois. Ajustez la quantité si nécessaire.",
          });
          setLoading(false);
          return;
        }
      }

      console.log("Submitting menu item with ingredients:", ingredients);

      const menuItemData = {
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        selling_price: numericSellingPrice,
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

      // Insert ingredients (all validated at this point)
      if (ingredients.length > 0) {
        const ingredientsData = ingredients.map((ing) => ({
          menu_item_id: menuItemId,
          product_id: ing.product_id,
          quantity_per_unit: ing.quantity_per_unit,
          unit_of_measure: ing.unit_of_measure && ing.unit_of_measure !== 'unité' ? ing.unit_of_measure : null,
        }));

        console.log(`Inserting ${ingredientsData.length} ingredients:`, ingredientsData);

        const { data: insertedData, error: ingredientsError } = await supabase
          .from("menu_item_ingredients")
          .insert(ingredientsData)
          .select();

        if (ingredientsError) {
          console.error("Error inserting ingredients:", ingredientsError);
          throw new Error(`Erreur lors de l'insertion des ingrédients: ${ingredientsError.message}`);
        }

        console.log(`Successfully inserted ${insertedData?.length || 0} ingredients`);
      }

      toast({
        title: "Succès",
        description: editingItem
          ? "Item du menu mis à jour avec succès"
          : "Item du menu créé avec succès",
      });

      onClose();
    } catch (error: any) {
      console.error("Error saving menu item:", error);
      const errorMessage = error.message || "Erreur lors de l'enregistrement du menu";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage,
      });
      if (error.message?.includes("row-level security")) {
        toast({
          variant: "destructive",
          title: "Erreur de permissions",
          description: "Vous n'avez pas les permissions nécessaires pour cette action",
        });
      }
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
                    key={ingredient.tempId || ingredient.id || index}
                    ingredient={ingredient}
                    products={products}
                    onUpdate={(field, value) => updateIngredient(index, field, value)}
                    onSelectProduct={(productId) => handleProductSelect(index, productId)}
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
            <Button 
              type="submit" 
              disabled={loading || (ingredients.length > 0 && ingredients.some(ing => !ing.product_id || ing.quantity_per_unit <= 0))}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
