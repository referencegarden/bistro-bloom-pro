import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, Smartphone, FileText, CheckCircle, Printer } from "lucide-react";
import { Receipt } from "@/components/Receipt";
import { useTenant } from "@/contexts/TenantContext";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  order_type: string;
  customer_name: string | null;
  tables: { table_number: string } | null;
}

export default function POSPayment() {
  const { orderId, slug } = useParams<{ orderId: string; slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useTenant();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptLoaded, setReceiptLoaded] = useState(false);

  useEffect(() => {
    loadOrder();
    loadEmployee();
  }, [orderId]);

  useEffect(() => {
    if (paymentSuccess && receiptLoaded) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [paymentSuccess, receiptLoaded]);

  const loadEmployee = async () => {
    const savedSession = localStorage.getItem('pos_active_employee');
    
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setEmployeeId(session.id);
      return;
    }
    
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

  const loadOrder = async () => {
    if (!orderId) return;

    const { data, error } = await supabase
      .from("orders")
      .select("*, tables(table_number)")
      .eq("id", orderId)
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setOrder(data);
    setReceivedAmount(data.total_amount.toString());
  };

  const handlePayment = async () => {
    if (!order) return;

    if (!tenantId) {
      toast({
        title: "Erreur",
        description: "Contexte restaurant non chargé",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Confirm order if not already confirmed
      if (order.order_type !== "completed") {
        const { data: confirmResult, error: confirmError } = await supabase.rpc("confirm_order", {
          _order_id: order.id,
        });

        if (confirmError) throw confirmError;

        const result = confirmResult as { success: boolean; message?: string };
        if (!result.success) {
          toast({
            title: "Stock insuffisant",
            description: "Impossible de confirmer la commande",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }
      }

      // Create payment record
      const changeAmount = paymentMethod === "cash" 
        ? Math.max(0, parseFloat(receivedAmount) - order.total_amount)
        : 0;

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? parseFloat(receivedAmount) : order.total_amount,
          change_amount: changeAmount,
          employee_id: employeeId || null,
          tenant_id: tenantId,
        });

      if (paymentError) throw paymentError;

      // Update order status to completed
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      if (orderError) throw orderError;

      toast({
        title: "Paiement effectué",
        description: `Commande ${order.order_number} payée avec succès`,
      });

      setPaymentSuccess(true);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Paiement Confirmé!</h2>
            <p className="text-muted-foreground">Le reçu va s'imprimer automatiquement</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.print()} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Réimprimer le Reçu
              </Button>
              <Button onClick={() => navigate(`/${slug}/pos`)}>
                Retour au POS
              </Button>
            </div>
          </div>
        </Card>
        <div className="hidden print:block">
          <Receipt orderId={orderId!} onDataLoaded={() => setReceiptLoaded(true)} />
        </div>
      </div>
    );
  }

  const changeAmount = paymentMethod === "cash" 
    ? Math.max(0, parseFloat(receivedAmount || "0") - order.total_amount)
    : 0;

  const canProcess = paymentMethod === "cash" 
    ? parseFloat(receivedAmount || "0") >= order.total_amount
    : true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Paiement - {order.order_number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium">
                {order.order_type === "dine_in" ? "Sur place" : 
                 order.order_type === "takeaway" ? "À emporter" : "Livraison"}
              </p>
            </div>
            {order.tables && (
              <div>
                <span className="text-muted-foreground">Table:</span>
                <p className="font-medium">{order.tables.table_number}</p>
              </div>
            )}
            {order.customer_name && (
              <div>
                <span className="text-muted-foreground">Client:</span>
                <p className="font-medium">{order.customer_name}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between py-4">
            <span className="text-2xl font-bold">Total à payer</span>
            <span className="text-3xl font-bold text-primary">
              {order.total_amount.toFixed(2)} DH
            </span>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-lg">Méthode de paiement</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${
                    paymentMethod === "cash" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setPaymentMethod("cash")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                      <Banknote className="h-5 w-5" />
                      <span>Espèces</span>
                    </Label>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    paymentMethod === "card" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setPaymentMethod("card")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-5 w-5" />
                      <span>Carte</span>
                    </Label>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    paymentMethod === "mobile_money" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setPaymentMethod("mobile_money")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="mobile_money" id="mobile_money" />
                    <Label htmlFor="mobile_money" className="flex items-center gap-2 cursor-pointer">
                      <Smartphone className="h-5 w-5" />
                      <span>Mobile Money</span>
                    </Label>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    paymentMethod === "check" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setPaymentMethod("check")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="check" id="check" />
                    <Label htmlFor="check" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-5 w-5" />
                      <span>Chèque</span>
                    </Label>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Montant reçu</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="Montant reçu"
                  className="text-lg"
                />
              </div>

              {changeAmount > 0 && (
                <Card className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">Monnaie à rendre</span>
                      <span className="text-2xl font-bold text-primary">
                        {changeAmount.toFixed(2)} DH
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/${slug}/pos`)}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handlePayment}
              disabled={!canProcess || processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? "Traitement..." : "Confirmer le paiement"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
