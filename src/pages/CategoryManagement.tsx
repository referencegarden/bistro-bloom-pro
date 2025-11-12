import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Package, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
}

interface POSCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
}

export default function CategoryManagement() {
  const { tenantId } = useTenant();
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [posCategories, setPosCategories] = useState<POSCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");

  // Inventory dialog states
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [editingInvCategory, setEditingInvCategory] = useState<InventoryCategory | null>(null);
  const [invFormData, setInvFormData] = useState({ name: "", description: "" });

  // POS dialog states
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [editingPosCategory, setEditingPosCategory] = useState<POSCategory | null>(null);
  const [posFormData, setPosFormData] = useState({
    name: "",
    description: "",
    color: "hsl(142.1 76.2% 36.3%)",
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const [invResult, posResult] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("pos_categories").select("*").order("display_order"),
      ]);

      if (invResult.error) throw invResult.error;
      if (posResult.error) throw posResult.error;

      setInventoryCategories(invResult.data || []);
      setPosCategories(posResult.data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des catégories");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Inventory Category Handlers
  const handleOpenInvDialog = (category?: InventoryCategory) => {
    if (category) {
      setEditingInvCategory(category);
      setInvFormData({
        name: category.name,
        description: category.description || "",
      });
    } else {
      setEditingInvCategory(null);
      setInvFormData({ name: "", description: "" });
    }
    setInvDialogOpen(true);
  };

  const handleSaveInvCategory = async () => {
    if (!invFormData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (!tenantId) {
      toast.error("Restaurant context not loaded. Please try again.");
      return;
    }

    try {
      if (editingInvCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: invFormData.name,
            description: invFormData.description || null,
          })
          .eq("id", editingInvCategory.id);

        if (error) throw error;
        toast.success("Catégorie mise à jour");
      } else {
        const { error } = await supabase.from("categories").insert({
          name: invFormData.name,
          description: invFormData.description || null,
          tenant_id: tenantId,
        });

        if (error) throw error;
        toast.success("Catégorie créée");
      }

      setInvDialogOpen(false);
      loadCategories();
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    }
  };

  const handleDeleteInvCategory = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Catégorie supprimée");
      loadCategories();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  // POS Category Handlers
  const handleOpenPosDialog = (category?: POSCategory) => {
    if (category) {
      setEditingPosCategory(category);
      setPosFormData({
        name: category.name,
        description: category.description || "",
        color: category.color,
        is_active: category.is_active,
      });
    } else {
      setEditingPosCategory(null);
      setPosFormData({
        name: "",
        description: "",
        color: "hsl(142.1 76.2% 36.3%)",
        is_active: true,
      });
    }
    setPosDialogOpen(true);
  };

  const handleSavePosCategory = async () => {
    if (!posFormData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (!tenantId) {
      toast.error("Restaurant context not loaded. Please try again.");
      return;
    }

    try {
      if (editingPosCategory) {
        const { error } = await supabase
          .from("pos_categories")
          .update({
            name: posFormData.name,
            description: posFormData.description || null,
            color: posFormData.color,
            is_active: posFormData.is_active,
          })
          .eq("id", editingPosCategory.id);

        if (error) throw error;
        toast.success("Catégorie mise à jour");
      } else {
        const maxOrder =
          posCategories.length > 0
            ? Math.max(...posCategories.map((c) => c.display_order))
            : -1;

        const { error } = await supabase.from("pos_categories").insert({
          name: posFormData.name,
          description: posFormData.description || null,
          color: posFormData.color,
          is_active: posFormData.is_active,
          display_order: maxOrder + 1,
          tenant_id: tenantId,
        });

        if (error) throw error;
        toast.success("Catégorie créée");
      }

      setPosDialogOpen(false);
      loadCategories();
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    }
  };

  const handleDeletePosCategory = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;

    try {
      const { error } = await supabase.from("pos_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Catégorie supprimée");
      loadCategories();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestion des Catégories</h1>
        <p className="text-muted-foreground">Gérer les catégories d'inventaire et POS</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="inventory">
            <Package className="mr-2 h-4 w-4" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="pos">
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            POS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              <Package className="inline h-4 w-4 mr-1" />
              Ces catégories sont utilisées pour organiser les produits en stock
            </p>
            <Button onClick={() => handleOpenInvDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Catégorie Inventaire
            </Button>
          </Card>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInvDialog(category)}
                        className="mr-2"
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteInvCategory(category.id)}
                      >
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pos" className="space-y-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              <UtensilsCrossed className="inline h-4 w-4 mr-1" />
              Ces catégories organisent les articles du menu affichés au point de vente
            </p>
            <Button onClick={() => handleOpenPosDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Catégorie POS
            </Button>
          </Card>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-xs text-muted-foreground">{category.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          category.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {category.is_active ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenPosDialog(category)}
                        className="mr-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePosCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Inventory Category Dialog */}
      <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInvCategory ? "Modifier la catégorie" : "Nouvelle catégorie inventaire"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inv-name">Nom *</Label>
              <Input
                id="inv-name"
                value={invFormData.name}
                onChange={(e) => setInvFormData({ ...invFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="inv-description">Description</Label>
              <Textarea
                id="inv-description"
                value={invFormData.description}
                onChange={(e) => setInvFormData({ ...invFormData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveInvCategory}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POS Category Dialog */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPosCategory ? "Modifier la catégorie POS" : "Nouvelle catégorie POS"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pos-name">Nom *</Label>
              <Input
                id="pos-name"
                value={posFormData.name}
                onChange={(e) => setPosFormData({ ...posFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pos-description">Description</Label>
              <Textarea
                id="pos-description"
                value={posFormData.description}
                onChange={(e) => setPosFormData({ ...posFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pos-color">Couleur (HSL)</Label>
              <Input
                id="pos-color"
                value={posFormData.color}
                onChange={(e) => setPosFormData({ ...posFormData, color: e.target.value })}
                placeholder="hsl(142.1 76.2% 36.3%)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="pos-is_active"
                checked={posFormData.is_active}
                onCheckedChange={(checked) => setPosFormData({ ...posFormData, is_active: checked })}
              />
              <Label htmlFor="pos-is_active">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSavePosCategory}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
