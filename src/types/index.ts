// Core Types for Sourced Clothing CRM

import { Database } from '@/integrations/supabase/types';

// Extract types from Supabase schema
export type Role = Database['public']['Enums']['user_role'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type ExpenseCategory = Database['public']['Enums']['expense_category'];
export type StockMovementType = Database['public']['Enums']['stock_movement_type'];
export type DocumentType = Database['public']['Enums']['product_document_type'];

// Basic types from Supabase Tables
export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Sale = Database['public']['Tables']['sales']['Row'];
export type SaleItem = Database['public']['Tables']['sale_items']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ConsignmentSettlement = Database['public']['Tables']['consignment_settlements']['Row'];
export type PartExchange = Database['public']['Tables']['part_exchanges']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];

// View Types
export type StockOnHand = Database['public']['Views']['v_stock_on_hand']['Row'];
export type StockStatus = Database['public']['Views']['v_stock_status']['Row'];
export type WeightedCost = Database['public']['Views']['v_weighted_cost']['Row'];
export type InventoryValue = Database['public']['Views']['v_inventory_value']['Row'];
export type PnLDaily = Database['public']['Views']['v_pnl_daily']['Row'];
export type SalesWithProfit = Database['public']['Views']['v_sales_with_profit']['Row'];

// Insert Types
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
export type SaleInsert = Database['public']['Tables']['sales']['Insert'];
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
export type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert'];
export type ConsignmentSettlementInsert = Database['public']['Tables']['consignment_settlements']['Insert'];
export type PartExchangeInsert = Database['public']['Tables']['part_exchanges']['Insert'];
export type LocationInsert = Database['public']['Tables']['locations']['Insert'];

// Update Types
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
export type ConsignmentSettlementUpdate = Database['public']['Tables']['consignment_settlements']['Update'];
export type PartExchangeUpdate = Database['public']['Tables']['part_exchanges']['Update'];
export type LocationUpdate = Database['public']['Tables']['locations']['Update'];

// Enhanced Product with Stock and Supplier Info
export interface ProductWithStock extends Product {
  supplier?: Supplier | null;
  consignment_supplier?: Supplier | null;
  location?: Location | null;
  stock_on_hand?: StockOnHand | null;
  inventory_value?: InventoryValue | null;
  qty_on_hand?: number;
  qty_available?: number;
  qty_reserved?: number;
  avg_cost?: number;
  margin?: number;
  is_reserved?: boolean;
  is_fully_reserved?: boolean;
  is_partially_reserved?: boolean;
  reserved_orders?: Array<{ deposit_order_id: number; customer_name: string; quantity: number }>;
}

// Enhanced Sale with Items and Staff
export interface SaleWithItems extends Sale {
  sale_items?: (SaleItem & { product?: Product })[];
  staff?: Profile | null;
  part_exchanges?: (PartExchange & { product?: Product })[];
}

// Enhanced Expense with Supplier and Staff
export interface ExpenseWithDetails extends Expense {
  supplier?: Supplier | null;
  staff?: Profile | null;
}

// POS/Cart Types  
export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  tax_rate: number;
  discount: number;
  stock_on_hand?: number; // Available stock for validation
}

// Custom Item for Deposit Orders (bespoke/made-to-order pieces)
export interface CustomCartItem {
  id: string; // temporary UUID for cart management
  product_name: string;
  category?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  tax_rate: number;
  is_custom: true; // discriminator
}

// For creating sale items without sale_id (added in mutation)
export interface SaleItemCreate {
  product_id: number;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  tax_rate: number;
  discount: number;
}

export interface CartSummary {
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;
  item_count: number;
  part_exchange_total: number;
  net_total: number; // total minus part exchanges
}

// Stock Adjustment
export interface StockAdjustment {
  product_id: number;
  quantity: number; // positive to add, negative to reduce
  note?: string;
}

// Dashboard Stats
export interface DashboardStats {
  today_sales: number;
  inventory_value: number;
  gross_profit_7d: number;
  expenses_7d: number;
  low_stock_count: number;
  total_products: number;
  consignment_stock_count: number;
  unsettled_consignments_value: number;
}

// Date Range for Reports
export interface DateRange {
  from: string;
  to: string;
}

// P&L Summary
export interface PnLSummary extends PnLDaily {
  operating_expenses: number;
  net_profit: number;
}

// Filter and Search Types
export interface ProductFilters {
  search?: string;
  category?: string;
  supplier_id?: number;
  low_stock_only?: boolean;
}

export interface ExpenseFilters {
  date_range?: DateRange;
  category?: ExpenseCategory;
  supplier_id?: number;
  is_cogs?: boolean;
}

export interface SaleFilters {
  date_range?: DateRange;
  payment_method?: PaymentMethod;
  staff_id?: string;
}

// Sales History Filter Types
export interface SalesListFilters {
  dateRange: DateRange;
  paymentMethod: string;
  staffId: string;
}

export interface SoldItemsFilters {
  dateRange: DateRange;
  productSearch: string;
  category: string;
  material: string;
  staffId: string;
  hasSerial: string;
}

// Sale Detail Data
export interface SaleDetailData extends Sale {
  items?: (SaleItem & { product?: Product })[];
  staff?: { full_name: string };
}

// Common UI States
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
}

// Form Validation Errors
export interface ValidationErrors {
  [key: string]: string[];
}

// Common Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationState;
}

// Consignment Types
export interface ConsignmentSettlementWithDetails extends ConsignmentSettlement {
  product?: Product;
  supplier?: Supplier;
  sale?: Sale;
}

export interface ConsignmentFilter {
  status: 'active' | 'sold_unsettled' | 'settled';
  supplier_id?: number;
}