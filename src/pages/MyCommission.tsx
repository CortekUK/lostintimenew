import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedTable, Column } from '@/components/ui/enhanced-table';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffMonthlyCommission, MonthlyCommission } from '@/hooks/useMonthlyCommission';
import { 
  Coins, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  ExternalLink,
  Calendar,
  PoundSterling
} from 'lucide-react';

export default function MyCommission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    monthlyData, 
    grandTotals, 
    currentMonth,
    isLoading,
    commissionEnabled,
    commissionRate,
    commissionBasis
  } = useStaffMonthlyCommission(user?.id || '');

  const handleViewSales = (month: MonthlyCommission) => {
    const params = new URLSearchParams();
    params.set('from', month.periodStart);
    params.set('to', month.periodEnd);
    params.set('staff', user?.id || '');
    navigate(`/sales/items?${params.toString()}`);
  };

  // Get my data for current month
  const myCurrentMonthData = currentMonth?.staffData[0];

  // Filter to only months where I have sales
  const myMonths = monthlyData.filter(m => m.staffData.length > 0);

  const columns: Column<MonthlyCommission>[] = [
    {
      key: 'monthLabel',
      title: 'Month',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'totals',
      title: 'Sales',
      sortable: false,
      align: 'right' as const,
      render: (_, row) => (
        <span className="font-mono">{row.totals.salesCount}</span>
      )
    },
    {
      key: 'revenue',
      title: 'Revenue',
      sortable: false,
      align: 'right' as const,
      render: (_, row) => (
        <span className="font-mono">£{row.totals.revenue.toFixed(2)}</span>
      )
    },
    {
      key: 'profit',
      title: 'Profit',
      sortable: false,
      align: 'right' as const,
      render: (_, row) => (
        <span className={`font-mono ${row.totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
          £{row.totals.profit.toFixed(2)}
        </span>
      )
    },
    {
      key: 'commission',
      title: 'Commission',
      sortable: false,
      align: 'right' as const,
      render: (_, row) => (
        <span className="font-mono font-bold text-primary">
          £{row.totals.owed.toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => {
        const { owed, paid, outstanding } = row.totals;
        
        if (paid >= owed && owed > 0) {
          return (
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Paid (£{paid.toFixed(2)})
            </Badge>
          );
        } else if (paid > 0) {
          return (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <AlertCircle className="h-3 w-3 mr-1" />
              Partial (£{paid.toFixed(2)}/£{owed.toFixed(2)})
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Unpaid
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      title: '',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewSales(row)}
          title="View my sales for this month"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View Sales
        </Button>
      )
    }
  ];

  if (!commissionEnabled) {
    return (
      <AppLayout 
        title="My Commission" 
        subtitle="Track your commission earnings"
      >
        <Card>
          <CardContent className="py-12 text-center">
            <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Commission Tracking Disabled</h3>
            <p className="text-muted-foreground">
              Commission tracking is currently not enabled. Contact your manager for more information.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="My Commission" 
      subtitle="Track your monthly commission earnings and payment status"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                £{(myCurrentMonthData?.commissionOwed || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {myCurrentMonthData?.salesCount || 0} sales • {currentMonth?.monthLabel}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${grandTotals.outstanding > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                £{grandTotals.outstanding.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all unpaid months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                £{grandTotals.paid.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {commissionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                of {commissionBasis === 'profit' ? 'gross profit' : 'revenue'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PoundSterling className="h-5 w-5" />
              Commission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedTable
              data={myMonths}
              columns={columns}
              loading={isLoading}
              emptyMessage="No commission history found"
              pageSize={12}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
