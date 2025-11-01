import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, ShoppingBag, CheckCircle, XCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  table_id: string | null;
  customer_name: string | null;
  total_amount: number;
  created_at: string;
  tables: { table_number: string } | null;
  order_items: { id: string; menu_item_id: string; quantity: number }[];
}

export default function POSOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    loadOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables(table_number),
        order_items(id, menu_item_id, quantity)
      `)
      .not("status", "in", '("completed","cancelled")')
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setOrders(data || []);
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase.rpc("confirm_order", {
        _order_id: orderId,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; insufficient_items?: any[] };

      if (!result.success) {
        toast({
          title: "Stock insuffisant",
          description: "Certains articles n'ont pas assez de stock",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Commande confirmée",
        description: "La commande a été confirmée et le stock déduit",
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

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `Commande mise à jour: ${status}`,
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

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    try {
      const { data, error } = await supabase.rpc("cancel_order", {
        _order_id: selectedOrder.id,
      });

      if (error) throw error;

      toast({
        title: "Commande annulée",
        description: "La commande a été annulée et le stock restauré",
      });

      setShowCancelDialog(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      confirmed: { variant: "default", label: "Confirmée" },
      preparing: { variant: "default", label: "En préparation" },
      ready: { variant: "default", label: "Prête" },
      served: { variant: "default", label: "Servie" },
    };

    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dine_in: "Sur place",
      takeaway: "À emporter",
      delivery: "Livraison",
    };
    return labels[type] || type;
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus === "all") return true;
    return order.status === selectedStatus;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Commandes actives</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmées</TabsTrigger>
              <TabsTrigger value="preparing">En préparation</TabsTrigger>
              <TabsTrigger value="ready">Prêtes</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{order.order_number}</CardTitle>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{getOrderTypeLabel(order.order_type)}</span>
                </div>
                {order.tables && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Table:</span>
                    <span className="font-medium">{order.tables.table_number}</span>
                  </div>
                )}
                {order.customer_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Articles:</span>
                  <span className="font-medium">{order.order_items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-primary">{order.total_amount.toFixed(2)} DH</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(order.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {order.status === "pending" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleConfirmOrder(order.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer
                  </Button>
                )}
                {order.status === "confirmed" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateStatus(order.id, "preparing")}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    En préparation
                  </Button>
                )}
                {order.status === "preparing" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateStatus(order.id, "ready")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marquer prête
                  </Button>
                )}
                {order.status === "ready" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateStatus(order.id, "served")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Servie
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowCancelDialog(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Aucune commande active
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler la commande {selectedOrder?.order_number} ?
              Le stock sera restauré si la commande a été confirmée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder}>Oui, annuler</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
