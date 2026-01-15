import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ExternalLink, User, Clock, Database, ArrowRight, PoundSterling, AlertTriangle } from 'lucide-react';
import { EnhancedAuditEntry } from '@/hooks/useAuditLog';
import { useNavigate } from 'react-router-dom';

interface AuditDetailModalProps {
  entry: EnhancedAuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAVIGABLE_TABLES: Record<string, (id: string) => string> = {
  products: (id) => `/products?id=${id}`,
  suppliers: (id) => `/suppliers/${id}`,
  customers: (id) => `/customers/${id}`,
  sales: (id) => `/sales/${id}`,
  expenses: (id) => `/expenses`,
};

const EXCLUDED_FIELDS = ['updated_at', 'created_at', 'id'];

// Financial fields that require prominent display for fraud prevention
const SENSITIVE_FINANCIAL_FIELDS = [
  // Core pricing fields
  'unit_price', 'unit_cost', 'sell_price', 'cost_price',
  'price', 'cost', 'value', 'amount',
  
  // Pricing variations - margin/markup manipulation
  'margin', 'markup', 'rrp', 'trade_price',
  
  // Sale totals
  'total', 'subtotal', 'discount', 'discount_total',
  'tax_amount', 'tax_total', 'tax_rate',
  'original_total', 'part_exchange_total',
  
  // Consignment & payouts
  'allowance', 'payout_amount', 'settlement_amount',
  'agreed_price', 'sale_price',
  
  // Commission tracking
  'commission_amount', 'commission_rate', 'commission_override',
  'profit_total', 'revenue_total',
  
  // Customer financial tracking
  'lifetime_spend',
  
  // Expense tracking
  'amount_ex_vat', 'amount_inc_vat', 'vat_amount', 'vat_rate'
];

// Fields that contain financial keywords but are NOT currency values
const NON_FINANCIAL_FIELDS = [
  'total_purchases',  // Integer count of purchases
  'total_orders',     // Integer count of orders
];

// Check if a field is financial
const isFinancialField = (fieldName: string): boolean => {
  const lowerField = fieldName.toLowerCase();
  // First check exclusions - these are counts, not currency
  if (NON_FINANCIAL_FIELDS.some(f => lowerField === f)) {
    return false;
  }
  return SENSITIVE_FINANCIAL_FIELDS.some(f => lowerField.includes(f) || lowerField === f);
};

// Format currency value
const formatCurrencyValue = (value: any): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return String(value ?? '—');
  return num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format field name for display
const formatFieldName = (field: string): string => {
  return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function AuditDetailModal({ entry, open, onOpenChange }: AuditDetailModalProps) {
  const navigate = useNavigate();

  if (!entry) return null;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'insert': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'update': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'delete': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'void': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    return tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner': return 'bg-primary/10 text-primary';
      case 'manager': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Get financial changes for prominent display
  const getFinancialChanges = () => {
    if (entry.action !== 'update') return [];
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    const oldData = entry.old_data || {};
    const newData = entry.new_data || {};
    
    for (const key of Object.keys(newData)) {
      if (isFinancialField(key) && JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: newData[key]
        });
      }
    }
    return changes;
  };

  const getChangedFields = () => {
    if (entry.action === 'insert') {
      return Object.entries(entry.new_data || {})
        .filter(([key]) => !EXCLUDED_FIELDS.includes(key))
        .map(([key, value]) => ({
          field: key,
          oldValue: null,
          newValue: value,
          changed: true,
          isFinancial: isFinancialField(key)
        }));
    }

    if (entry.action === 'delete') {
      return Object.entries(entry.old_data || {})
        .filter(([key]) => !EXCLUDED_FIELDS.includes(key))
        .map(([key, value]) => ({
          field: key,
          oldValue: value,
          newValue: null,
          changed: true,
          isFinancial: isFinancialField(key)
        }));
    }

    // For updates, compare old and new
    const allKeys = new Set([
      ...Object.keys(entry.old_data || {}),
      ...Object.keys(entry.new_data || {})
    ]);

    return Array.from(allKeys)
      .filter(key => !EXCLUDED_FIELDS.includes(key))
      .map(key => {
        const oldValue = entry.old_data?.[key];
        const newValue = entry.new_data?.[key];
        const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
        return { field: key, oldValue, newValue, changed, isFinancial: isFinancialField(key) };
      })
      // Sort: changed fields first, then financial fields, then alphabetically
      .sort((a, b) => {
        if (a.changed !== b.changed) return b.changed ? 1 : -1;
        if (a.isFinancial !== b.isFinancial) return b.isFinancial ? 1 : -1;
        return a.field.localeCompare(b.field);
      });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const canNavigate = NAVIGABLE_TABLES[entry.table_name];
  const changes = getChangedFields();
  const financialChanges = getFinancialChanges();
  
  // Filter out financial fields from regular changes if we're showing them prominently
  const nonFinancialChanges = financialChanges.length > 0 
    ? changes.filter(c => !c.isFinancial || !c.changed)
    : changes;

  const handleViewRecord = () => {
    if (canNavigate) {
      navigate(canNavigate(entry.row_pk));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge className={`${getActionColor(entry.action)} border`}>
              {entry.action.toUpperCase()}
            </Badge>
            <span>{getTableDisplayName(entry.table_name)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(entry.occurred_at), 'PPpp')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Record #{entry.row_pk}</span>
            </div>
          </div>

          {/* Actor info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{entry.actor_name}</div>
                {entry.actor_email && (
                  <div className="text-xs text-muted-foreground">{entry.actor_email}</div>
                )}
              </div>
            </div>
            {entry.actor_role && (
              <Badge variant="outline" className={getRoleColor(entry.actor_role)}>
                {entry.actor_role}
              </Badge>
            )}
          </div>

          {/* Financial Changes Alert - Shown prominently at top */}
          {financialChanges.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-700 dark:text-amber-500">Financial Changes Detected</span>
              </div>
              <div className="space-y-2">
                {financialChanges.map(change => (
                  <div key={change.field} className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                    <span className="text-sm text-muted-foreground">{formatFieldName(change.field)}</span>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-muted-foreground line-through">
                        £{formatCurrencyValue(change.oldValue)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-amber-700 dark:text-amber-500">
                        £{formatCurrencyValue(change.newValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Changes */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
              {entry.action === 'insert' ? 'Created Values' : 
               entry.action === 'delete' ? 'Deleted Values' : 
               financialChanges.length > 0 ? 'Other Changes' : 'Changes'}
            </h4>
            <ScrollArea className="flex-1 rounded-lg border">
              <div className="p-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium text-muted-foreground">Field</th>
                      {entry.action === 'update' && (
                        <th className="text-left p-2 font-medium text-muted-foreground">Before</th>
                      )}
                      <th className="text-left p-2 font-medium text-muted-foreground">
                        {entry.action === 'delete' ? 'Value' : entry.action === 'insert' ? 'Value' : 'After'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonFinancialChanges.map(({ field, oldValue, newValue, changed, isFinancial }) => (
                      <tr 
                        key={field} 
                        className={`border-b last:border-0 ${changed ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="p-2 font-mono text-xs">
                          <span className="flex items-center gap-1">
                            {isFinancial && <PoundSterling className="h-3 w-3 text-amber-500" />}
                            {field.replace(/_/g, ' ')}
                            {changed && entry.action === 'update' && (
                              <ArrowRight className="h-3 w-3 text-amber-500" />
                            )}
                          </span>
                        </td>
                        {entry.action === 'update' && (
                          <td className="p-2 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                            {isFinancial ? `£${formatCurrencyValue(oldValue)}` : formatValue(oldValue)}
                          </td>
                        )}
                        <td className={`p-2 font-mono text-xs max-w-[200px] truncate ${
                          changed && entry.action === 'update' ? 'text-amber-600 font-medium' : ''
                        }`}>
                          {entry.action === 'delete' 
                            ? (isFinancial ? `£${formatCurrencyValue(oldValue)}` : formatValue(oldValue))
                            : (isFinancial ? `£${formatCurrencyValue(newValue)}` : formatValue(newValue))
                          }
                        </td>
                      </tr>
                    ))}
                    {nonFinancialChanges.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground">
                          {financialChanges.length > 0 ? 'No other field changes' : 'No field changes recorded'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          {canNavigate && entry.action !== 'delete' && (
            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleViewRecord}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Record
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
