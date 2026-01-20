import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Package, Loader2, Search, Edit, PackageCheck, Filter, X, 
  LayoutGrid, LayoutList, Download, Clock, TrendingUp, Calendar, User,
  ExternalLink, ShoppingCart, Pause, Play
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';
import { useManagerOrAboveGuard } from '@/hooks/useOwnerGuard';
import { ConvertPartExchangeDialog } from '@/components/pos/ConvertPartExchangeDialog';
import { EditPartExchangeModal } from '@/components/pos/EditPartExchangeModal';
import { useHoldPartExchange, useReleaseHold } from '@/hooks/usePartExchanges';
import { exportPartExchangesToCSV } from '@/utils/partExchangeExport';

interface PendingPartExchange {
  id: number;
  sale_id: number;
  title: string;
  category: string | null;
  description: string | null;
  serial: string | null;
  allowance: number;
  customer_name: string | null;
  customer_contact: string | null;
  customer_supplier_id: number | null;
  notes: string | null;
  created_at: string;
  status: string;
  hold_reason?: string | null;
  hold_at?: string | null;
}

export default function PartExchangeIntake() {
  const navigate = useNavigate();
  const canManage = useManagerOrAboveGuard();
  
  // View and filter state
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modal state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [selectedPX, setSelectedPX] = useState<PendingPartExchange | null>(null);
  const [holdReason, setHoldReason] = useState('');

  // Fetch pending items
  const { data: pendingPXs, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-part-exchanges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingPartExchange[];
    },
  });

  // Fetch items on hold
  const { data: holdPXs, isLoading: loadingHold } = useQuery({
    queryKey: ['hold-part-exchanges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select('*')
        .eq('status', 'hold')
        .order('hold_at', { ascending: false });

      if (error) throw error;
      return data as PendingPartExchange[];
    },
  });

  const holdMutation = useHoldPartExchange();
  const releaseMutation = useReleaseHold();
  const isLoading = loadingPending || loadingHold;

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!pendingPXs || pendingPXs.length === 0) {
      return { count: 0, totalValue: 0, oldestDays: 0, avgDays: 0 };
    }

    const now = new Date();
    const ages = pendingPXs.map(px => differenceInDays(now, new Date(px.created_at)));
    
    return {
      count: pendingPXs.length,
      totalValue: pendingPXs.reduce((sum, px) => sum + Number(px.allowance), 0),
      oldestDays: Math.max(...ages),
      avgDays: Math.round(ages.reduce((a, b) => a + b, 0) / ages.length),
    };
  }, [pendingPXs]);

  // Filter logic
  const filteredPXs = useMemo(() => {
    if (!pendingPXs) return [];

    return pendingPXs.filter((px) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        px.title.toLowerCase().includes(searchLower) ||
        px.customer_name?.toLowerCase().includes(searchLower) ||
        px.serial?.toLowerCase().includes(searchLower) ||
        px.category?.toLowerCase().includes(searchLower);

      const createdDate = new Date(px.created_at);
      const now = new Date();
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === '7d' && createdDate >= subDays(now, 7)) ||
        (dateFilter === '30d' && createdDate >= subDays(now, 30));

      const matchesCategory =
        categoryFilter === 'all' ||
        px.category === categoryFilter ||
        (!px.category && categoryFilter === 'uncategorised');

      return matchesSearch && matchesDate && matchesCategory;
    });
  }, [pendingPXs, searchQuery, dateFilter, categoryFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!pendingPXs) return [];
    const cats = new Set(pendingPXs.map((px) => px.category).filter(Boolean));
    return Array.from(cats);
  }, [pendingPXs]);

  // Handlers
  const handleConvert = (px: PendingPartExchange) => {
    setSelectedPX(px);
    setConvertDialogOpen(true);
  };

  const handleEdit = (px: PendingPartExchange) => {
    setSelectedPX(px);
    setEditModalOpen(true);
  };

  const handleHoldClick = (px: PendingPartExchange) => {
    setSelectedPX(px);
    setHoldDialogOpen(true);
  };

  const handleHoldConfirm = async () => {
    if (!selectedPX || !holdReason.trim()) return;
    
    await holdMutation.mutateAsync({
      id: selectedPX.id,
      reason: holdReason,
    });
    
    setHoldDialogOpen(false);
    setSelectedPX(null);
    setHoldReason('');
  };

  const handleReleaseHold = async (px: PendingPartExchange) => {
    await releaseMutation.mutateAsync(px.id);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('30d');
    setCategoryFilter('all');
  };

  const handleExport = () => {
    if (filteredPXs.length > 0) {
      exportPartExchangesToCSV(filteredPXs);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  // Get aging badge based on days pending
  const getAgingBadge = (createdAt: string) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
    
    if (days <= 7) {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
          {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
        </Badge>
      );
    } else if (days <= 14) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
          {days} days
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
          {days} days
        </Badge>
      );
    }
  };

  const hasActiveFilters = searchQuery || dateFilter !== '30d' || categoryFilter !== 'all';

  return (
    <AppLayout 
      title="Trade-In Intake Queue"
      subtitle="Review and convert trade-ins into sellable inventory"
    >
      <div className="space-y-6">
        {/* Summary Stats - matching Products page design */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="pb-4 md:pb-0 md:pr-6">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Pending Items</p>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-1">{summaryStats.count}</p>
                <p className="text-xs text-muted-foreground">Awaiting conversion</p>
              </div>
              
              <div className="py-4 md:py-0 md:px-6">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-1">{formatCurrency(summaryStats.totalValue)}</p>
                <p className="text-xs text-muted-foreground">Trade-in allowances</p>
              </div>
              
              <div className="py-4 md:py-0 md:px-6">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Oldest Item</p>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-1">{summaryStats.oldestDays} days</p>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </div>
              
              <div className="pt-4 md:pt-0 md:pl-6">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Avg. Days Pending</p>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-1">{summaryStats.avgDays}</p>
                <p className="text-xs text-muted-foreground">Queue turnaround</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search, Filters, and View Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 relative w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, customer, or serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="uncategorised">Uncategorised</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat!}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex gap-2 items-center ml-auto">
                <ToggleGroup 
                  type="single" 
                  value={viewMode} 
                  onValueChange={(value) => value && setViewMode(value as 'cards' | 'table')}
                >
                  <ToggleGroupItem value="cards" aria-label="Card view" size="sm">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view" size="sm">
                    <LayoutList className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  disabled={filteredPXs.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !pendingPXs || pendingPXs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium">No pending trade-ins</p>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                Trade-ins from point of sale will appear here for review and conversion to inventory
              </p>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => navigate('/sales')}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Go to Point of Sale
                </Button>
                <Button variant="outline" onClick={() => navigate('/products?filter=trade-in')}>
                  View Converted Trade-ins
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredPXs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No trade-ins match your filters</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPXs.map((px) => (
                  <TableRow key={px.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{px.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {px.category}{px.serial && ` • ${px.serial}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {px.customer_name ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm">{px.customer_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/sales/${px.sale_id}`)}
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        #{px.sale_id}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-[#D4AF37]">
                        {formatCurrency(px.allowance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getAgingBadge(px.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleConvert(px)}
                          disabled={!canManage}
                        >
                          <PackageCheck className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(px)}
                          disabled={!canManage}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleHoldClick(px)}
                          disabled={!canManage}
                          title="Put on hold"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* Card View - 2 column grid */
          <div className="grid md:grid-cols-2 gap-4">
            {filteredPXs.map((px) => (
              <Card key={px.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Customer avatar */}
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {px.customer_name ? (
                          <span className="text-sm font-medium text-primary">
                            {px.customer_name.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{px.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {px.category && <span>{px.category}</span>}
                          {px.serial && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {px.serial}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {getAgingBadge(px.created_at)}
                  </div>

                  {/* Details row */}
                  <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Trade-in Value</p>
                      <p className="text-xl font-semibold text-[#D4AF37]">
                        {formatCurrency(px.allowance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">From Sale</p>
                      <button
                        onClick={() => navigate(`/sales/${px.sale_id}`)}
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        #{px.sale_id}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Customer info */}
                  {px.customer_name && (
                    <div className="mb-4 text-sm">
                      <span className="text-muted-foreground">Customer: </span>
                      <span className="font-medium">{px.customer_name}</span>
                      {px.customer_contact && (
                        <span className="text-muted-foreground"> • {px.customer_contact}</span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {px.notes && (
                    <div className="mb-4 p-2 rounded bg-muted/20 text-sm text-muted-foreground line-clamp-2">
                      {px.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleConvert(px)}
                      disabled={!canManage}
                      className="flex-1"
                      size="sm"
                    >
                      <PackageCheck className="h-4 w-4 mr-1" />
                      Convert
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(px)}
                      disabled={!canManage}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHoldClick(px)}
                      disabled={!canManage}
                      title="Put on hold"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  </div>

                  {!canManage && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Manager access required
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* On Hold Section */}
        {holdPXs && holdPXs.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pause className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">On Hold ({holdPXs.length})</CardTitle>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  {formatCurrency(holdPXs.reduce((sum, px) => sum + Number(px.allowance), 0))}
                </Badge>
              </div>
              <CardDescription>Items awaiting servicing, authentication, or other work before conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Hold Reason</TableHead>
                    <TableHead>On Hold Since</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdPXs.map((px) => (
                    <TableRow key={px.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{px.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {px.category}{px.serial && ` • ${px.serial}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                          {px.hold_reason 
                            ? px.hold_reason.replace(/\b\w/g, (char) => char.toUpperCase()) 
                            : 'No Reason'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {px.hold_at ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(px.hold_at), 'dd MMM yyyy')}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-[#D4AF37]">
                          {formatCurrency(px.allowance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReleaseHold(px)}
                            disabled={!canManage || releaseMutation.isPending}
                            title="Release hold"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Release
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConvert(px)}
                            disabled={!canManage}
                          >
                            <PackageCheck className="h-4 w-4 mr-1" />
                            Convert
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <ConvertPartExchangeDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        partExchange={selectedPX}
      />

      <EditPartExchangeModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        partExchange={selectedPX}
      />

      {/* Hold Dialog */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put Trade-In on Hold</DialogTitle>
            <DialogDescription>
              Place "{selectedPX?.title}" on hold while it awaits servicing, authentication, or cleaning.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="hold-reason">Reason for hold *</Label>
            <Select value={holdReason} onValueChange={setHoldReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Needs servicing">Needs servicing</SelectItem>
                <SelectItem value="Awaiting authentication">Awaiting authentication</SelectItem>
                <SelectItem value="Requires cleaning">Requires cleaning</SelectItem>
                <SelectItem value="Missing parts/components">Missing parts/components</SelectItem>
                <SelectItem value="Awaiting valuation">Awaiting valuation</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setHoldDialogOpen(false); setHoldReason(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleHoldConfirm}
              disabled={!holdReason.trim() || holdMutation.isPending}
            >
              {holdMutation.isPending ? 'Placing on hold...' : 'Place on Hold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
