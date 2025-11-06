import { supabase } from "@/integrations/supabase/client";

export interface PrintableOrderItem {
  name: string;
  quantity: number;
  category?: string;
  pos_category_name?: string;
  special_instructions?: string;
}

export interface OrderPrintData {
  order_id: string;
  order_number: string;
  table_number?: string;
  items: PrintableOrderItem[];
  created_at: string;
}

/**
 * Fetches order data for printing
 */
export async function getOrderPrintData(orderId: string): Promise<OrderPrintData | null> {
  try {
    const { data: orderData, error } = await supabase
      .from("orders")
      .select(`
        id,
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

    if (error) throw error;

    const items: PrintableOrderItem[] = orderData.order_items.map((item: any) => ({
      name: item.menu_items.name,
      quantity: item.quantity,
      category: item.menu_items.category,
      pos_category_name: item.menu_items.pos_categories?.name,
      special_instructions: item.special_instructions,
    }));

    return {
      order_id: orderData.id,
      order_number: orderData.order_number,
      table_number: orderData.tables?.table_number,
      items,
      created_at: orderData.created_at,
    };
  } catch (error) {
    console.error("Error fetching order print data:", error);
    return null;
  }
}

/**
 * Categorizes order items into Bar and Cuisine categories
 */
export function categorizeOrderItems(items: PrintableOrderItem[]) {
  const barItems = items.filter(
    (item) => item.category === "Bar" || item.pos_category_name === "Bar"
  );

  const cuisineItems = items.filter(
    (item) => item.category === "Cuisine" || item.pos_category_name === "Cuisine"
  );

  return { barItems, cuisineItems };
}

/**
 * Opens print dialog for a specific ticket type
 * Note: Due to browser security, users must manually select the printer
 */
export function printTicket(ticketType: "bar" | "kitchen" | "customer") {
  // Set data attribute to control which ticket to print
  document.body.setAttribute("data-print-target", ticketType);
  
  // Trigger print dialog
  window.print();
  
  // Clean up
  setTimeout(() => {
    document.body.removeAttribute("data-print-target");
  }, 100);
}

/**
 * Prints all necessary tickets for an order
 */
export async function printOrderTickets(orderId: string): Promise<{
  barPrinted: boolean;
  kitchenPrinted: boolean;
}> {
  console.log("Fetching order data for printing:", orderId);
  const orderData = await getOrderPrintData(orderId);
  
  if (!orderData) {
    console.error("Could not fetch order data for printing");
    return { barPrinted: false, kitchenPrinted: false };
  }

  console.log("Order data fetched:", orderData);
  const { barItems, cuisineItems } = categorizeOrderItems(orderData.items);
  console.log("Categorized items:", { barItems: barItems.length, cuisineItems: cuisineItems.length });

  let barPrinted = false;
  let kitchenPrinted = false;

  // Print bar ticket if there are bar items
  if (barItems.length > 0) {
    console.log("Printing bar ticket...");
    printTicket("bar");
    barPrinted = true;
    // Increased delay between prints
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print kitchen ticket if there are cuisine items
  if (cuisineItems.length > 0) {
    console.log("Printing kitchen ticket...");
    printTicket("kitchen");
    kitchenPrinted = true;
  }

  return { barPrinted, kitchenPrinted };
}

/**
 * Prints customer receipt (called after payment)
 */
export function printCustomerReceipt() {
  printTicket("customer");
}
