import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, X, Search, ShoppingCart, Save, CreditCard, Package, Lock, User, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { POSLockDialog } from "@/components/POSLockDialog";
import { useTenant } from "@/contexts/TenantContext";

interface MenuItem {
  id: string;
  name: string;
  selling_price: number;
  category: string;
  pos_category_id: string | null;
  image_url: string | null;
  is_active: boolean;
}

interface POSCategory {
  id: string;
  name: string;
  color: string;
}

interface Table {
  id: string;
  table_number: string;
  status: string;
}

interface OrderItem {
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

interface CurrentOrder {
  order_type: "dine_in" | "takeaway" | "delivery";
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  items: OrderItem[];
}

export default function POS() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { tenantId } = useTenant();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [posCategories, setPosCategories] = useState<POSCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder>({
    order_type: "dine_in",
    items: [],
  });
  const [taxRate, setTaxRate] = useState(10);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>("");
  const [activeEmployeeName, setActiveEmployeeName] = useState<string>("");
  const [activeEmployeePosition, setActiveEmployeePosition] = useState<string>("");
  const [isLocked, setIsLocked] = useState(true);
  const [useTablesSystem, setUseTablesSystem] = useState(true);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const handleUnlock = (employeeData: { id: string; name: string; position: string }) => {
    setActiveEmployeeId(employeeData.id);
    setActiveEmployeeName(employeeData.name);
    setActiveEmployeePosition(employeeData.position || "");
    localStorage.setItem('pos_active_employee', JSON.stringify(employeeData));
    setIsLocked(false);
    toast({
      title: "POS Déverrouillé",
      description: `Connecté en tant que ${employeeData.name}`,
    });
  };

  const loadData = async () => {
    if (!tenantId) return;
    
    try {
      const [
        { data: cats },
        { data: items },
        { data: tablesData },
        { data: settings }
      ] = await Promise.all([
        supabase.from("pos_categories").select("*").eq("is_active", true).eq("tenant_id", tenantId).order("display_order"),
        supabase.from("menu_items").select("*").eq("is_active", true).eq("tenant_id", tenantId).order("display_order"),
        supabase.from("tables").select("*").eq("tenant_id", tenantId).order("table_number"),
        supabase.from("app_settings").select("tax_rate, use_tables_system").eq("tenant_id", tenantId).single()
      ]);

      if (cats) setPosCategories(cats);
      if (items) setMenuItems(items);
      if (tablesData) setTables(tablesData);
      if (settings) {
        setTaxRate(settings.tax_rate);
        setUseTablesSystem(settings.use_tables_system ?? true);
      }
    } catch (error: any) {
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    }
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.pos_category_id === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const addItemToOrder = (item: MenuItem) => {
    if (isLocked) return;
    const existingItem = currentOrder.items.find((orderItem) => orderItem.menu_item_id === item.id);
    if (existingItem) {
      setCurrentOrder({
        ...currentOrder,
        items: currentOrder.items.map((orderItem) =>
          orderItem.menu_item_id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1, subtotal: (orderItem.quantity + 1) * orderItem.unit_price }
            : orderItem
        ),
      });
    } else {
      setCurrentOrder({
        ...currentOrder,
        items: [...currentOrder.items, { menu_item_id: item.id, menu_item_name: item.name, quantity: 1, unit_price: item.selling_price, subtotal: item.selling_price }],
      });
    }
  };

  const updateItemQuantity = (menuItemId: string, change: number) => {
    setCurrentOrder({
      ...currentOrder,
      items: currentOrder.items.map((item) => {
        if (item.menu_item_id === menuItemId) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_price } : null;
        }
        return item;
      }).filter((item): item is OrderItem => item !== null),
    });
  };

  const removeItem = (menuItemId: string) => {
    setCurrentOrder({ ...currentOrder, items: currentOrder.items.filter((item) => item.menu_item_id !== menuItemId) });
  };

  const updateInstructions = (menuItemId: string, instructions: string) => {
    setCurrentOrder({
      ...currentOrder,
      items: currentOrder.items.map((item) => item.menu_item_id === menuItemId ? { ...item, special_instructions: instructions } : item),
    });
  };

  const calculateTotals = () => {
    const subtotal = currentOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSendForPreparation = async () => {
    if (currentOrder.items.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
      return;
    }
    if (useTablesSystem && currentOrder.order_type === "dine_in" && !currentOrder.table_id) {
      toast({ title: "Erreur", description: "Sélectionnez une table", variant: "destructive" });
      return;
    }
    if (!tenantId) {
      toast({ title: "Erreur", description: "Contexte restaurant non chargé", variant: "destructive" });
      return;
    }

    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const orderNumber = `POS-${Date.now()}`;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          order_type: currentOrder.order_type,
          table_id: currentOrder.table_id || null,
          customer_name: currentOrder.customer_name || null,
          customer_phone: currentOrder.customer_phone || null,
          notes: currentOrder.notes || null,
          total_amount: total,
          status: "pending",
          employee_id: activeEmployeeId || null,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = currentOrder.items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.subtotal,
        special_instructions: item.special_instructions || null,
        tenant_id: tenantId,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      const { data: confirmResult, error: confirmError } = await supabase.rpc("confirm_order", { _order_id: order.id });
      if (confirmError) throw confirmError;

      const result = confirmResult as { success: boolean; insufficient_stock?: any[] };
      if (!result.success) {
        toast({ title: "Stock insuffisant", description: "Certains produits n'ont pas assez de stock", variant: "destructive" });
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);
        return;
      }

      toast({ title: "Commande envoyée", description: "Commande transmise aux écrans de préparation" });
      setCurrentOrder({ order_type: "dine_in", items: [] });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleProcessPayment = async () => {
    if (currentOrder.items.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
      return;
    }
    if (useTablesSystem && currentOrder.order_type === "dine_in" && !currentOrder.table_id) {
      toast({ title: "Erreur", description: "Sélectionnez une table", variant: "destructive" });
      return;
    }
    if (!tenantId) {
      toast({ title: "Erreur", description: "Contexte restaurant non chargé", variant: "destructive" });
      return;
    }

    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const orderNumber = `POS-${Date.now()}`;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          order_type: currentOrder.order_type,
          table_id: currentOrder.table_id || null,
          customer_name: currentOrder.customer_name || null,
          customer_phone: currentOrder.customer_phone || null,
          notes: currentOrder.notes || null,
          total_amount: total,
          status: "pending",
          employee_id: activeEmployeeId || null,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = currentOrder.items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.subtotal,
        special_instructions: item.special_instructions || null,
        tenant_id: tenantId,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      navigate(`/${slug}/pos/payment/${order.id}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();
  const getItemInOrder = (menuItemId: string) => currentOrder.items.find(item => item.menu_item_id === menuItemId);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Restaurant POS</h1>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Ouvert</Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {activeEmployeeName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <div className="text-sm">
                <div className="font-semibold text-foreground">{activeEmployeeName}</div>
                {activeEmployeePosition && <div className="text-xs text-muted-foreground">{activeEmployeePosition}</div>}
              </div>
            </div>
          )}
          {!isLocked && (
            <Button variant="outline" size="sm" onClick={() => setIsLocked(true)}>
              <Lock className="mr-2 h-4 w-4" />Verrouiller POS
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm"><Package className="mr-2 h-4 w-4" />Menu</Button>
          <div className="flex gap-2">
            <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>
              Tous <Badge variant="secondary" className="ml-2">{menuItems.length}</Badge>
            </Button>
            {posCategories.map((cat) => {
              const count = menuItems.filter(item => item.pos_category_id === cat.id).length;
              return (
                <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.id)}>
                  {cat.name} <Badge variant="secondary" className="ml-2">{count}</Badge>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}><Search className="mr-2 h-4 w-4" />Actualiser</Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un produit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-6 gap-4">
            {filteredMenuItems.map((item) => {
              const orderItem = getItemInOrder(item.id);
              return (
                <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-all cursor-pointer" onClick={() => !isLocked && addItemToOrder(item)}>
                  <div className="relative aspect-square">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center"><Package className="h-16 w-16 text-muted-foreground" /></div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-green-500 text-white">● Disponible</Badge>
                    {orderItem && <Badge className="absolute top-2 left-2 bg-primary text-white">{orderItem.quantity}</Badge>}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-center mb-2">{item.name}</h3>
                    <span className="font-bold text-sm block text-center">{item.selling_price.toFixed(2)} DH</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="w-[400px] border-l bg-card flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Résumé de commande</h2>
              <span className="text-sm text-muted-foreground">#POS-{Date.now().toString().slice(-6)}</span>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            {currentOrder.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun article ajouté</p>
            ) : (
              <div className="space-y-3">
                {currentOrder.items.map((item) => {
                  const menuItem = menuItems.find(m => m.id === item.menu_item_id);
                  return (
                    <div key={item.menu_item_id} className="flex gap-3 pb-3 border-b">
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {menuItem?.image_url ? (
                          <img src={menuItem.image_url} alt={item.menu_item_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-sm">{item.menu_item_name} ({item.quantity})</h4>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1" onClick={() => removeItem(item.menu_item_id)}><X className="h-4 w-4" /></Button>
                        </div>
                        {item.special_instructions && <p className="text-xs text-muted-foreground mb-2">Notes : {item.special_instructions}</p>}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{item.subtotal.toFixed(2)} DH</span>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.menu_item_id, -1)}><Minus className="h-3 w-3" /></Button>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.menu_item_id, 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <Textarea placeholder="Notes spéciales..." value={item.special_instructions || ""} onChange={(e) => updateInstructions(item.menu_item_id, e.target.value)} rows={2} className="text-xs mt-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 border-t space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Sous-total</span><span>{subtotal.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-sm"><span>TVA ({taxRate}%)</span><span>{taxAmount.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>{total.toFixed(2)} DH</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type de commande</Label>
                <Select value={currentOrder.order_type} onValueChange={(value: any) => setCurrentOrder({ ...currentOrder, order_type: value, table_id: value !== "dine_in" ? undefined : currentOrder.table_id })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Sur place</SelectItem>
                    <SelectItem value="takeaway">À emporter</SelectItem>
                    <SelectItem value="delivery">Livraison</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {useTablesSystem && currentOrder.order_type === "dine_in" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Sélectionner une table</Label>
                  <Select value={currentOrder.table_id} onValueChange={(value) => setCurrentOrder({ ...currentOrder, table_id: value })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner une table" /></SelectTrigger>
                    <SelectContent>
                      {tables.length === 0 ? (
                        <SelectItem value="no-tables" disabled>Aucune table disponible</SelectItem>
                      ) : (
                        tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>Table {table.table_number}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentOrder.order_type !== "dine_in" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nom du client</Label>
                    <Input value={currentOrder.customer_name || ""} onChange={(e) => setCurrentOrder({ ...currentOrder, customer_name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Téléphone</Label>
                    <Input value={currentOrder.customer_phone || ""} onChange={(e) => setCurrentOrder({ ...currentOrder, customer_phone: e.target.value })} className="mt-1" />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={handleSendForPreparation} disabled={currentOrder.items.length === 0}>
                <Send className="mr-2 h-5 w-5" />Envoyer en préparation
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800" size="lg" onClick={handleProcessPayment} disabled={currentOrder.items.length === 0}>
                <CreditCard className="mr-2 h-5 w-5" />Procéder au paiement
              </Button>
            </div>
          </div>
        </div>
      </div>

      <POSLockDialog open={isLocked} employeeName={activeEmployeeName} onUnlock={handleUnlock} />
    </div>
  );
}
