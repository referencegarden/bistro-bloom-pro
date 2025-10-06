import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { error } = await supabase.from("categories").insert(data);

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
      <DialogContent>
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{category ? "Modifier" : "Créer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
