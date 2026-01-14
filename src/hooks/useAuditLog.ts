import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { useMemo } from 'react';

export interface AuditLogEntry {
  id: number;
  table_name: string;
  row_pk: string;
  action: 'insert' | 'update' | 'delete' | 'void';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  actor?: string;
  occurred_at: string;
  // Enriched fields
  actor_name?: string;
  actor_email?: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface UseAuditLogOptions {
  tableFilter?: string;
  actionFilter?: string;
  dateRange?: DateRange;
  searchQuery?: string;
  limit?: number;
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const { tableFilter = 'all', actionFilter = 'all', dateRange, searchQuery, limit = 200 } = options;

  // Fetch profiles for actor name resolution
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a map for quick actor lookup
  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    profiles?.forEach(profile => {
      map.set(profile.user_id, profile);
    });
    return map;
  }, [profiles]);

  // Fetch audit logs
  const { data: rawLogs, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', tableFilter, actionFilter, dateRange, limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (dateRange?.from) {
        query = query.gte('occurred_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        // Add a day to include the entire end date
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('occurred_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    }
  });

  // Enrich logs with actor names
  const enrichedLogs = useMemo(() => {
    if (!rawLogs) return [];
    
    return rawLogs.map(log => {
      const profile = log.actor ? profileMap.get(log.actor) : null;
      return {
        ...log,
        actor_name: profile?.full_name || null,
        actor_email: profile?.email || null,
      };
    });
  }, [rawLogs, profileMap]);

  // Apply search filter client-side
  const filteredLogs = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return enrichedLogs;
    
    const query = searchQuery.toLowerCase();
    return enrichedLogs.filter(log => {
      // Search in actor name/email
      if (log.actor_name?.toLowerCase().includes(query)) return true;
      if (log.actor_email?.toLowerCase().includes(query)) return true;
      
      // Search in table name
      if (log.table_name.toLowerCase().includes(query)) return true;
      
      // Search in row_pk
      if (log.row_pk.toLowerCase().includes(query)) return true;
      
      // Search in new_data
      if (log.new_data) {
        const newDataStr = JSON.stringify(log.new_data).toLowerCase();
        if (newDataStr.includes(query)) return true;
      }
      
      // Search in old_data
      if (log.old_data) {
        const oldDataStr = JSON.stringify(log.old_data).toLowerCase();
        if (oldDataStr.includes(query)) return true;
      }
      
      return false;
    });
  }, [enrichedLogs, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = enrichedLogs.filter(log => 
      new Date(log.occurred_at) >= today
    );
    
    const uniqueActors = new Set(enrichedLogs.map(log => log.actor).filter(Boolean));
    const lastActivity = enrichedLogs[0]?.occurred_at;
    
    const actionCounts = enrichedLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalCount: enrichedLogs.length,
      todayCount: todayLogs.length,
      uniqueActorCount: uniqueActors.size,
      lastActivity,
      actionCounts,
    };
  }, [enrichedLogs]);

  return {
    logs: filteredLogs,
    isLoading,
    error,
    refetch,
    stats,
    profileMap,
  };
}

// Helper function to format currency
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '£0';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// Helper function to get a human-readable description of an audit entry
export function getAuditDescription(entry: AuditLogEntry): string {
  const { table_name, action, old_data, new_data } = entry;
  
  switch (table_name) {
    case 'sales':
      if (action === 'insert') {
        const total = new_data?.total;
        return `New sale: ${formatCurrency(total)}`;
      }
      if (action === 'void') {
        return `Sale voided: ${new_data?.void_reason || 'No reason given'}`;
      }
      if (action === 'update') {
        if (new_data?.is_voided && !old_data?.is_voided) {
          return `Sale voided: ${new_data?.void_reason || 'No reason given'}`;
        }
        if (new_data?.edited_at && new_data?.edited_at !== old_data?.edited_at) {
          return `Sale edited: ${new_data?.edit_reason || 'No reason given'}`;
        }
        return 'Sale updated';
      }
      break;
      
    case 'sale_items':
      if (action === 'insert') {
        return `Added item to sale #${new_data?.sale_id}`;
      }
      if (action === 'update') {
        const qtyChanged = old_data?.quantity !== new_data?.quantity;
        const priceChanged = old_data?.unit_price !== new_data?.unit_price;
        if (qtyChanged && priceChanged) {
          return `Updated qty (${old_data?.quantity}→${new_data?.quantity}) and price`;
        }
        if (qtyChanged) {
          return `Changed quantity: ${old_data?.quantity} → ${new_data?.quantity}`;
        }
        if (priceChanged) {
          return `Changed price: ${formatCurrency(old_data?.unit_price)} → ${formatCurrency(new_data?.unit_price)}`;
        }
      }
      break;
      
    case 'products':
      if (action === 'insert') {
        return `Added product: ${new_data?.name || new_data?.internal_sku}`;
      }
      if (action === 'update') {
        const changes: string[] = [];
        if (old_data?.unit_price !== new_data?.unit_price) {
          changes.push(`price ${formatCurrency(old_data?.unit_price)}→${formatCurrency(new_data?.unit_price)}`);
        }
        if (old_data?.name !== new_data?.name) {
          changes.push(`name changed`);
        }
        if (old_data?.is_consignment !== new_data?.is_consignment) {
          changes.push(new_data?.is_consignment ? 'marked as consignment' : 'unmarked consignment');
        }
        return changes.length > 0 ? changes.join(', ') : 'Product updated';
      }
      if (action === 'delete') {
        return `Deleted product: ${old_data?.name || old_data?.internal_sku}`;
      }
      break;
      
    case 'suppliers':
      if (action === 'insert') {
        return `Added supplier: ${new_data?.name}`;
      }
      if (action === 'update') {
        return `Updated supplier: ${new_data?.name || old_data?.name}`;
      }
      if (action === 'delete') {
        return `Deleted supplier: ${old_data?.name}`;
      }
      break;
      
    case 'customers':
      if (action === 'insert') {
        return `Added customer: ${new_data?.name}`;
      }
      if (action === 'update') {
        if (old_data?.vip_tier !== new_data?.vip_tier) {
          return `VIP tier changed: ${old_data?.vip_tier} → ${new_data?.vip_tier}`;
        }
        return `Updated customer: ${new_data?.name || old_data?.name}`;
      }
      break;
      
    case 'expenses':
      if (action === 'insert') {
        return `New expense: ${formatCurrency(new_data?.amount)} - ${new_data?.description || new_data?.category}`;
      }
      if (action === 'update') {
        return `Updated expense: ${formatCurrency(new_data?.amount)}`;
      }
      if (action === 'delete') {
        return `Deleted expense: ${formatCurrency(old_data?.amount)}`;
      }
      break;
      
    case 'stock_movements':
      const type = new_data?.movement_type || old_data?.movement_type;
      const qty = new_data?.quantity || old_data?.quantity;
      if (type === 'purchase') {
        return `Stock received: +${qty} units`;
      }
      if (type === 'sale') {
        return `Stock sold: -${qty} units`;
      }
      if (type === 'adjustment') {
        return `Stock adjusted: ${qty > 0 ? '+' : ''}${qty} units`;
      }
      if (type === 'return') {
        return `Stock returned: +${qty} units`;
      }
      return `Stock movement: ${type}`;
      
    case 'consignment_settlements':
      if (action === 'insert') {
        return `Consignment created: ${formatCurrency(new_data?.agreed_price)}`;
      }
      if (action === 'update') {
        if (new_data?.paid_at && !old_data?.paid_at) {
          return `Consignment settled: ${formatCurrency(new_data?.payout_amount)} paid`;
        }
        return 'Consignment updated';
      }
      break;
      
    case 'part_exchanges':
      if (action === 'insert') {
        return `Part exchange: ${new_data?.title || 'New item'} - ${formatCurrency(new_data?.allowance)}`;
      }
      if (action === 'update') {
        if (old_data?.status !== new_data?.status) {
          return `PX status: ${old_data?.status} → ${new_data?.status}`;
        }
        return 'Part exchange updated';
      }
      break;
      
    case 'cash_drawer_movements':
      const movementType = new_data?.movement_type || old_data?.movement_type;
      const amount = new_data?.amount || old_data?.amount;
      if (movementType === 'sale') {
        return `Cash sale: ${formatCurrency(amount)}`;
      }
      if (movementType === 'deposit') {
        return `Cash deposit: ${formatCurrency(amount)}`;
      }
      if (movementType === 'withdrawal') {
        return `Cash withdrawal: ${formatCurrency(amount)}`;
      }
      return `Cash ${movementType}: ${formatCurrency(amount)}`;
      
    case 'commission_payments':
      if (action === 'insert') {
        return `Commission paid: ${formatCurrency(new_data?.commission_amount)}`;
      }
      break;
      
    case 'profiles':
      if (action === 'update') {
        if (old_data?.role !== new_data?.role) {
          return `Role changed: ${old_data?.role} → ${new_data?.role}`;
        }
        return 'Profile updated';
      }
      break;
      
    case 'locations':
      if (action === 'insert') {
        return `Added location: ${new_data?.name}`;
      }
      if (action === 'update') {
        return `Updated location: ${new_data?.name || old_data?.name}`;
      }
      break;
      
    case 'product_documents':
    case 'supplier_documents':
      if (action === 'insert') {
        return `Document uploaded: ${new_data?.title || new_data?.doc_type}`;
      }
      if (action === 'delete') {
        return `Document deleted`;
      }
      break;
  }
  
  // Default descriptions
  switch (action) {
    case 'insert': return 'Record created';
    case 'update': return 'Record updated';
    case 'delete': return 'Record deleted';
    case 'void': return 'Record voided';
    default: return 'Unknown action';
  }
}

// Get the URL to view the affected record
export function getRecordUrl(entry: AuditLogEntry): string | null {
  const { table_name, row_pk, new_data, old_data } = entry;
  
  switch (table_name) {
    case 'sales':
    case 'sale_items':
      const saleId = table_name === 'sales' ? row_pk : (new_data?.sale_id || old_data?.sale_id);
      return saleId ? `/sales/${saleId}` : null;
      
    case 'products':
      return `/products?id=${row_pk}`;
      
    case 'suppliers':
      return `/suppliers/${row_pk}`;
      
    case 'customers':
      return `/customers/${row_pk}`;
      
    case 'expenses':
      return `/expenses`;
      
    case 'consignment_settlements':
      return `/consignments`;
      
    case 'part_exchanges':
      return `/products?id=${new_data?.product_id || old_data?.product_id}`;
      
    default:
      return null;
  }
}

// Get table display name
export function getTableDisplayName(tableName: string): string {
  const names: Record<string, string> = {
    sales: 'Sale',
    sale_items: 'Sale Item',
    products: 'Product',
    suppliers: 'Supplier',
    customers: 'Customer',
    expenses: 'Expense',
    stock_movements: 'Stock',
    consignment_settlements: 'Consignment',
    part_exchanges: 'Part Exchange',
    cash_drawer_movements: 'Cash Drawer',
    commission_payments: 'Commission',
    profiles: 'User Profile',
    locations: 'Location',
    product_documents: 'Product Doc',
    supplier_documents: 'Supplier Doc',
    expense_templates: 'Expense Template',
    customer_preferences: 'Customer Pref',
  };
  return names[tableName] || tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
