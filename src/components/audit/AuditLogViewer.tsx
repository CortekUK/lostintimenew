import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, RefreshCw, Download, Search, Eye, ExternalLink, PoundSterling } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { toast } from '@/hooks/use-toast';
import { useAuditLog, useAuditActors, EnhancedAuditEntry } from '@/hooks/useAuditLog';
import { AuditDetailModal } from './AuditDetailModal';
import { ActivitySummary } from './ActivitySummary';
import { useNavigate } from 'react-router-dom';

interface AuditLogViewerProps {
  className?: string;
}

const NAVIGABLE_TABLES: Record<string, (id: string) => string> = {
  products: (id) => `/products?id=${id}`,
  suppliers: (id) => `/suppliers/${id}`,
  customers: (id) => `/customers/${id}`,
  sales: (id) => `/sales/${id}`,
};

const TABLE_OPTIONS = [
  { value: 'all', label: 'All Tables' },
  { value: 'products', label: 'Products' },
  { value: 'sales', label: 'Sales' },
  { value: 'sale_items', label: 'Sale Items' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'customers', label: 'Customers' },
  { value: 'stock_movements', label: 'Stock Movements' },
  { value: 'part_exchanges', label: 'Part Exchanges' },
  { value: 'consignment_settlements', label: 'Consignments' },
  { value: 'commission_payments', label: 'Commissions' },
  { value: 'cash_drawer_movements', label: 'Cash Drawer' },
  { value: 'profiles', label: 'User Profiles' },
  { value: 'app_settings', label: 'Settings' },
  { value: 'locations', label: 'Locations' },
];

// Financial fields that require prominent display for fraud prevention
const SENSITIVE_FINANCIAL_FIELDS = [
  'unit_price', 'unit_cost', 'sell_price', 'cost_price',
  'total', 'subtotal', 'discount', 'discount_total', 'tax_amount', 'tax_total',
  'allowance', 'payout_amount', 'settlement_amount', 'agreed_price', 'sale_price',
  'amount', 'price', 'cost', 'value',
  'commission_amount', 'commission_rate', 'profit_total', 'revenue_total'
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

// Get all financial changes from an entry
const getFinancialChanges = (entry: EnhancedAuditEntry) => {
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

// Format currency value
const formatCurrencyValue = (value: any): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function AuditLogViewer({ className }: AuditLogViewerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedEntry, setSelectedEntry] = useState<EnhancedAuditEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [priceChangesOnly, setPriceChangesOnly] = useState(false);

  const { data: auditLogs, isLoading, error, refetch, isFetching } = useAuditLog({
    tableFilter,
    actionFilter,
    actorFilter,
    searchQuery,
    dateRange,
    limit: 200
  });

  const { data: actors } = useAuditActors();

  // Filter for price changes if enabled
  const filteredLogs = priceChangesOnly 
    ? auditLogs?.filter(entry => getFinancialChanges(entry).length > 0)
    : auditLogs;

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" => {
    switch (action) {
      case 'insert': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'void': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    return tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getChangeSummary = (entry: EnhancedAuditEntry): { text: string; hasFinancialChanges: boolean; financialText?: string } => {
    const financialChanges = getFinancialChanges(entry);
    const hasFinancialChanges = financialChanges.length > 0;
    
    // If there are financial changes, prioritize showing those
    if (hasFinancialChanges) {
      const firstChange = financialChanges[0];
      const fieldName = firstChange.field.replace(/_/g, ' ');
      const financialText = `${fieldName}: £${formatCurrencyValue(firstChange.oldValue)} → £${formatCurrencyValue(firstChange.newValue)}`;
      return { 
        text: financialChanges.length > 1 ? `${financialText} (+${financialChanges.length - 1} more)` : financialText,
        hasFinancialChanges: true,
        financialText
      };
    }
    
    if (entry.action === 'insert') {
      const name = entry.new_data?.name || entry.new_data?.title || '';
      return { text: name ? `Created: ${name}` : 'Record created', hasFinancialChanges: false };
    }
    if (entry.action === 'delete') {
      const name = entry.old_data?.name || entry.old_data?.title || '';
      return { text: name ? `Deleted: ${name}` : 'Record deleted', hasFinancialChanges: false };
    }
    if (entry.action === 'void') {
      return { text: 'Sale voided', hasFinancialChanges: false };
    }
    if (entry.action === 'update' && entry.old_data && entry.new_data) {
      const changes: string[] = [];
      const oldData = entry.old_data;
      const newData = entry.new_data;
      
      for (const key of Object.keys(newData)) {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]) && 
            !['updated_at', 'created_at'].includes(key)) {
          const oldVal = oldData[key] === null ? 'null' : String(oldData[key]);
          const newVal = newData[key] === null ? 'null' : String(newData[key]);
          changes.push(`${key.replace(/_/g, ' ')}: ${oldVal.substring(0, 20)} → ${newVal.substring(0, 20)}`);
        }
      }
      return { text: changes.length > 0 ? changes.slice(0, 2).join(', ') : 'No significant changes', hasFinancialChanges: false };
    }
    return { text: 'Unknown change', hasFinancialChanges: false };
  };

  const handleExportCSV = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast({
        title: 'No Data',
        description: 'No audit logs to export',
        variant: 'destructive'
      });
      return;
    }

    try {
      const csvContent = [
        ['Timestamp', 'Actor', 'Role', 'Action', 'Table', 'Record ID', 'Changes'],
        ...auditLogs.map(entry => [
          format(new Date(entry.occurred_at), 'yyyy-MM-dd HH:mm:ss'),
          entry.actor_name || 'System',
          entry.actor_role || '',
          entry.action.toUpperCase(),
          getTableDisplayName(entry.table_name),
          entry.row_pk,
          getChangeSummary(entry).text.replace(/,/g, ';')
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Exported ${auditLogs.length} audit entries`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit log',
        variant: 'destructive'
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['audit-logs-enhanced'] });
    queryClient.invalidateQueries({ queryKey: ['audit-summary'] });
    refetch();
  };

  const handleViewDetails = (entry: EnhancedAuditEntry) => {
    setSelectedEntry(entry);
    setDetailModalOpen(true);
  };

  const handleNavigateToRecord = (entry: EnhancedAuditEntry) => {
    const getUrl = NAVIGABLE_TABLES[entry.table_name];
    if (getUrl) {
      navigate(getUrl(entry.row_pk));
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Error loading audit logs: {(error as Error).message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Activity Summary */}
      <ActivitySummary />

      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Trail</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search changes, records, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <SimpleDatePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />

            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All tables" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="insert">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {actors?.map(actor => (
                  <SelectItem key={actor.id} value={actor.id}>
                    {actor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price Changes Filter */}
            <Button
              variant={priceChangesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setPriceChangesOnly(!priceChangesOnly)}
              className={priceChangesOnly ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            >
              <PoundSterling className="h-4 w-4 mr-1" />
              Price Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete record of all system changes and user actions
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Timestamp</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">User</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Action</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Record Type</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Changes</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs && filteredLogs.length > 0 ? (
                      filteredLogs.map((entry) => {
                        const changeSummary = getChangeSummary(entry);
                        const hasFinancialChanges = changeSummary.hasFinancialChanges;
                        
                        return (
                          <tr 
                            key={entry.id} 
                            className={`border-b hover:bg-muted/30 transition-colors ${
                              hasFinancialChanges ? 'border-l-2 border-l-amber-500 bg-amber-500/5' : ''
                            }`}
                          >
                            <td className="p-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                              {format(new Date(entry.occurred_at), 'MMM dd, HH:mm:ss')}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{entry.actor_name}</span>
                                {entry.actor_role && (
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {entry.actor_role}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Badge variant={getActionVariant(entry.action)} className="text-xs">
                                  {entry.action === 'insert' ? 'CREATED' : 
                                   entry.action === 'delete' ? 'DELETED' :
                                   entry.action.toUpperCase()}
                                </Badge>
                                {hasFinancialChanges && (
                                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                    <PoundSterling className="h-3 w-3" />
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-medium">
                                {getTableDisplayName(entry.table_name)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                #{entry.row_pk}
                              </span>
                            </td>
                            <td className="p-3 max-w-xs">
                              {hasFinancialChanges ? (
                                <span className="text-sm font-medium text-amber-600 line-clamp-1 flex items-center gap-1">
                                  <PoundSterling className="h-3 w-3 shrink-0" />
                                  {changeSummary.text}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground line-clamp-1">
                                  {changeSummary.text}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(entry)}
                                  className="h-7 px-2"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {NAVIGABLE_TABLES[entry.table_name] && entry.action !== 'delete' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleNavigateToRecord(entry)}
                                    className="h-7 px-2"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                          <p className="text-muted-foreground font-medium">No audit logs found</p>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your filters or date range
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredLogs && filteredLogs.length >= 200 && (
                <div className="border-t p-3 bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground">
                    Showing the 200 most recent entries. Use filters to narrow results.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <AuditDetailModal
        entry={selectedEntry}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  );
}
