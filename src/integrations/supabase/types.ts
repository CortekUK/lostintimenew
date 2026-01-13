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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          updated_at: string
          values: Json
        }
        Insert: {
          id?: number
          updated_at?: string
          values?: Json
        }
        Update: {
          id?: number
          updated_at?: string
          values?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          id: number
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          row_pk: string
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          id?: number
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          row_pk: string
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          id?: number
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          row_pk?: string
          table_name?: string
        }
        Relationships: []
      }
      consignment_settlements: {
        Row: {
          agreed_price: number | null
          created_at: string | null
          id: number
          notes: string | null
          paid_at: string | null
          payout_amount: number | null
          product_id: number
          sale_id: number | null
          sale_price: number | null
          supplier_id: number
        }
        Insert: {
          agreed_price?: number | null
          created_at?: string | null
          id?: number
          notes?: string | null
          paid_at?: string | null
          payout_amount?: number | null
          product_id: number
          sale_id?: number | null
          sale_price?: number | null
          supplier_id: number
        }
        Update: {
          agreed_price?: number | null
          created_at?: string | null
          id?: number
          notes?: string | null
          paid_at?: string | null
          payout_amount?: number | null
          product_id?: number
          sale_id?: number | null
          sale_price?: number | null
          supplier_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_settlements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_settlements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "consignment_settlements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "consignment_settlements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string
          customer_id: number
          id: number
          preference_type: string
          preference_value: string
        }
        Insert: {
          created_at?: string
          customer_id: number
          id?: never
          preference_type: string
          preference_value: string
        }
        Update: {
          created_at?: string
          customer_id?: number
          id?: never
          preference_type?: string
          preference_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          anniversary: string | null
          birthday: string | null
          bracelet_size: string | null
          created_at: string
          demo_session_id: string | null
          email: string | null
          id: number
          lifetime_spend: number
          metal_preference: string | null
          name: string
          necklace_length: string | null
          notes: string | null
          phone: string | null
          ring_size: string | null
          status: string
          style_preference: string | null
          total_purchases: number
          updated_at: string
          vip_tier: string
        }
        Insert: {
          address?: string | null
          anniversary?: string | null
          birthday?: string | null
          bracelet_size?: string | null
          created_at?: string
          demo_session_id?: string | null
          email?: string | null
          id?: never
          lifetime_spend?: number
          metal_preference?: string | null
          name: string
          necklace_length?: string | null
          notes?: string | null
          phone?: string | null
          ring_size?: string | null
          status?: string
          style_preference?: string | null
          total_purchases?: number
          updated_at?: string
          vip_tier?: string
        }
        Update: {
          address?: string | null
          anniversary?: string | null
          birthday?: string | null
          bracelet_size?: string | null
          created_at?: string
          demo_session_id?: string | null
          email?: string | null
          id?: never
          lifetime_spend?: number
          metal_preference?: string | null
          name?: string
          necklace_length?: string | null
          notes?: string | null
          phone?: string | null
          ring_size?: string | null
          status?: string
          style_preference?: string | null
          total_purchases?: number
          updated_at?: string
          vip_tier?: string
        }
        Relationships: []
      }
      expense_receipts: {
        Row: {
          expense_id: number
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          expense_id: number
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          expense_id?: number
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_receipts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_templates: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          frequency: string
          id: number
          is_active: boolean
          last_generated_at: string | null
          next_due_date: string
          notes: string | null
          payment_method: string
          supplier_id: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          frequency: string
          id?: number
          is_active?: boolean
          last_generated_at?: string | null
          next_due_date: string
          notes?: string | null
          payment_method: string
          supplier_id?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          frequency?: string
          id?: number
          is_active?: boolean
          last_generated_at?: string | null
          next_due_date?: string
          notes?: string | null
          payment_method?: string
          supplier_id?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_templates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_templates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "expense_templates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "expense_templates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          amount_ex_vat: number | null
          amount_inc_vat: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          demo_session_id: string | null
          description: string | null
          id: number
          incurred_at: string
          is_cogs: boolean
          notes: string | null
          payment_method: string | null
          staff_id: string | null
          supplier_id: number | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          amount_ex_vat?: number | null
          amount_inc_vat?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          demo_session_id?: string | null
          description?: string | null
          id?: number
          incurred_at?: string
          is_cogs?: boolean
          notes?: string | null
          payment_method?: string | null
          staff_id?: string | null
          supplier_id?: number | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          amount_ex_vat?: number | null
          amount_inc_vat?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          demo_session_id?: string | null
          description?: string | null
          id?: number
          incurred_at?: string
          is_cogs?: boolean
          notes?: string | null
          payment_method?: string | null
          staff_id?: string | null
          supplier_id?: number | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          demo_session_id: string | null
          id: number
          name: string
          status: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          demo_session_id?: string | null
          id?: number
          name: string
          status?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          demo_session_id?: string | null
          id?: number
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      part_exchanges: {
        Row: {
          allowance: number
          category: string | null
          created_at: string | null
          customer_contact: string | null
          customer_name: string | null
          customer_supplier_id: number | null
          description: string | null
          id: number
          notes: string | null
          product_id: number | null
          sale_id: number
          serial: string | null
          status: string
          title: string | null
        }
        Insert: {
          allowance: number
          category?: string | null
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_supplier_id?: number | null
          description?: string | null
          id?: number
          notes?: string | null
          product_id?: number | null
          sale_id: number
          serial?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          allowance?: number
          category?: string | null
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_supplier_id?: number | null
          description?: string | null
          id?: number
          notes?: string | null
          product_id?: number | null
          sale_id?: number
          serial?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_exchanges_customer_supplier_id_fkey"
            columns: ["customer_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_exchanges_customer_supplier_id_fkey"
            columns: ["customer_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "part_exchanges_customer_supplier_id_fkey"
            columns: ["customer_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "part_exchanges_customer_supplier_id_fkey"
            columns: ["customer_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "part_exchanges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_exchanges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "part_exchanges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "part_exchanges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "part_exchanges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "part_exchanges_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      product_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["product_document_type"]
          expires_at: string | null
          file_ext: string | null
          file_size: number | null
          id: number
          note: string | null
          path: string
          product_id: number
          title: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          doc_type?: Database["public"]["Enums"]["product_document_type"]
          expires_at?: string | null
          file_ext?: string | null
          file_size?: number | null
          id?: number
          note?: string | null
          path: string
          product_id: number
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["product_document_type"]
          expires_at?: string | null
          file_ext?: string | null
          file_size?: number | null
          id?: number
          note?: string | null
          path?: string
          product_id?: number
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          consignment_end_date: string | null
          consignment_start_date: string | null
          consignment_supplier_id: number | null
          consignment_terms: string | null
          created_at: string
          demo_session_id: string | null
          description: string | null
          gemstone: string | null
          id: number
          image_url: string | null
          internal_sku: string
          is_consignment: boolean
          is_registered: boolean
          is_trade_in: boolean
          karat: string | null
          location_id: number | null
          metal: string | null
          name: string
          purchase_date: string | null
          registration_doc: string | null
          registration_doc_uploaded_at: string | null
          reorder_threshold: number
          sku: string | null
          supplier_id: number | null
          tax_rate: number
          track_stock: boolean
          unit_cost: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          consignment_end_date?: string | null
          consignment_start_date?: string | null
          consignment_supplier_id?: number | null
          consignment_terms?: string | null
          created_at?: string
          demo_session_id?: string | null
          description?: string | null
          gemstone?: string | null
          id?: number
          image_url?: string | null
          internal_sku: string
          is_consignment?: boolean
          is_registered?: boolean
          is_trade_in?: boolean
          karat?: string | null
          location_id?: number | null
          metal?: string | null
          name: string
          purchase_date?: string | null
          registration_doc?: string | null
          registration_doc_uploaded_at?: string | null
          reorder_threshold?: number
          sku?: string | null
          supplier_id?: number | null
          tax_rate?: number
          track_stock?: boolean
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          consignment_end_date?: string | null
          consignment_start_date?: string | null
          consignment_supplier_id?: number | null
          consignment_terms?: string | null
          created_at?: string
          demo_session_id?: string | null
          description?: string | null
          gemstone?: string | null
          id?: number
          image_url?: string | null
          internal_sku?: string
          is_consignment?: boolean
          is_registered?: boolean
          is_trade_in?: boolean
          karat?: string | null
          location_id?: number | null
          metal?: string | null
          name?: string
          purchase_date?: string | null
          registration_doc?: string | null
          registration_doc_uploaded_at?: string | null
          reorder_threshold?: number
          sku?: string | null
          supplier_id?: number | null
          tax_rate?: number
          track_stock?: boolean
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_consignment_supplier_id_fkey"
            columns: ["consignment_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_consignment_supplier_id_fkey"
            columns: ["consignment_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_consignment_supplier_id_fkey"
            columns: ["consignment_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_consignment_supplier_id_fkey"
            columns: ["consignment_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          discount: number
          id: number
          product_id: number | null
          quantity: number
          sale_id: number
          tax_rate: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: number
          product_id?: number | null
          quantity: number
          sale_id: number
          tax_rate?: number
          unit_cost: number
          unit_price: number
        }
        Update: {
          discount?: number
          id?: number
          product_id?: number | null
          quantity?: number
          sale_id?: number
          tax_rate?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          customer_email: string | null
          customer_id: number | null
          customer_name: string | null
          demo_session_id: string | null
          discount_total: number
          edit_reason: string | null
          edited_at: string | null
          edited_by: string | null
          id: number
          is_voided: boolean
          notes: string | null
          original_total: number | null
          part_exchange_total: number | null
          payment: Database["public"]["Enums"]["payment_method"]
          signature_data: string | null
          sold_at: string
          staff_id: string | null
          staff_member_name: string | null
          subtotal: number
          tax_total: number
          total: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          customer_email?: string | null
          customer_id?: number | null
          customer_name?: string | null
          demo_session_id?: string | null
          discount_total?: number
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: number
          is_voided?: boolean
          notes?: string | null
          original_total?: number | null
          part_exchange_total?: number | null
          payment?: Database["public"]["Enums"]["payment_method"]
          signature_data?: string | null
          sold_at?: string
          staff_id?: string | null
          staff_member_name?: string | null
          subtotal?: number
          tax_total?: number
          total?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          customer_email?: string | null
          customer_id?: number | null
          customer_name?: string | null
          demo_session_id?: string | null
          discount_total?: number
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: number
          is_voided?: boolean
          notes?: string | null
          original_total?: number | null
          part_exchange_total?: number | null
          payment?: Database["public"]["Enums"]["payment_method"]
          signature_data?: string | null
          sold_at?: string
          staff_id?: string | null
          staff_member_name?: string | null
          subtotal?: number
          tax_total?: number
          total?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_staff_id"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_by: string | null
          id: number
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note: string | null
          occurred_at: string
          product_id: number
          quantity: number
          related_sale_id: number | null
          supplier_id: number | null
          unit_cost: number | null
        }
        Insert: {
          created_by?: string | null
          id?: number
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          occurred_at?: string
          product_id: number
          quantity: number
          related_sale_id?: number | null
          supplier_id?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_by?: string | null
          id?: number
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          occurred_at?: string
          product_id?: number
          quantity?: number
          related_sale_id?: number | null
          supplier_id?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_related_sale_id_fkey"
            columns: ["related_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          doc_type: string
          file_ext: string | null
          file_path: string
          file_size: number | null
          id: number
          note: string | null
          supplier_id: number
          title: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          doc_type?: string
          file_ext?: string | null
          file_path: string
          file_size?: number | null
          id?: never
          note?: string | null
          supplier_id: number
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          doc_type?: string
          file_ext?: string | null
          file_path?: string
          file_size?: number | null
          id?: never
          note?: string | null
          supplier_id?: number
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_customer_supplier_payouts"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_spend"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          demo_session_id: string | null
          email: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          supplier_type: string
          tags: string[] | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          demo_session_id?: string | null
          email?: string | null
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          supplier_type?: string
          tags?: string[] | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          demo_session_id?: string | null
          email?: string | null
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          supplier_type?: string
          tags?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      v_consign_unsettled: {
        Row: {
          agreed_price: number | null
          internal_sku: string | null
          notes: string | null
          paid_at: string | null
          payout_amount: number | null
          product_id: number | null
          product_name: string | null
          sale_id: number | null
          sale_price: number | null
          sale_total: number | null
          settlement_id: number | null
          sold_at: string | null
          supplier_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consignment_settlements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_reminders: {
        Row: {
          customer_id: number | null
          email: string | null
          event_date: string | null
          name: string | null
          phone: string | null
          reminder_type: string | null
          vip_tier: string | null
        }
        Relationships: []
      }
      v_customer_summary: {
        Row: {
          anniversary: string | null
          birthday: string | null
          customer_id: number | null
          email: string | null
          last_purchase_date: string | null
          lifetime_spend: number | null
          name: string | null
          sale_count: number | null
          total_purchases: number | null
          vip_tier: string | null
        }
        Relationships: []
      }
      v_customer_supplier_payouts: {
        Row: {
          other_expenses: number | null
          part_exchange_count: number | null
          supplier_id: number | null
          supplier_name: string | null
          total_part_exchange_value: number | null
          total_payouts: number | null
        }
        Relationships: []
      }
      v_inventory_value: {
        Row: {
          avg_cost: number | null
          inventory_value: number | null
          product_id: number | null
          qty_on_hand: number | null
        }
        Relationships: []
      }
      v_pnl_daily: {
        Row: {
          cogs: number | null
          day: string | null
          gross_profit: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_pnl_px_consign: {
        Row: {
          cogs: number | null
          discount: number | null
          internal_sku: string | null
          is_consignment: boolean | null
          is_trade_in: boolean | null
          kind: string | null
          product_id: number | null
          product_name: string | null
          quantity: number | null
          revenue: number | null
          sale_id: number | null
          sale_item_id: number | null
          sold_at: string | null
          unit_cost: number | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_mix: {
        Row: {
          category: string | null
          cogs: number | null
          gross_profit: number | null
          karat: string | null
          metal: string | null
          name: string | null
          product_id: number | null
          revenue: number | null
          sku: string | null
          units_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
        ]
      }
      v_sales_with_profit: {
        Row: {
          line_cogs: number | null
          line_gross_profit: number | null
          line_revenue: number | null
          product_id: number | null
          quantity: number | null
          sale_id: number | null
          sale_item_id: number | null
          sold_at: string | null
          unit_cost: number | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_value"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_weighted_cost"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_on_hand: {
        Row: {
          name: string | null
          product_id: number | null
          qty_on_hand: number | null
          sku: string | null
        }
        Relationships: []
      }
      v_stock_status: {
        Row: {
          internal_sku: string | null
          is_at_risk: boolean | null
          is_out_of_stock: boolean | null
          name: string | null
          product_id: number | null
          qty_on_hand: number | null
          reorder_threshold: number | null
          sku: string | null
        }
        Relationships: []
      }
      v_supplier_metrics: {
        Row: {
          expense_spend_this_year: number | null
          inventory_spend_this_year: number | null
          name: string | null
          orders_this_month: number | null
          product_count: number | null
          status: string | null
          supplier_id: number | null
          supplier_type: string | null
          tags: string[] | null
          total_spend_this_year: number | null
        }
        Relationships: []
      }
      v_supplier_spend: {
        Row: {
          expense_spend: number | null
          inventory_spend: number | null
          name: string | null
          supplier_id: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      v_weighted_cost: {
        Row: {
          avg_cost: number | null
          product_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aged_stock_count: { Args: { days_threshold?: number }; Returns: number }
      audit_prune_older_than: { Args: { days: number }; Returns: undefined }
      edit_sale_item: {
        Args: {
          p_item_id: number
          p_new_discount: number
          p_new_quantity: number
          p_new_unit_price: number
          p_reason?: string
          p_sale_id: number
          p_user_id: string
        }
        Returns: Json
      }
      get_user_role: { Args: { uid: string }; Returns: string }
      is_manager: { Args: { uid: string }; Returns: boolean }
      is_owner: { Args: { uid: string }; Returns: boolean }
      is_owner_or_manager: { Args: { uid: string }; Returns: boolean }
      is_staff: { Args: { uid: string }; Returns: boolean }
      search_everything: {
        Args: { lim?: number; q: string; scope?: string }
        Returns: {
          id: string
          kind: string
          score: number
          subtitle: string
          title: string
          url: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      void_sale: {
        Args: { p_reason?: string; p_sale_id: number; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      expense_category:
        | "rent"
        | "utilities"
        | "marketing"
        | "fees"
        | "wages"
        | "repairs"
        | "other"
      payment_method: "cash" | "card" | "transfer" | "other"
      product_document_type:
        | "registration"
        | "warranty"
        | "appraisal"
        | "service"
        | "photo"
        | "other"
        | "consignment_agreement"
        | "certificate_card"
      serial_status: "in_stock" | "sold" | "returned" | "lost"
      stock_movement_type:
        | "purchase"
        | "sale"
        | "adjustment"
        | "return_in"
        | "return_out"
      user_role: "owner" | "staff" | "manager"
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
      expense_category: [
        "rent",
        "utilities",
        "marketing",
        "fees",
        "wages",
        "repairs",
        "other",
      ],
      payment_method: ["cash", "card", "transfer", "other"],
      product_document_type: [
        "registration",
        "warranty",
        "appraisal",
        "service",
        "photo",
        "other",
        "consignment_agreement",
        "certificate_card",
      ],
      serial_status: ["in_stock", "sold", "returned", "lost"],
      stock_movement_type: [
        "purchase",
        "sale",
        "adjustment",
        "return_in",
        "return_out",
      ],
      user_role: ["owner", "staff", "manager"],
    },
  },
} as const
