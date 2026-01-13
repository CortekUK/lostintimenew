import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, RefreshCw, Download, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { toast } from '@/hooks/use-toast';

interface AuditLogEntry {
  id: number;
  table_name: string;
  row_pk: string;
  action: 'insert' | 'update' | 'delete';
  old_data?: any;
  new_data?: any;
  actor?: string;
  occurred_at: string;
}

interface AuditLogViewerProps {
  className?: string;
}

export function AuditLogViewer({ className }: AuditLogViewerProps) {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: auditLogs, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', tableFilter, actionFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(200);

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
        query = query.lte('occurred_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    }
  });

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" => {
    switch (action) {
      case 'insert': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    return tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getChangeSummary = (entry: AuditLogEntry): string => {
    if (entry.action === 'insert') {
      return 'Record created';
    }
    if (entry.action === 'delete') {
      return 'Record deleted';
    }
    if (entry.action === 'update' && entry.old_data && entry.new_data) {
      const changes: string[] = [];
      const oldData = entry.old_data as Record<string, any>;
      const newData = entry.new_data as Record<string, any>;
      
      for (const key of Object.keys(newData)) {
        if (oldData[key] !== newData[key] && key !== 'updated_at') {
          const oldVal = oldData[key] === null ? 'null' : String(oldData[key]);
          const newVal = newData[key] === null ? 'null' : String(newData[key]);
          changes.push(`${key}: ${oldVal} → ${newVal}`);
        }
      }
      return changes.length > 0 ? changes.slice(0, 2).join(', ') : 'No significant changes';
    }
    return 'Unknown change';
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
        ['Timestamp', 'Actor', 'Action', 'Table', 'Record ID', 'Changes'],
        ...auditLogs.map(entry => [
          format(new Date(entry.occurred_at), 'yyyy-MM-dd HH:mm:ss'),
          entry.actor || 'System',
          entry.action.toUpperCase(),
          getTableDisplayName(entry.table_name),
          entry.row_pk,
          getChangeSummary(entry).replace(/,/g, ';') // Replace commas in changes to avoid CSV issues
        ])
      ].map(row => row.join(',')).join('\n');

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
        description: 'Audit log exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit log',
        variant: 'destructive'
      });
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
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Trail</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
            <SimpleDatePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />

            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
                <SelectItem value="stock_movements">Stock Movements</SelectItem>
                <SelectItem value="part_exchanges">Part Exchanges</SelectItem>
                <SelectItem value="consignment_settlements">Consignments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="insert">Insert</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
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
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Error loading audit logs</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Timestamp</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Action</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Record Type</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Record ID</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Changes</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs && auditLogs.length > 0 ? (
                      auditLogs.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {format(new Date(entry.occurred_at), 'MMM dd, HH:mm:ss')}
                          </td>
                          <td className="p-3">
                            <Badge variant={getActionVariant(entry.action)} className="text-xs">
                              {entry.action.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="font-medium">
                              {getTableDisplayName(entry.table_name)}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">
                            {entry.row_pk}
                          </td>
                          <td className="p-3 max-w-md">
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {getChangeSummary(entry)}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {entry.actor ? entry.actor.substring(0, 8) + '...' : 'System'}
                          </td>
                        </tr>
                      ))
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
              {auditLogs && auditLogs.length >= 200 && (
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
    </div>
  );
}