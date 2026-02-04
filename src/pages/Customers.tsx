import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VIPTierBadge } from '@/components/customers/VIPTierBadge';
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog';
import { CustomerFiltersComponent, CustomerFilters, defaultCustomerFilters } from '@/components/customers/CustomerFilters';
import { useCustomers, useCustomerReminders } from '@/hooks/useCustomers';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { Plus, Search, Users, Crown, Gift, Heart, Mail, Phone, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, LayoutList } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { differenceInDays, setYear, addYears, parseISO } from 'date-fns';

// Check if event date occurs within next N days (handles year wrap-around)
const isWithinNextDays = (eventDate: string | null, days: number): boolean => {
  if (!eventDate) return false;
  
  const today = new Date();
  const event = parseISO(eventDate);
  
  // Set the event to this year
  let nextOccurrence = setYear(event, today.getFullYear());
  
  // If that date has already passed this year, use next year
  if (nextOccurrence < today) {
    nextOccurrence = addYears(nextOccurrence, 1);
  }
  
  const daysUntil = differenceInDays(nextOccurrence, today);
  return daysUntil >= 0 && daysUntil <= days;
};

// Check spend range filter
const matchesSpendRange = (spend: number, range: string): boolean => {
  switch (range) {
    case 'under-500': return spend < 500;
    case '500-2000': return spend >= 500 && spend < 2000;
    case '2000-5000': return spend >= 2000 && spend < 5000;
    case 'over-5000': return spend >= 5000;
    default: return true;
  }
};

// Check purchase count filter
const matchesPurchaseCount = (count: number, filter: string): boolean => {
  switch (filter) {
    case '1': return count === 1;
    case '2-5': return count >= 2 && count <= 5;
    case '6+': return count >= 6;
    default: return true;
  }
};

type SortField = 'name' | 'lifetime_spend' | 'total_purchases';
type SortDirection = 'asc' | 'desc';

export default function Customers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate } = usePermissions();
  const { settings } = useSettings();
  
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('all');
  const [filters, setFilters] = useState<CustomerFilters>(defaultCustomerFilters);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Handle ?add=true query parameter
  useEffect(() => {
    if (searchParams.get('add') === 'true' && canCreate('customers')) {
      setAddDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canCreate, setSearchParams]);

  const { data: customers, isLoading } = useCustomers(search || undefined);
  const { data: reminders } = useCustomerReminders();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.spendRange !== 'all') count++;
    if (filters.purchaseCount !== 'all') count++;
    if (filters.upcomingBirthday) count++;
    if (filters.upcomingAnniversary) count++;
    count += filters.stylePreference.length;
    if (filters.hasEmail) count++;
    if (filters.hasPhone) count++;
    return count;
  }, [filters]);

  // Filter customers by VIP tier and advanced filters
  const filteredCustomers = useMemo(() => {
    return customers?.filter(customer => {
      // VIP tier filter
      if (vipFilter !== 'all' && customer.vip_tier !== vipFilter) return false;
      
      // Spend range filter
      if (!matchesSpendRange(customer.lifetime_spend, filters.spendRange)) return false;
      
      // Purchase count filter
      if (!matchesPurchaseCount(customer.total_purchases, filters.purchaseCount)) return false;
      
      // Upcoming birthday filter
      if (filters.upcomingBirthday && !isWithinNextDays(customer.birthday, 30)) return false;
      
      // Upcoming anniversary filter
      if (filters.upcomingAnniversary && !isWithinNextDays(customer.anniversary, 30)) return false;
      
      // Style preference filter
      if (filters.stylePreference.length > 0) {
        const customerStyle = customer.preferred_style?.toLowerCase() || '';
        const hasMatchingStyle = filters.stylePreference.some(
          style => customerStyle.includes(style.toLowerCase())
        );
        if (!hasMatchingMetal) return false;
      }
      
      // Has email filter
      if (filters.hasEmail && !customer.email) return false;
      
      // Has phone filter
      if (filters.hasPhone && !customer.phone) return false;
      
      return true;
    });
  }, [customers, vipFilter, filters]);

  // Sort customers
  const sortedCustomers = useMemo(() => {
    if (!filteredCustomers) return [];
    
    return [...filteredCustomers].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lifetime_spend':
          comparison = a.lifetime_spend - b.lifetime_spend;
          break;
        case 'total_purchases':
          comparison = a.total_purchases - b.total_purchases;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredCustomers, sortField, sortDirection]);

  // Calculate stats - filter reminders properly for 30-day window
  const stats = useMemo(() => {
    const upcomingBirthdays = customers?.filter(c => isWithinNextDays(c.birthday, 30)).length || 0;
    const upcomingAnniversaries = customers?.filter(c => isWithinNextDays(c.anniversary, 30)).length || 0;
    
    return {
      total: customers?.length || 0,
      platinum: customers?.filter(c => c.vip_tier === 'platinum').length || 0,
      upcomingBirthdays,
      upcomingAnniversaries,
    };
  }, [customers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleCustomerClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Customers"
        description="Manage customer relationships, preferences, and track purchase history"
      >
        {canCreate('customers') && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        )}
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 min-h-[3.5rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-luxury">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 min-h-[3.5rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platinum Customers
            </CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-luxury">{stats.platinum}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 min-h-[3.5rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Birthdays (30d)
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-luxury">{stats.upcomingBirthdays}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 min-h-[3.5rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anniversaries (30d)
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-luxury">{stats.upcomingAnniversaries}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={vipFilter} onValueChange={setVipFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by VIP tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>
          <CustomerFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            activeFiltersCount={activeFiltersCount}
          />
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="list" aria-label="List view" size="sm">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" size="sm">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Customer Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : sortedCustomers && sortedCustomers.length > 0 ? (
        viewMode === 'list' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Customer
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('lifetime_spend')}
                  >
                    <div className="flex items-center justify-end">
                      Lifetime Spend
                      <SortIcon field="lifetime_spend" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right hidden md:table-cell cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('total_purchases')}
                  >
                    <div className="flex items-center justify-end">
                      Purchases
                      <SortIcon field="total_purchases" />
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCustomerClick(customer.id)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                        {customer.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <VIPTierBadge tier={customer.vip_tier} size="sm" />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(customer.lifetime_spend)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                      {customer.total_purchases}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer.id)}
              />
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium text-muted-foreground mb-1">
              {search || vipFilter !== 'all' || activeFiltersCount > 0 ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              {search || vipFilter !== 'all' || activeFiltersCount > 0
                ? 'Try adjusting your search or filter criteria'
                : 'Start building your customer database by adding your first customer'}
            </p>
            {canCreate('customers') && !search && vipFilter === 'all' && activeFiltersCount === 0 && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={(id) => navigate(`/customers/${id}`)}
      />
    </AppLayout>
  );
}
