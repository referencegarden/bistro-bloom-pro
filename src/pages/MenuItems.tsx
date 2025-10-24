import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronDown, ChevronRight, Trash2, Edit } from "lucide-react";
import { MenuItemDialog } from "@/components/MenuItemDialog";
import { MenuSaleDialog } from "@/components/MenuSaleDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  selling_price: number;
  is_active: boolean;
}

interface Ingredient {
  id: string;
  product_id: string;
  quantity_per_unit: number;
  unit_of_measure: string | null;
  products: {
    name: string;
    cost_price: number;
    current_stock: number;
  };
}

const ITEMS_PER_PAGE = 10;

export default function MenuItems() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Record<string, Ingredient[]>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { isAdmin, permissions, loading: permissionsLoading } = useEmployeePermissions();
  
  const canManageMenu = isAdmin || permissions.can_manage_stock;
  const canMakeSales = isAdmin || permissions.can_make_sales;

  useEffect(() => {
    loadMenuItems();
  }, [currentPage]);

  const loadMenuItems = async () => {
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from("menu_items")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setMenuItems(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const loadIngredients = async (menuItemId: string) => {
    if (ingredients[menuItemId]) return;

    try {
      const { data, error } = await supabase
        .from("menu_item_ingredients")
        .select("*, products(name, cost_price, current_stock)")
        .eq("menu_item_id", menuItemId);

      if (error) throw error;
      setIngredients(prev => ({ ...prev, [menuItemId]: data || [] }));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      loadIngredients(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet item du menu?")) return;

    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Succès",
        description: "Item du menu supprimé avec succès",
      });
      loadMenuItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
    loadMenuItems();
    setIngredients({});
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const calculateTotalCost = (menuItemId: string) => {
    const itemIngredients = ingredients[menuItemId] || [];
    return itemIngredients.reduce((total, ing) => {
      return total + (ing.quantity_per_unit * ing.products.cost_price);
    }, 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Menu / Recettes</h1>
          <p className="text-muted-foreground">Gérez vos items de menu et leurs recettes</p>
        </div>
        <div className="flex gap-2">
          {canMakeSales && (
            <Button onClick={() => setSaleDialogOpen(true)}>
              Enregistrer Vente
            </Button>
          )}
          {canManageMenu && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Menu
            </Button>
          )}
        </div>
      </div>

      <Input
        placeholder="Rechercher un item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix de vente</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              const itemIngredients = ingredients[item.id] || [];
              const totalCost = calculateTotalCost(item.id);
              const profit = item.selling_price - totalCost;

              return (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>{item.selling_price.toFixed(2)} DH</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageMenu && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50">
                        <div className="p-4 space-y-3">
                          <h4 className="font-semibold">Ingrédients:</h4>
                          {itemIngredients.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucun ingrédient</p>
                          ) : (
                            <div className="space-y-2">
                              {itemIngredients.map((ing) => (
                                <div key={ing.id} className="flex justify-between items-center text-sm border-b pb-2">
                                  <div>
                                    <span className="font-medium">{ing.products.name}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {ing.quantity_per_unit} {ing.unit_of_measure || "unité"}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div>Stock: {ing.products.current_stock}</div>
                                    <div className="text-muted-foreground">
                                      Coût: {(ing.quantity_per_unit * ing.products.cost_price).toFixed(2)} DH
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between pt-2 font-semibold">
                                <span>Total</span>
                                <div className="text-right">
                                  <div>Coût: {totalCost.toFixed(2)} DH</div>
                                  <div className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                                    Marge: {profit.toFixed(2)} DH ({((profit / item.selling_price) * 100).toFixed(1)}%)
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  onClick={() => setCurrentPage(i + 1)}
                  isActive={currentPage === i + 1}
                  className="cursor-pointer"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <MenuItemDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingItem={editingItem}
      />

      <MenuSaleDialog
        open={saleDialogOpen}
        onClose={() => {
          setSaleDialogOpen(false);
          loadMenuItems();
        }}
      />
    </div>
  );
}
