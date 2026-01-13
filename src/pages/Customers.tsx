import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog';
import { useCustomers, useCustomerReminders } from '@/hooks/useCustomers';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Search, Users, Crown, Gift, Heart } from 'lucide-react';
import type { VIPTier } from '@/components/customers/VIPTierBadge';

export default function Customers() {
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: customers, isLoading } = useCustomers(search || undefined);
  const { data: reminders } = useCustomerReminders();

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
            <Crown className="h-4 w-4 text-amber-500" />
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
            <Gift className="h-4 w-4 text-rose-500" />
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
            <Heart className="h-4 w-4 text-pink-500" />
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

      {/* Customer Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredCustomers && filteredCustomers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={() => handleCustomerClick(customer.id)}
            />
          ))}
        </div>
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
