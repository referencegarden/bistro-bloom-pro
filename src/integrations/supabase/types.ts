export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          admin_logo_url: string | null
          background_color: string
          created_at: string
          id: string
          login_logo_url: string | null
          primary_color: string
          restaurant_name: string
          secondary_color: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          admin_logo_url?: string | null
          background_color?: string
          created_at?: string
          id?: string
          login_logo_url?: string | null
          primary_color?: string
          restaurant_name?: string
          secondary_color?: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          admin_logo_url?: string | null
          background_color?: string
          created_at?: string
          id?: string
          login_logo_url?: string | null
          primary_color?: string
          restaurant_name?: string
          secondary_color?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          confirmed: boolean | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          ip_address: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
          wifi_ssid: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          wifi_ssid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      employee_permissions: {
        Row: {
          can_access_pos_reports: boolean
          can_create_demands: boolean
          can_make_sales: boolean
          can_manage_attendance: boolean
          can_manage_orders: boolean
          can_manage_stock: boolean
          can_manage_suppliers: boolean
          can_process_payments: boolean
          can_use_pos: boolean
          can_view_kitchen_display: boolean
          can_view_products: boolean
          can_view_reports: boolean
          created_at: string
          employee_id: string
          id: string
          updated_at: string
        }
        Insert: {
          can_access_pos_reports?: boolean
          can_create_demands?: boolean
          can_make_sales?: boolean
          can_manage_attendance?: boolean
          can_manage_orders?: boolean
          can_manage_stock?: boolean
          can_manage_suppliers?: boolean
          can_process_payments?: boolean
          can_use_pos?: boolean
          can_view_kitchen_display?: boolean
          can_view_products?: boolean
          can_view_reports?: boolean
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          can_access_pos_reports?: boolean
          can_create_demands?: boolean
          can_make_sales?: boolean
          can_manage_attendance?: boolean
          can_manage_orders?: boolean
          can_manage_stock?: boolean
          can_manage_suppliers?: boolean
          can_process_payments?: boolean
          can_use_pos?: boolean
          can_view_kitchen_display?: boolean
          can_view_products?: boolean
          can_view_reports?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string | null
          employee_number: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pin_enabled: boolean
          pin_hash: string | null
          position: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          employee_number?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          pin_enabled?: boolean
          pin_hash?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          employee_number?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          pin_enabled?: boolean
          pin_hash?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      menu_item_ingredients: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          product_id: string
          quantity_per_unit: number
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          product_id: string
          quantity_per_unit: number
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          product_id?: string
          quantity_per_unit?: number
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_sales: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          menu_item_id: string
          notes: string | null
          quantity: number
          sale_date: string | null
          total_price: number | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          menu_item_id: string
          notes?: string | null
          quantity: number
          sale_date?: string | null
          total_price?: number | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          menu_item_id?: string
          notes?: string | null
          quantity?: number
          sale_date?: string | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_sales_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pos_category_id: string | null
          selling_price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pos_category_id?: string | null
          selling_price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pos_category_id?: string | null
          selling_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_pos_category_id_fkey"
            columns: ["pos_category_id"]
            isOneToOne: false
            referencedRelation: "pos_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          quantity: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          employee_id: string | null
          id: string
          notes: string | null
          order_number: string
          order_type: string
          status: string
          table_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          order_type: string
          status?: string
          table_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: string
          status?: string
          table_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_splits: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          payment_method: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          payment_method: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_splits_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paid: number
          change_amount: number
          created_at: string
          employee_id: string | null
          id: string
          order_id: string
          payment_method: string
        }
        Insert: {
          amount_paid: number
          change_amount?: number
          created_at?: string
          employee_id?: string | null
          id?: string
          order_id: string
          payment_method: string
        }
        Update: {
          amount_paid?: number
          change_amount?: number
          created_at?: string
          employee_id?: string | null
          id?: string
          order_id?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_demands: {
        Row: {
          fulfilled_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["demand_status"]
          updated_at: string
        }
        Insert: {
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
        }
        Update: {
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_demands_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_demands_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string | null
          current_stock: number
          id: string
          low_stock_threshold: number
          name: string
          sales_price: number
          supplier_id: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          low_stock_threshold?: number
          name: string
          sales_price?: number
          supplier_id?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          low_stock_threshold?: number
          name?: string
          sales_price?: number
          supplier_id?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          demand_id: string | null
          employee_id: string | null
          id: string
          notes: string | null
          product_id: string
          purchase_date: string | null
          quantity: number
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          demand_id?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_date?: string | null
          quantity: number
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost: number
        }
        Update: {
          demand_id?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_date?: string | null
          quantity?: number
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "product_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          employee_id: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          sale_date: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          employee_id?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          sale_date?: string | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          employee_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          sale_date?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      tables: {
        Row: {
          created_at: string
          id: string
          seating_capacity: number
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          seating_capacity?: number
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          seating_capacity?: number
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin: { Args: { target_email: string }; Returns: Json }
      calculate_ingredient_usage: {
        Args: { _menu_item_id: string; _quantity: number }
        Returns: {
          available_stock: number
          product_id: string
          product_name: string
          quantity_needed: number
          unit_of_measure: string
        }[]
      }
      calculate_work_hours: {
        Args: { _date_from: string; _date_to: string; _employee_id: string }
        Returns: {
          days_present: number
          total_hours: number
        }[]
      }
      cancel_order: { Args: { _order_id: string }; Returns: Json }
      confirm_order: { Args: { _order_id: string }; Returns: Json }
      generate_receipt_data: { Args: { _order_id: string }; Returns: Json }
      get_unit_conversion_factor: {
        Args: { from_unit: string; to_unit: string }
        Returns: number
      }
      has_employee_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_wifi_ssid: { Args: { _ssid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "employee"
      demand_status: "pending" | "in_stock" | "fulfilled" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "employee"],
      demand_status: ["pending", "in_stock", "fulfilled", "cancelled"],
    },
  },
} as const
