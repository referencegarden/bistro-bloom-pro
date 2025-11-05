import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface KitchenPreparationTicketProps {
  orderId: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  special_instructions?: string;
}

interface TicketData {
  order_number: string;
  table_number?: string;
  items: OrderItem[];
  created_at: string;
}

export function KitchenPreparationTicket({ orderId }: KitchenPreparationTicketProps) {
  const [data, setData] = useState<TicketData | null>(null);

  useEffect(() => {
    loadTicketData();
  }, [orderId]);

  const loadTicketData = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          order_number,
          created_at,
          tables (table_number),
          order_items (
            quantity,
            special_instructions,
            menu_items (
              name,
              category,
              pos_category_id,
              pos_categories (name)
            )
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Filter only Cuisine items
      const cuisineItems = orderData.order_items
        .filter((item: any) => 
          item.menu_items.category === "Cuisine" || 
          item.menu_items.pos_categories?.name === "Cuisine"
        )
        .map((item: any) => ({
          name: item.menu_items.name,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
        }));

      setData({
        order_number: orderData.order_number,
        table_number: orderData.tables?.table_number,
        items: cuisineItems,
        created_at: orderData.created_at,
      });
    } catch (error) {
      console.error("Error loading kitchen ticket:", error);
    }
  };

  if (!data || data.items.length === 0) {
    return null;
  }

  return (
    <div className="kitchen-ticket preparation-ticket bg-white text-black p-4 max-w-[80mm] mx-auto font-mono" data-ticket-type="kitchen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .kitchen-ticket, .kitchen-ticket * {
            visibility: visible;
          }
          .kitchen-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            padding: 2mm;
            margin: 0;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      <div className="prep-header text-center mb-4 border-b-2 border-dashed border-gray-800 pb-2">
        <h1 className="text-2xl font-bold">🍽️ CUISINE</h1>
        <p className="text-xs mt-1">Ticket de Préparation</p>
      </div>

      <div className="mb-3 text-sm space-y-1">
        <div className="flex justify-between font-bold">
          <span>Commande:</span>
          <span>{data.order_number}</span>
        </div>
        {data.table_number && (
          <div className="flex justify-between font-bold">
            <span>Table:</span>
            <span className="text-lg">{data.table_number}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Heure:</span>
          <span className="font-bold">{new Date(data.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      <div className="border-t-2 border-gray-800 pt-3">
        {data.items.map((item, index) => (
          <div key={index} className="prep-item mb-3 pb-3 border-b border-gray-300">
            <div className="flex items-start gap-3">
              <span className="prep-item-quantity text-2xl font-bold min-w-[20mm]">
                {item.quantity}x
              </span>
              <div className="flex-1">
                <div className="prep-item-name text-lg font-bold uppercase">
                  {item.name}
                </div>
                {item.special_instructions && (
                  <div className="prep-item-notes mt-1 text-sm italic text-gray-700">
                    ⚠️ {item.special_instructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="prep-time text-center mt-4 pt-3 border-t-2 border-dashed border-gray-800">
        <p className="text-lg font-bold">
          {new Date(data.created_at).toLocaleTimeString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
