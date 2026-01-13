import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCustomers, useCustomerReminders } from '@/hooks/useCustomers';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { Plus, Search, Users, Crown, Gift, Heart, Mail, Phone, ChevronRight } from 'lucide-react';

export default function Customers() {
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const { settings } = useSettings();
  
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  // Filter by VIP tier
  const filteredCustomers = customers?.filter(customer => {
    if (vipFilter === 'all') return true;
    return customer.vip_tier === vipFilter;
  });

  // Calculate stats
  const stats = {
    total: customers?.length || 0,
    vip: customers?.filter(c => c.vip_tier !== 'standard').length || 0,
    upcomingBirthdays: reminders?.filter(r => r.reminder_type === 'birthday').length || 0,
    upcomingAnniversaries: reminders?.filter(r => r.reminder_type === 'anniversary').length || 0,
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VIP Customers
            </CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-luxury">{stats.vip}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
      </div>

      {/* Customer Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredCustomers && filteredCustomers.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Lifetime Spend</TableHead>
                <TableHead className="text-right hidden md:table-cell">Purchases</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium text-muted-foreground mb-1">
              {search || vipFilter !== 'all' ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              {search || vipFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Start building your customer database by adding your first customer'}
            </p>
            {canCreate('customers') && !search && vipFilter === 'all' && (
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
