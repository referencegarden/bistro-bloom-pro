import { useState, useEffect } from "react";
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
import { Plus, Minus, X, Search, ShoppingCart, Save, CreditCard, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { printOrderTickets } from "@/lib/printerService";
import { BarPreparationTicket } from "@/components/BarPreparationTicket";
import { KitchenPreparationTicket } from "@/components/KitchenPreparationTicket";

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
  const { toast } = useToast();
  
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
  const [employeeId, setEmployeeId] = useState<string>("");
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadEmployee();
  }, []);

  const loadEmployee = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (employee) {
        setEmployeeId(employee.id);
      }
    }
  };

  const loadData = async () => {
    // Load POS categories
    const { data: cats } = await supabase
      .from("pos_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (cats) setPosCategories(cats);

    // Load menu items with POS category info
    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (items) setMenuItems(items);

    // Load tables
    const { data: tablesData } = await supabase
      .from("tables")
      .select("*")
      .order("table_number");
    if (tablesData) setTables(tablesData);

    // Load tax rate
    const { data: settings } = await supabase
      .from("app_settings")
      .select("tax_rate")
      .single();
    if (settings) setTaxRate(settings.tax_rate);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.pos_category_id === selectedCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addItemToOrder = (item: MenuItem) => {
    const existingItem = currentOrder.items.find(
      (orderItem) => orderItem.menu_item_id === item.id
    );

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
        items: [
          ...currentOrder.items,
          {
            menu_item_id: item.id,
            menu_item_name: item.name,
            quantity: 1,
            unit_price: item.selling_price,
            subtotal: item.selling_price,
          },
        ],
      });
    }
  };

  const updateItemQuantity = (menuItemId: string, change: number) => {
    setCurrentOrder({
      ...currentOrder,
      items: currentOrder.items
        .map((item) => {
          if (item.menu_item_id === menuItemId) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0
              ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_price }
              : null;
          }
          return item;
        })
        .filter((item): item is OrderItem => item !== null),
    });
  };

  const removeItem = (menuItemId: string) => {
    setCurrentOrder({
      ...currentOrder,
      items: currentOrder.items.filter((item) => item.menu_item_id !== menuItemId),
    });
  };

  const updateInstructions = (menuItemId: string, instructions: string) => {
    setCurrentOrder({
      ...currentOrder,
      items: currentOrder.items.map((item) =>
        item.menu_item_id === menuItemId
          ? { ...item, special_instructions: instructions }
          : item
      ),
    });
  };

  const calculateTotals = () => {
    const subtotal = currentOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSaveDraft = async () => {
    if (currentOrder.items.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
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
          status: "draft",
          employee_id: employeeId || null,
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
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({ title: "Succès", description: "Commande enregistrée en brouillon" });
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

    if (currentOrder.order_type === "dine_in" && !currentOrder.table_id) {
      toast({ title: "Erreur", description: "Sélectionnez une table", variant: "destructive" });
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
          employee_id: employeeId || null,
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
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Print preparation tickets for bar and kitchen
      setPrintingOrderId(order.id);
      toast({ 
        title: "Commande envoyée", 
        description: "Préparez les tickets d'impression..."
      });

      // Small delay to ensure order items are fully saved
      setTimeout(async () => {
        const { barPrinted, kitchenPrinted } = await printOrderTickets(order.id);
        
        const printedTickets = [];
        if (barPrinted) printedTickets.push("Bar");
        if (kitchenPrinted) printedTickets.push("Cuisine");
        
        if (printedTickets.length > 0) {
          toast({ 
            title: "Tickets générés", 
            description: `Tickets: ${printedTickets.join(", ")}`
          });
        }
        
        setPrintingOrderId(null);
        navigate(`/pos/payment/${order.id}`);
      }, 500);

    } catch (error: any) {
      setPrintingOrderId(null);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Left: Menu Items Grid */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                Tous
              </Button>
              {posCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                    borderColor: cat.color,
                  }}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Menu Items Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {filteredMenuItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => addItemToOrder(item)}
              >
                <CardContent className="p-3 flex flex-col h-full">
                  <div className="aspect-square mb-2 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.name}</h3>
                  <p className="text-lg font-bold text-primary mt-auto">
                    {item.selling_price.toFixed(2)} DH
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Order Summary */}
      <Card className="w-96 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Commande
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-4 mb-4">
            <div>
              <Label>Type de commande</Label>
              <Select
                value={currentOrder.order_type}
                onValueChange={(value: any) =>
                  setCurrentOrder({ ...currentOrder, order_type: value, table_id: value !== "dine_in" ? undefined : currentOrder.table_id })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Sur place</SelectItem>
                  <SelectItem value="takeaway">À emporter</SelectItem>
                  <SelectItem value="delivery">Livraison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentOrder.order_type === "dine_in" && (
              <div>
                <Label>Table</Label>
                <Select
                  value={currentOrder.table_id}
                  onValueChange={(value) =>
                    setCurrentOrder({ ...currentOrder, table_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Table {table.table_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentOrder.order_type !== "dine_in" && (
              <>
                <div>
                  <Label>Nom du client</Label>
                  <Input
                    value={currentOrder.customer_name || ""}
                    onChange={(e) =>
                      setCurrentOrder({ ...currentOrder, customer_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={currentOrder.customer_phone || ""}
                    onChange={(e) =>
                      setCurrentOrder({ ...currentOrder, customer_phone: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={currentOrder.notes || ""}
                onChange={(e) =>
                  setCurrentOrder({ ...currentOrder, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          {/* Order Items */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {currentOrder.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun article ajouté
              </p>
            ) : (
              <div className="space-y-3">
                {currentOrder.items.map((item) => (
                  <Card key={item.menu_item_id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm flex-1">{item.menu_item_name}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeItem(item.menu_item_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(item.menu_item_id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(item.menu_item_id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold">{item.subtotal.toFixed(2)} DH</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Totals */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sous-total:</span>
              <span>{subtotal.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>TVA ({taxRate}%):</span>
              <span>{taxAmount.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{total.toFixed(2)} DH</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
              <Save className="mr-2 h-4 w-4" />
              Brouillon
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleProcessPayment}
              disabled={printingOrderId !== null}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {printingOrderId ? "Impression..." : "Payer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden ticket components for printing */}
      {printingOrderId && (
        <div className="hidden">
          <BarPreparationTicket orderId={printingOrderId} />
          <KitchenPreparationTicket orderId={printingOrderId} />
        </div>
      )}
    </div>
  );
}
