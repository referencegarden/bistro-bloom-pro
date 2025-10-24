import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  cost_price: number;
  unit_of_measure: string;
}

interface MenuItemIngredientRowProps {
  ingredient: {
    product_id: string;
    quantity_per_unit: number;
    unit_of_measure: string;
    product_name?: string;
    cost_price?: number;
  };
  products: Product[];
  onUpdate: (field: string, value: any) => void;
  onSelectProduct: (productId: string) => void;
  onRemove: () => void;
}

export function MenuItemIngredientRow({ ingredient, products, onUpdate, onSelectProduct, onRemove }: MenuItemIngredientRowProps) {
  const [open, setOpen] = useState(false);

  const selectedProduct = products.find((p) => p.id === ingredient.product_id) || null;

  const handleProductSelect = (productId: string) => {
    onSelectProduct(productId);
    setOpen(false);
  };

  const units = ["unité", "g", "kg", "ml", "L", "pcs", "gramme"];

  return (
    <div className="flex gap-2 items-start border-b pb-2">
      <div className="flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedProduct ? selectedProduct.name : "Sélectionner un produit..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Rechercher un produit..." />
              <CommandList>
                <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleProductSelect(product.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div>{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {product.current_stock} {product.unit_of_measure}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedProduct && (
          <div className="text-xs text-muted-foreground mt-1">
            Stock disponible: {selectedProduct.current_stock} {selectedProduct.unit_of_measure}
          </div>
        )}
      </div>

      <div className="w-32">
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Quantité"
          value={ingredient.quantity_per_unit || ""}
          onChange={(e) => onUpdate("quantity_per_unit", parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="w-28">
        <Select
          value={ingredient.unit_of_measure}
          onValueChange={(value) => onUpdate("unit_of_measure", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
