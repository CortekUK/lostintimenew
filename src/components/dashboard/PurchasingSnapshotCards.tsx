import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  ShoppingCart, 
  Package, 
  TrendingDown, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  usePurchasesThisMonth, 
  useInventoryAgeBreakdown, 
  usePurchasesVsSales 
} from '@/hooks/usePurchasingSnapshot';
import { useState } from 'react';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { HelpCircle } from 'lucide-react';

const PurchasesThisMonthCard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const { data, isLoading } = usePurchasesThisMonth(period);

  const periodLabels = {
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <Skeleton className="h-5 w-1/2 mb-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    );
  }

  const isDecrease = data && data.percentageChange < 0;
  const isNeutral = data && data.percentageChange === 0;

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-luxury text-lg font-semibold">
            Purchases {periodLabels[period]}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(periodLabels) as Array<'week' | 'month' | 'quarter' | 'year'>).map((p) => (
              <ToggleChip
                key={p}
                selected={period === p}
                onToggle={() => setPeriod(p)}
              >
                {periodLabels[p].replace('This ', '')}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                  ?
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total purchase cost recognised this month (based on purchase_date)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {formatCurrency(data?.totalCost || 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {data?.itemCount || 0} items
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">vs last month</p>
            <Badge 
              variant="secondary" 
              className={`text-xs flex items-center gap-1 ${
                isDecrease ? 'text-green-600 dark:text-green-400' : 
                isNeutral ? 'text-muted-foreground' : 
                'text-muted-foreground'
              }`}
            >
              {!isNeutral && (isDecrease ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />)}
              {Math.abs(data?.percentageChange || 0).toFixed(1)}%
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products')}
          className="w-full mt-auto text-xs text-muted-foreground hover:text-primary"
        >
          View products <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};

const InventoryAgeCard = () => {
  const { data, isLoading } = useInventoryAgeBreakdown();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <Skeleton className="h-5 w-1/2 mb-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-luxury text-lg font-semibold">
            Inventory Age
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                  ?
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Based on purchase_date. Consignment items use consignment_start_date if present.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-between hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 dark:border-green-800"
            onClick={() => navigate('/products?age=30')}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">0-30d</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.fresh.count || 0} • {formatCurrency(data?.fresh.cost || 0)}
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            onClick={() => navigate('/products?age=60')}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">31-90d</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.warming.count || 0} • {formatCurrency(data?.warming.cost || 0)}
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
            onClick={() => navigate('/products?age=90')}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium">&gt;90d</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.aged.count || 0} • {formatCurrency(data?.aged.cost || 0)}
            </span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products?age=90')}
          className="w-full mt-auto text-xs text-muted-foreground hover:text-primary"
        >
          View aged items <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};

const PurchasesVsSalesCard = () => {
  const { data, isLoading } = usePurchasesVsSales();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <Skeleton className="h-5 w-1/2 mb-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Purchases vs Sales (30d)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {data && data.length > 0 ? (
          <div className="h-48 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `£${value}`}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={{ fill: '#D4AF37', r: 2 }}
                  name="Sales"
                />
                <Line 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 2 }}
                  name="Purchases"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center flex-1">
            <div className="text-center">
              <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No data in the last 30 days</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PurchasingSnapshotCards = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <PurchasesThisMonthCard />
      <InventoryAgeCard />
      <PurchasesVsSalesCard />
    </div>
  );
};
