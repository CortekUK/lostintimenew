import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VIPTierBadge, getNextVIPTier, getVIPTierThreshold } from '@/components/customers/VIPTierBadge';
import { CustomerPurchaseHistory } from '@/components/customers/CustomerPurchaseHistory';
import { EditCustomerDialog } from '@/components/customers/EditCustomerDialog';
import { QuickNotesCard } from '@/components/customers/QuickNotesCard';
import { useCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Gift, 
  Heart, 
  ShoppingBag, 
  Gem,
  Calendar,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Crown
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();
  const { settings } = useSettings();
  
  const customerId = id ? parseInt(id, 10) : null;
  const { data: customer, isLoading } = useCustomer(customerId);
  const deleteCustomer = useDeleteCustomer();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const handleDelete = async () => {
    if (!customerId) return;
    await deleteCustomer.mutateAsync(customerId);
    navigate('/customers');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Customer not found</h2>
          <Button onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </AppLayout>
    );
  }

  const nextTier = getNextVIPTier(customer.vip_tier);
  const nextTierThreshold = nextTier ? getVIPTierThreshold(nextTier, settings.vipTierThresholds) : null;
  const progressToNextTier = nextTierThreshold 
    ? Math.min(100, (customer.lifetime_spend / nextTierThreshold) * 100)
    : 100;

  return (
    <AppLayout>
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-luxury font-bold">{customer.name}</h1>
            <VIPTierBadge tier={customer.vip_tier} size="lg" />
          </div>
          <div className="flex items-center gap-2 ml-11 sm:ml-0">
            {canEdit('customers') && (
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canDelete('customers') && (
              <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(customer.lifetime_spend)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customer.total_purchases}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Order Value</CardTitle>
            <Gem className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {customer.total_purchases > 0 
                ? formatCurrency(customer.lifetime_spend / customer.total_purchases)
                : 'N/A'
              }
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Member Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {format(new Date(customer.created_at), 'MMM yyyy')}
            </p>
          </CardContent>
        </Card>
        </div>

        {/* VIP Progress */}
        {nextTier && (
          <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Progress to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(customer.lifetime_spend)} / {formatCurrency(nextTierThreshold!)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressToNextTier}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1">
            <TabsTrigger value="overview" className="flex-1 min-w-[80px] text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="purchases" className="flex-1 min-w-[80px] text-xs sm:text-sm">Purchases</TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1 min-w-[80px] text-xs sm:text-sm">Preferences</TabsTrigger>
          </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-sm text-primary hover:underline">
                        {customer.email}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="text-sm text-primary hover:underline">
                        {customer.phone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    {customer.address ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{customer.address}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special Dates */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Special Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Gift className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Birthday</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.birthday ? format(parseISO(customer.birthday), 'dd MMMM') : 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="h-4 w-4 text-rose-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Anniversary</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.anniversary ? format(parseISO(customer.anniversary), 'dd MMMM yyyy') : 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Notes */}
            <QuickNotesCard customerId={customer.id} notes={customer.notes} />
          </div>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerPurchaseHistory customerId={customer.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jewellery Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm font-medium mb-1">Ring Size</p>
                  <Badge variant={customer.ring_size ? 'secondary' : 'outline'}>
                    {customer.ring_size || 'Not specified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Bracelet Size</p>
                  <Badge variant={customer.bracelet_size ? 'secondary' : 'outline'}>
                    {customer.bracelet_size || 'Not specified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Necklace Length</p>
                  <Badge variant={customer.necklace_length ? 'secondary' : 'outline'}>
                    {customer.necklace_length || 'Not specified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Metal Preference</p>
                  <Badge variant={customer.metal_preference ? 'secondary' : 'outline'}>
                    {customer.metal_preference || 'Not specified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Style Preference</p>
                  <Badge variant={customer.style_preference ? 'secondary' : 'outline'}>
                    {customer.style_preference || 'Not specified'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <EditCustomerDialog
        customer={customer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Archive Customer
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{customer.name}</strong>? 
              They will no longer appear in the customer list but their purchase history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
