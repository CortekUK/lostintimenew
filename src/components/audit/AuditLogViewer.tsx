import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, RefreshCw, Download, Search, ExternalLink, Activity, Users, Clock, TrendingUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { 
  useAuditLog, 
  getAuditDescription, 
  getRecordUrl, 
  getTableDisplayName,
  AuditLogEntry 
} from '@/hooks/useAuditLog';

interface AuditLogViewerProps {
  className?: string;
  fullPage?: boolean;
}

export function AuditLogViewer({ className, fullPage = false }: AuditLogViewerProps) {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { logs, isLoading, error, refetch, stats } = useAuditLog({
    tableFilter,
    actionFilter,
    dateRange,
    searchQuery,
    limit: fullPage ? 500 : 200,
  });

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'insert': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'void': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'insert': return 'CREATE';
      case 'update': return 'UPDATE';
      case 'delete': return 'DELETE';
      case 'void': return 'VOID';
      default: return action.toUpperCase();
    }
  };

  const getActorDisplay = (entry: AuditLogEntry): string => {
    if (entry.actor_name) return entry.actor_name;
    if (entry.actor_email) return entry.actor_email.split('@')[0];
    if (entry.actor) return 'Staff';
    return 'System';
  };

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: 'No Data',
        description: 'No audit logs to export',
        variant: 'destructive'
      });
      return;
    }

    try {
      const csvContent = [
        ['Timestamp', 'Actor', 'Action', 'Table', 'Record ID', 'Description'],
        ...logs.map(entry => [
          format(new Date(entry.occurred_at), 'yyyy-MM-dd HH:mm:ss'),
          getActorDisplay(entry),
          entry.action.toUpperCase(),
          getTableDisplayName(entry.table_name),
          entry.row_pk,
          getAuditDescription(entry).replace(/,/g, ';')
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Exported ${logs.length} audit entries`
      });
    } catch (err) {
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
            <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-destructive">Error loading audit logs</p>
            <p className="text-sm">{(error as Error).message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats - Only show on full page */}
      {fullPage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Entries</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueActorCount}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {stats.lastActivity 
                    ? formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })
                    : 'No activity'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Last Activity</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
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
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="sale_items">Sale Items</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="stock_movements">Stock</SelectItem>
                <SelectItem value="consignment_settlements">Consignments</SelectItem>
                <SelectItem value="part_exchanges">Part Exchanges</SelectItem>
                <SelectItem value="cash_drawer_movements">Cash Drawer</SelectItem>
                <SelectItem value="commission_payments">Commissions</SelectItem>
                <SelectItem value="profiles">Profiles</SelectItem>
                <SelectItem value="locations">Locations</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="insert">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !logs?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground whitespace-nowrap">Time</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground whitespace-nowrap">User</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground whitespace-nowrap">Action</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground whitespace-nowrap">Type</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Description</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs && logs.length > 0 ? (
                    logs.map((entry) => {
                      const recordUrl = getRecordUrl(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            <div className="text-xs font-mono text-muted-foreground">
                              {format(new Date(entry.occurred_at), 'MMM dd')}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground/70">
                              {format(new Date(entry.occurred_at), 'HH:mm:ss')}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-sm">
                              {getActorDisplay(entry)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant={getActionVariant(entry.action)} 
                              className="text-[10px] font-semibold px-2"
                            >
                              {getActionLabel(entry.action)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="text-muted-foreground text-sm">
                              {getTableDisplayName(entry.table_name)}
                            </span>
                          </td>
                          <td className="p-3 max-w-md">
                            <span className="text-sm line-clamp-2">
                              {getAuditDescription(entry)}
                            </span>
                          </td>
                          <td className="p-3">
                            {recordUrl && (
                              <Link to={recordUrl}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            )}
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
          )}
          {logs && logs.length >= (fullPage ? 500 : 200) && (
            <div className="border-t p-3 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                Showing the {fullPage ? 500 : 200} most recent entries. Use filters to narrow results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
