import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, ChefHat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  special_instructions: string | null;
  preparation_status: string;
  menu_items: {
    name: string;
    preparation_display: string | null;
  };
}

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  table_id: string | null;
  customer_name: string | null;
  created_at: string;
  tables: { table_number: string } | null;
  order_items: OrderItem[];
}

export default function KitchenDisplay() {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!tenantId) return;

    loadOrders();

    // Subscribe to realtime updates - immediate refresh
    const channel = supabase
      .channel("kitchen_orders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` },
        () => {
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `tenant_id=eq.${tenantId}` },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const loadOrders = async () => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables(table_number),
        order_items(
          id,
          menu_item_id,
          quantity,
          special_instructions,
          preparation_status,
          menu_items(
            name,
            preparation_display
          )
        )
      `)
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "preparing", "sent_for_preparation"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading orders:", error);
      return;
    }

    // Filter orders to only include those with kitchen preparation items that are NOT ready
    const ordersWithKitchenItems = (data || [])
      .map((order: any) => ({
        ...order,
        order_items: order.order_items.filter((item: OrderItem) => {
          return item.menu_items.preparation_display === "kitchen" && 
                 item.preparation_status !== "ready";
        }),
      }))
      .filter((order: Order) => order.order_items.length > 0);

    setOrders(ordersWithKitchenItems);
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      // Get all kitchen items for this order
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const kitchenItemIds = order.order_items.map(item => item.id);

      // Mark only kitchen items as ready
      const { error: itemsError } = await supabase
        .from("order_items")
        .update({ preparation_status: "ready" })
        .in("id", kitchenItemIds);

      if (itemsError) throw itemsError;

      // Check if ALL items (kitchen + bar) are now ready
      const { data: allItems, error: checkError } = await supabase
        .from("order_items")
        .select("id, preparation_status")
        .eq("order_id", orderId);

      if (checkError) throw checkError;

      const allReady = allItems?.every(item => item.preparation_status === "ready");

      // Only update order status to ready if ALL items are ready
      if (allReady) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "ready" })
          .eq("id", orderId);

        if (orderError) throw orderError;
      }

      toast({
        title: "Préparation cuisine terminée",
        description: allReady 
          ? "Toute la commande est prête" 
          : "Articles cuisine prêts, en attente du bar",
      });

      loadOrders();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOrderPriority = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes > 15) return "high";
    if (minutes > 10) return "medium";
    return "low";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50 dark:bg-red-950";
      case "medium":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      default:
        return "border-green-500 bg-green-50 dark:bg-green-950";
    }
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dine_in: "Sur place",
      takeaway: "À emporter",
      delivery: "Livraison",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-green-600" />
              <CardTitle className="text-2xl">Affichage Cuisine</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-green-600 font-medium">Temps réel</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">Aucune commande cuisine en attente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const priority = getOrderPriority(order.created_at);
            const priorityColor = getPriorityColor(priority);

            return (
              <Card
                key={order.id}
                className={`border-2 ${priorityColor} transition-all duration-300`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">
                      {order.order_number}
                    </CardTitle>
                    {priority === "high" && (
                      <AlertCircle className="h-6 w-6 text-red-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline">{getOrderTypeLabel(order.order_type)}</Badge>
                    {order.tables && (
                      <span className="font-semibold text-lg">
                        Table: {order.tables.table_number}
                      </span>
                    )}
                    {order.customer_name && (
                      <span className="font-medium">{order.customer_name}</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <Card key={item.id} className="bg-background">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className="text-lg px-3 py-1">
                                  {item.quantity}x
                                </Badge>
                                <span className="font-semibold text-lg">
                                  {item.menu_items.name}
                                </span>
                              </div>
                              {item.special_instructions && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  📝 {item.special_instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    className="w-full text-lg py-6"
                    size="lg"
                    onClick={() => handleMarkReady(order.id)}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Marquer comme prête
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}