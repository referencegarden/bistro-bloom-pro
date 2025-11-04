import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptProps {
  orderId: string;
  onDataLoaded?: () => void;
}

interface ReceiptData {
  order: {
    order_number: string;
    order_type: string;
    table_number?: string;
    customer_name?: string;
    customer_phone?: string;
    total_amount: number;
    created_at: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
  }>;
  payment: {
    payment_method: string;
    amount_paid: number;
    change_amount: number;
  };
  settings: {
    restaurant_name: string;
    tax_rate: number;
  };
}

export function Receipt({ orderId, onDataLoaded }: ReceiptProps) {
  const [data, setData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    loadReceiptData();
  }, [orderId]);

  const loadReceiptData = async () => {
    try {
      const { data: receiptData, error } = await supabase.rpc(
        "generate_receipt_data",
        { _order_id: orderId }
      );

      if (error) throw error;
      setData(receiptData as unknown as ReceiptData);
      onDataLoaded?.();
    } catch (error) {
      console.error("Error loading receipt:", error);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const subtotal = data.items.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = subtotal * (data.settings.tax_rate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="receipt-container bg-white text-black p-6 max-w-[80mm] mx-auto font-mono text-sm">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            padding: 2mm;
            margin: 0;
            font-size: 7pt;
          }
          @page {
            size: 80mm 55mm;
            margin: 0;
          }
          .receipt-container h1 {
            font-size: 12pt;
            margin-bottom: 1mm;
          }
          .receipt-container p, .receipt-container div {
            font-size: 7pt;
            line-height: 1.2;
          }
          .receipt-container table {
            font-size: 7pt;
          }
        }
      `}</style>

      <div className="text-center mb-4 border-b-2 border-dashed border-gray-400 pb-4">
        <h1 className="text-xl font-bold mb-1">{data.settings.restaurant_name}</h1>
        <p className="text-xs">Ticket de Caisse</p>
      </div>

      <div className="mb-4 text-xs space-y-1">
        <div className="flex justify-between">
          <span>N° Commande:</span>
          <span className="font-bold">{data.order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span>Type:</span>
          <span>{data.order.order_type}</span>
        </div>
        {data.order.table_number && (
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{data.order.table_number}</span>
          </div>
        )}
        {data.order.customer_name && (
          <div className="flex justify-between">
            <span>Client:</span>
            <span>{data.order.customer_name}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{new Date(data.order.created_at).toLocaleString("fr-FR")}</span>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-gray-400 pt-2 mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1">Article</th>
              <th className="text-center py-1">Qté</th>
              <th className="text-right py-1">Prix</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2">
                  <div>{item.name}</div>
                  {item.special_instructions && (
                    <div className="text-[10px] text-gray-600 italic">
                      {item.special_instructions}
                    </div>
                  )}
                </td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{item.unit_price.toFixed(2)}</td>
                <td className="text-right font-bold">{item.total_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-dashed border-gray-400 pt-2 mb-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Sous-total:</span>
          <span>{subtotal.toFixed(2)} DH</span>
        </div>
        <div className="flex justify-between">
          <span>TVA ({data.settings.tax_rate}%):</span>
          <span>{taxAmount.toFixed(2)} DH</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t border-gray-400 pt-2 mt-2">
          <span>TOTAL:</span>
          <span>{total.toFixed(2)} DH</span>
        </div>
      </div>

      {data.payment && (
        <div className="border-t-2 border-dashed border-gray-400 pt-2 mb-4 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Mode de paiement:</span>
            <span className="uppercase">{data.payment.payment_method}</span>
          </div>
          <div className="flex justify-between">
            <span>Montant reçu:</span>
            <span>{data.payment.amount_paid.toFixed(2)} DH</span>
          </div>
          {data.payment.change_amount > 0 && (
            <div className="flex justify-between font-bold">
              <span>Rendu:</span>
              <span>{data.payment.change_amount.toFixed(2)} DH</span>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-xs border-t-2 border-dashed border-gray-400 pt-4 mt-4">
        <p className="mb-1">Merci de votre visite!</p>
        <p className="text-[10px] text-gray-600">À bientôt</p>
      </div>
    </div>
  );
}
