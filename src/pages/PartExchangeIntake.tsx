import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Package, Loader2, Search, Edit, Trash2, PackageCheck, Filter, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { ConvertPartExchangeDialog } from '@/components/pos/ConvertPartExchangeDialog';
import { EditPartExchangeModal } from '@/components/pos/EditPartExchangeModal';
import { useDiscardPartExchange } from '@/hooks/usePartExchanges';

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
}

export default function PartExchangeIntake() {
  const isOwner = useOwnerGuard();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modal state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [selectedPX, setSelectedPX] = useState<PendingPartExchange | null>(null);
  const [discardReason, setDiscardReason] = useState('');

  const { data: pendingPXs, isLoading } = useQuery({
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

  const discardMutation = useDiscardPartExchange();

  // Filter logic
  const filteredPXs = useMemo(() => {
    if (!pendingPXs) return [];

    return pendingPXs.filter((px) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        px.title.toLowerCase().includes(searchLower) ||
        px.customer_name?.toLowerCase().includes(searchLower) ||
        px.serial?.toLowerCase().includes(searchLower) ||
        px.category?.toLowerCase().includes(searchLower);

      // Date filter
      const createdDate = new Date(px.created_at);
      const now = new Date();
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === '7d' && createdDate >= subDays(now, 7)) ||
        (dateFilter === '30d' && createdDate >= subDays(now, 30));

      // Category filter
      const matchesCategory =
        categoryFilter === 'all' ||
        px.category === categoryFilter ||
        (!px.category && categoryFilter === 'uncategorized');

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

  const handleDiscardClick = (px: PendingPartExchange) => {
    setSelectedPX(px);
    setDiscardDialogOpen(true);
  };

  const handleDiscardConfirm = async () => {
    if (!selectedPX) return;
    
    await discardMutation.mutateAsync({
      id: selectedPX.id,
      reason: discardReason || undefined,
    });
    
    setDiscardDialogOpen(false);
    setSelectedPX(null);
    setDiscardReason('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('30d');
    setCategoryFilter('all');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <AppLayout 
      title="Part Exchange Intake Queue"
      subtitle="Review and convert trade-ins into sellable inventory"
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name, customer, or serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
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
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || dateFilter !== '30d' || categoryFilter !== 'all') && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}

              <Badge variant="secondary" className="text-base px-4 py-1.5 whitespace-nowrap">
                {filteredPXs.length} pending
              </Badge>
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
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No pending trade-ins
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Trade-ins from sales will appear here for conversion to inventory
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/sales'}>
                Go to Point of Sale
              </Button>
            </CardContent>
          </Card>
        ) : filteredPXs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Filter className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No trade-ins match your filters
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPXs.map((px) => (
              <Card key={px.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Pending</Badge>
                        <span className="text-sm text-muted-foreground">
                          Sale #{px.sale_id} • {format(new Date(px.created_at), 'PPp')}
                        </span>
                      </div>
                      <CardTitle className="font-luxury text-2xl mt-2">
                        {px.title}
                      </CardTitle>
                      {px.category && (
                        <CardDescription className="mt-1">
                          {px.category} {px.serial && `• SKU: ${px.serial}`}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3">
                      {px.description && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Description</p>
                          <p className="text-sm">{px.description}</p>
                        </div>
                      )}
                      {px.customer_name && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Customer</p>
                          <p className="font-medium">{px.customer_name}</p>
                          {px.customer_contact && (
                            <p className="text-sm text-muted-foreground">
                              {px.customer_contact}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Trade-in Allowance</p>
                        <p className="text-3xl font-luxury font-semibold text-[#D4AF37]">
                          {formatCurrency(px.allowance)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {px.notes && (
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{px.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleConvert(px)}
                      variant="default"
                      disabled={!isOwner}
                      className="flex-1 md:flex-initial"
                    >
                      <PackageCheck className="h-4 w-4" />
                      Convert to Product
                    </Button>
                    
                    <Button
                      onClick={() => handleEdit(px)}
                      variant="outline"
                      disabled={!isOwner}
                    >
                      <Edit className="h-4 w-4" />
                      Edit Details
                    </Button>
                    
                    <Button
                      onClick={() => handleDiscardClick(px)}
                      variant="outline"
                      disabled={!isOwner}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Discard
                    </Button>
                  </div>

                  {!isOwner && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Only owners can convert or discard trade-ins
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Trade-In</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard "{selectedPX?.title}"? This item will be marked as discarded and removed from the intake queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="discard-reason">Reason (optional)</Label>
            <Textarea
              id="discard-reason"
              placeholder="Why is this being discarded?"
              value={discardReason}
              onChange={(e) => setDiscardReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDiscardReason('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Trade-In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
