import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, X, Search, ShoppingCart, Save, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MenuItem {
  id: string;
  name: string;
  selling_price: number;
  category: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Table {
  id: string;
  table_number: string;
  seating_capacity: number;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder>({
    order_type: "dine_in",
    items: [],
  });
  const [taxRate, setTaxRate] = useState(10);
  const [employeeId, setEmployeeId] = useState<string>("");

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
    // Load categories
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (cats) setCategories(cats);

    // Load menu items
    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (items) setMenuItems(items);

    // Load tables
    const { data: tbls } = await supabase
      .from("tables")
      .select("*")
      .order("table_number");
    if (tbls) setTables(tbls);

    // Load tax rate
    const { data: settings } = await supabase
      .from("app_settings")
      .select("tax_rate")
      .single();
    if (settings && settings.tax_rate) {
      setTaxRate(Number(settings.tax_rate) || 10);
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addItemToOrder = (menuItem: MenuItem) => {
    const existingItemIndex = currentOrder.items.findIndex(
      (item) => item.menu_item_id === menuItem.id
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...currentOrder.items];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].subtotal =
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unit_price;
      setCurrentOrder({ ...currentOrder, items: updatedItems });
    } else {
      setCurrentOrder({
        ...currentOrder,
        items: [
          ...currentOrder.items,
          {
            menu_item_id: menuItem.id,
            menu_item_name: menuItem.name,
            quantity: 1,
            unit_price: menuItem.selling_price,
            subtotal: menuItem.selling_price,
          },
        ],
      });
    }
  };

  const updateItemQuantity = (index: number, delta: number) => {
    const updatedItems = [...currentOrder.items];
    updatedItems[index].quantity = Math.max(1, updatedItems[index].quantity + delta);
    updatedItems[index].subtotal = updatedItems[index].quantity * updatedItems[index].unit_price;
    setCurrentOrder({ ...currentOrder, items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = currentOrder.items.filter((_, i) => i !== index);
    setCurrentOrder({ ...currentOrder, items: updatedItems });
  };

  const updateInstructions = (index: number, instructions: string) => {
    const updatedItems = [...currentOrder.items];
    updatedItems[index].special_instructions = instructions;
    setCurrentOrder({ ...currentOrder, items: updatedItems });
  };

  const calculateTotals = () => {
    const subtotal = currentOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSaveDraft = async () => {
    if (currentOrder.items.length === 0) {
      toast({
        title: "Erreur",
        description: "Ajoutez au moins un article à la commande",
        variant: "destructive",
      });
      return;
    }

    if (currentOrder.order_type === "dine_in" && !currentOrder.table_id) {
      toast({
        title: "Erreur",
        description: "Sélectionnez une table pour les commandes sur place",
        variant: "destructive",
      });
      return;
    }

    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          order_type: currentOrder.order_type,
          table_id: currentOrder.table_id || null,
          customer_name: currentOrder.customer_name,
          customer_phone: currentOrder.customer_phone,
          notes: currentOrder.notes,
          employee_id: employeeId,
          status: "draft",
          total_amount: total,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = currentOrder.items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.subtotal,
        special_instructions: item.special_instructions || "",
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Commande enregistrée",
        description: `Commande ${order.order_number} enregistrée avec succès`,
      });

      // Reset order
      setCurrentOrder({
        order_type: "dine_in",
        items: [],
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessPayment = async () => {
    if (currentOrder.items.length === 0) {
      toast({
        title: "Erreur",
        description: "Ajoutez au moins un article à la commande",
        variant: "destructive",
      });
      return;
    }

    if (currentOrder.order_type === "dine_in" && !currentOrder.table_id) {
      toast({
        title: "Erreur",
        description: "Sélectionnez une table pour les commandes sur place",
        variant: "destructive",
      });
      return;
    }

    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          order_type: currentOrder.order_type,
          table_id: currentOrder.table_id || null,
          customer_name: currentOrder.customer_name,
          customer_phone: currentOrder.customer_phone,
          notes: currentOrder.notes,
          employee_id: employeeId,
          status: "pending",
          total_amount: total,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = currentOrder.items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.subtotal,
        special_instructions: item.special_instructions || "",
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Navigate to payment page
      navigate(`/pos/payment/${order.id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();
  const availableTables = tables.filter((t) => t.status === "available");

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left Side - Menu Selection */}
      <div className="flex-1 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardHeader>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-3">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <ScrollArea className="w-full">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.name}>
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredMenuItems.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addItemToOrder(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary" className="w-fit text-xs">
                          {item.category}
                        </Badge>
                        <h3 className="font-semibold text-sm line-clamp-2">{item.name}</h3>
                        <p className="text-lg font-bold text-primary">{item.selling_price} DH</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Current Order */}
      <div className="w-96 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Commande en cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type de commande</Label>
              <Select
                value={currentOrder.order_type}
                onValueChange={(value: any) =>
                  setCurrentOrder({ ...currentOrder, order_type: value, table_id: undefined })
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
              <div className="space-y-2">
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
                    {availableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.table_number} ({table.seating_capacity} places)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentOrder.order_type !== "dine_in" && (
              <>
                <div className="space-y-2">
                  <Label>Nom du client</Label>
                  <Input
                    value={currentOrder.customer_name || ""}
                    onChange={(e) =>
                      setCurrentOrder({ ...currentOrder, customer_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
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

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={currentOrder.notes || ""}
                onChange={(e) =>
                  setCurrentOrder({ ...currentOrder, notes: e.target.value })
                }
                placeholder="Notes spéciales..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle>Articles ({currentOrder.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-32rem)]">
              <div className="space-y-3">
                {currentOrder.items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{item.menu_item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.unit_price} DH × {item.quantity} = {item.subtotal} DH
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(index, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(index, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Instructions spéciales..."
                        value={item.special_instructions || ""}
                        onChange={(e) => updateInstructions(index, e.target.value)}
                        className="text-xs"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA ({taxRate}%)</span>
                <span>{taxAmount.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>{total.toFixed(2)} DH</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSaveDraft}
                disabled={currentOrder.items.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Brouillon
              </Button>
              <Button
                className="flex-1"
                onClick={handleProcessPayment}
                disabled={currentOrder.items.length === 0}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Payer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
