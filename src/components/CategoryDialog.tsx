import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
}

export function CategoryDialog({ open, onClose, category }: CategoryDialogProps) {
  const { tenantId } = useTenant();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tenantId) {
      toast.error("Restaurant context not loaded. Please try again.");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || null,
    };

    if (category) {
      const { error } = await supabase
        .from("categories")
        .update(data)
        .eq("id", category.id);

      if (error) {
        toast.error("Failed to update category");
        return;
      }
      toast.success("Category updated");
    } else {
      const { error } = await supabase.from("categories").insert({
        ...data,
        tenant_id: tenantId,
      });

      if (error) {
        toast.error("Failed to create category");
        return;
      }
      toast.success("Category created");
    }

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {category ? "Modifier Catégorie" : "Ajouter Catégorie"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ajouter une description..."
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" className="w-full sm:w-auto">{category ? "Modifier" : "Créer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
