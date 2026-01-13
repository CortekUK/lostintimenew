import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PoundSterling, Package, TrendingUp, ReceiptPoundSterling, ShoppingCart, AlertTriangle, ChevronDown, Users, Wallet, Eye, ExternalLink, ChevronRight, Plus, Receipt, FileText, UserPlus } from 'lucide-react';
import { useTodayStats, useRecentSales, useTrendsData, useExpenseSnapshot, useStaffActivity, useBusinessInsights } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStockStatus } from '@/hooks/useStockStatus';
import { usePendingPartExchangesStats } from '@/hooks/usePartExchanges';
import { PendingTradeInsCard } from '@/components/dashboard/PendingTradeInsCard';

import { PurchasingSnapshotCards } from '@/components/dashboard/PurchasingSnapshotCards';

// Enhanced KPI Card Component
const KPICard = ({
  title,
  value,
  icon: Icon,
  isPrimary = false,
  onClick
}: {
  title: string;
  value: string;
  icon: any;
  isPrimary?: boolean;
  onClick?: () => void;
}) => {
  return (
    <Card 
      className={`shadow-card hover:shadow-elegant transition-all duration-300 relative h-full flex flex-col group ${onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4 md:p-6 flex-grow">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground font-sans">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 mt-auto">
        <div className="text-xl sm:text-2xl font-bold tracking-tight font-luxury text-foreground flex items-center justify-between">
          <span>{value}</span>
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Actions Bar Component
const QuickActionsBar = () => {
  const navigate = useNavigate();
  
  const actions = [
    { label: 'New Sale', icon: ShoppingCart, route: '/sales' },
    { label: 'Add Product', icon: Plus, route: '/products?add=true' },
    { label: 'Log Expense', icon: ReceiptPoundSterling, route: '/expenses?add=true' },
    { label: 'Add Supplier', icon: Users, route: '/suppliers?add=true' },
    { label: 'Add Customer', icon: UserPlus, route: '/customers?add=true' },
    { label: 'View Reports', icon: FileText, route: '/reports' },
  ];
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6 md:mb-8">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-all"
          onClick={() => navigate(action.route)}
        >
          <action.icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};

// Enhanced Recent Sales Component with thumbnails and staff
const EnhancedRecentSales = () => {
  const {
    data: recentSales,
    isLoading
  } = useRecentSales(5);
  const navigate = useNavigate();
  if (isLoading) {
    return <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-luxury">Recent Sales</CardTitle>
          <CardDescription>Latest 5 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({
            length: 5
          }).map((_, i) => <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>)}
          </div>
        </CardContent>
      </Card>;
  }
  if (!recentSales || recentSales.length === 0) {
    return <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-luxury">
            Recent Sales
          </CardTitle>
          <CardDescription>Latest 5 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">No sales yet today</p>
            <p className="text-sm text-muted-foreground">Sales will appear here as they're made</p>
          </div>
        </CardContent>
      </Card>;
  }
  const getProductThumbnail = (productName: string) => {
    const initial = productName.charAt(0).toUpperCase();
    return <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-sm font-medium text-muted-foreground">{initial}</span>
      </div>;
  };
  const getStaffAvatar = (staffName: string | null) => {
    if (!staffName) return <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">?</span>
      </div>;
    const initials = staffName.split(' ').map(n => n[0]).join('').toUpperCase();
    return <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-medium text-primary">{initials}</span>
      </div>;
  };
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return format(date, 'MMM dd');
  };
  return <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-luxury text-base md:text-lg">
              Recent Sales
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Latest 5 transactions</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/sales/history')} className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">View All Sales History</span>
            <span className="sm:hidden">View All</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentSales.map(sale => {
          const firstProduct = sale.products[0];
          return <div key={sale.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors group cursor-pointer" onClick={() => navigate(`/sales/${sale.id}`)}>
                {getProductThumbnail(firstProduct?.name || 'Unknown')}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {firstProduct?.name || 'Unknown Product'}
                      {sale.products.length > 1 && <span className="text-muted-foreground"> +{sale.products.length - 1} more</span>}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {sale.payment}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(sale.sold_at)}
                    </span>
                    {sale.staff_name && <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          {getStaffAvatar(sale.staff_name)}
                          <span className="text-xs text-muted-foreground">{sale.staff_name}</span>
                        </div>
                      </>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary tracking-tight">
                    {formatCurrency(sale.total)}
                  </p>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>;
        })}
        </div>
      </CardContent>
    </Card>;
};

// Revenue & Profit Trends Component
const RevenueAndProfitTrends = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const {
    data: trendsData,
    isLoading
  } = useTrendsData(selectedPeriod);
  const periods = [{
    period: '7d' as const,
    label: '7d'
  }, {
    period: '30d' as const,
    label: '30d'
  }, {
    period: '90d' as const,
    label: '90d'
  }];
  if (isLoading) {
    return <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-luxury">Revenue & Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>;
  }
  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      return <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => <p key={index} className="text-sm" style={{
          color: entry.color
        }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>)}
        </div>;
    }
    return null;
  };
  return <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-luxury text-base md:text-lg">
              Revenue & Profit Trends
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Performance over time</CardDescription>
          </div>
          <div className="flex gap-1">
            {periods.map(period => <Button key={period.period} variant={selectedPeriod === period.period ? "default" : "outline"} size="sm" onClick={() => setSelectedPeriod(period.period)} className="text-xs md:text-sm">
                {period.label}
              </Button>)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 sm:h-56 md:h-64">
          {trendsData && trendsData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" tick={{
              fontSize: 12
            }} className="text-muted-foreground" />
                <YAxis tick={{
              fontSize: 12
            }} className="text-muted-foreground" tickFormatter={value => `£${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} dot={{
              fill: '#D4AF37',
              strokeWidth: 2,
              r: 4
            }} name="Revenue" />
                <Line type="monotone" dataKey="gross_profit" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{
              fill: 'hsl(var(--foreground))',
              strokeWidth: 2,
              r: 3
            }} name="Gross Profit" />
              </LineChart>
            </ResponsiveContainer> : <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">No data available</p>
                <p className="text-sm text-muted-foreground">Trends will appear as sales are made</p>
              </div>
            </div>}
        </div>
      </CardContent>
    </Card>;
};

// Business Insights Card Component (Unified)
const BusinessInsightsCard = ({ showProfitData = true }: { showProfitData?: boolean }) => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: insights, isLoading } = useBusinessInsights(period);

  // Filter out profit-related insights for non-owners
  const filteredInsights = insights?.filter(insight =>
    showProfitData || insight.type !== 'avg_margin'
  );

  const periodLabels = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-luxury text-lg font-semibold">Business Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-luxury text-base md:text-lg font-semibold">
            Business Insights
          </CardTitle>
          <div className="flex gap-1 md:gap-2 flex-wrap">
            {(Object.keys(periodLabels) as Array<'7d' | '30d' | '90d'>).map((p) => (
              <ToggleChip
                key={p}
                selected={period === p}
                onToggle={() => setPeriod(p)}
                className="text-xs md:text-sm"
              >
                {periodLabels[p]}
              </ToggleChip>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredInsights && filteredInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredInsights.map((insight) => (
              <button
                key={insight.type}
                onClick={() => navigate(insight.link)}
                className="group p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      {insight.label}
                    </p>
                    <p className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {insight.value}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No insights available for the selected period
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Weekly Expenses Card
const WeeklyExpensesCard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week');
  const { data: expenseData, isLoading } = useExpenseSnapshot(period);

  const periodLabels = {
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const formatCategoryName = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-luxury text-base md:text-lg font-semibold">
            Expenses {periodLabels[period]}
          </CardTitle>
          <div className="flex gap-1 md:gap-2 flex-wrap">
            {(Object.keys(periodLabels) as Array<'week' | 'month' | 'quarter' | 'year'>).map((p) => (
              <ToggleChip
                key={p}
                selected={period === p}
                onToggle={() => setPeriod(p)}
                className="text-xs md:text-sm"
              >
                {periodLabels[p].replace('This ', '')}
              </ToggleChip>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {formatCurrency(expenseData?.weeklyTotal || 0)}
          </p>
          {expenseData?.topCategory && (
            <button 
              onClick={() => navigate('/expenses?category=' + encodeURIComponent(expenseData.topCategory || ''))}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left flex items-center gap-1 group"
            >
              <span>Top: {formatCategoryName(expenseData.topCategory)} • {formatCurrency(expenseData.categoryAmount)}</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Staff Activity Component (conditional)
const StaffActivitySection = () => {
  const {
    data: staffActivity,
    isLoading
  } = useStaffActivity();

  // Don't show if loading or only one staff member
  if (isLoading || !staffActivity || staffActivity.recentSales.length <= 1) {
    return null;
  }
  const uniqueStaff = new Set(staffActivity.recentSales.map(sale => sale.staff_name).filter(Boolean));
  if (uniqueStaff.size <= 1) return null;
  return <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-luxury flex items-center gap-2 text-base md:text-lg">
          <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Staff Activity
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">Recent sales by team members</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {staffActivity.recentSales.slice(0, 4).map(sale => <div key={sale.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">{sale.staff_initials}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{sale.staff_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.sold_at), 'HH:mm')}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(sale.total)}
              </p>
            </div>)}
        </div>
      </CardContent>
    </Card>;
};

// Collapsible Restock Alerts
const RestockAlertsSection = () => {
  const {
    data: stockData,
    isLoading
  } = useStockStatus();
  const [isOpen, setIsOpen] = useState(false);
  const alertItems = stockData ? Array.from(stockData.values()).filter(item => item.is_out_of_stock || item.is_at_risk) : [];
  if (isLoading || alertItems.length === 0) return null;
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full p-6 justify-between hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-muted-foreground">
                {alertItems.length} {alertItems.length === 1 ? 'item needs' : 'items need'} restocking
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-2">
            {alertItems.map(item => <div key={item.product_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Product #{item.product_id}</p>
                  <p className="text-xs text-muted-foreground">Stock Level: {item.qty_on_hand} / {item.reorder_threshold}</p>
                </div>
                <Badge variant="secondary" className={`${item.is_out_of_stock ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {item.is_out_of_stock ? 'Sold Out' : `${item.qty_on_hand} left`}
                </Badge>
              </div>)}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
};
export default function Dashboard() {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const { isOwner } = usePermissions();
  const {
    data: todayStats,
    isLoading
  } = useTodayStats();
  const navigate = useNavigate();
  if (authLoading || isLoading) {
    return <AppLayout title="Dashboard" subtitle="Business overview and key metrics">
        
        {/* Top KPI Row Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 mb-6 md:mb-8">
          {Array.from({
          length: 5
        }).map((_, i) => <Card key={i} className="shadow-card">
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>)}
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>;
  }
    return <AppLayout title="Dashboard" subtitle="Business overview and key metrics">
      
      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Top KPI Row */}
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} mb-6 md:mb-8 auto-rows-fr`}>
        <KPICard 
          title="Today's Sales" 
          value={formatCurrency(todayStats?.sales || 0)} 
          icon={PoundSterling} 
          isPrimary 
          onClick={() => navigate('/sales/history')}
        />

        <KPICard 
          title="Transactions" 
          value={(todayStats?.transactions || 0).toString()} 
          icon={ReceiptPoundSterling}
          onClick={() => navigate('/sales/history')}
        />

        {/* Gross Profit - Owner only */}
        {isOwner && (
          <KPICard 
            title="Gross Profit Today" 
            value={formatCurrency(todayStats?.grossProfit || 0)} 
            icon={TrendingUp} 
            isPrimary 
            onClick={() => navigate('/reports')}
          />
        )}

        <KPICard 
          title="Items Sold" 
          value={(todayStats?.itemsSold || 0).toString()} 
          icon={ShoppingCart}
          onClick={() => navigate('/sales/history')}
        />

        <KPICard 
          title="Inventory Value" 
          value={formatCurrency(todayStats?.totalInventoryValue || 0)} 
          icon={Package}
          onClick={() => navigate('/products')}
        />
      </div>

      {/* Recent Sales Section */}
      <div className="mb-6 md:mb-8">
        <EnhancedRecentSales />
      </div>

      {/* Trends & Insights Split Layout */}
      <div className={`grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 ${isOwner ? 'lg:grid-cols-2' : ''} mb-6 md:mb-8`}>
        {/* Revenue & Profit Trends - Owner only */}
        {isOwner && <RevenueAndProfitTrends />}

        <div className="space-y-4 md:space-y-6">
          <div>
            <BusinessInsightsCard showProfitData={isOwner} />
          </div>
        </div>
      </div>

      {/* Purchasing Snapshot Section */}
      <div className="mb-6 md:mb-8">
        
        <PurchasingSnapshotCards />
      </div>

      {/* Weekly Expenses & Pending Trade-Ins */}
      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2 mb-6 md:mb-8">
        <WeeklyExpensesCard />
        <PendingTradeInsCard />
      </div>
      
      {/* Staff Activity if multi-staff */}
      <div className="mb-6 md:mb-8">
        <StaffActivitySection />
      </div>

      {/* Collapsible Restock Alerts */}
      <RestockAlertsSection />
    </AppLayout>;
}