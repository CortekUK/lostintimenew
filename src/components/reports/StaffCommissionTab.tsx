import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { useToast } from '@/hooks/use-toast';
import { useSoldItemsReport } from '@/hooks/useDatabase';
import { useSettings } from '@/contexts/SettingsContext';
import { exportCommissionCSV, StaffCommissionData } from '@/utils/commissionExport';
import { 
  Download, 
  PoundSterling, 
  TrendingUp, 
  Coins, 
  Percent,
  ExternalLink,
  Users
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from '@/types';

export function StaffCommissionTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: soldItemsData = [], isLoading } = useSoldItemsReport();
  const { settings } = useSettings();
  
  const commissionRate = settings.commissionSettings?.defaultRate ?? 5;
  const commissionBasis = settings.commissionSettings?.calculationBasis ?? 'revenue';
  const commissionEnabled = settings.commissionSettings?.enabled ?? true;
  
  // Default to current month
  const [dateRange, setDateRange] = useState<DateRange>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Filter items by date range and exclude trade-ins
  const filteredItems = useMemo(() => {
    if (!soldItemsData || !Array.isArray(soldItemsData)) return [];
    
    return soldItemsData.filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      if (item?.products?.is_trade_in === true) return false;
      
      const saleDate = new Date(item.sold_at);
      if (isNaN(saleDate.getTime())) return false;
      
      const fromDate = dateRange.from ? startOfDay(new Date(dateRange.from)) : null;
      const toDate = dateRange.to ? endOfDay(new Date(dateRange.to)) : null;
      
      return (!fromDate || saleDate >= fromDate) && (!toDate || saleDate <= toDate);
    });
  }, [soldItemsData, dateRange]);

  // Aggregate by staff
  const staffCommissions = useMemo((): StaffCommissionData[] => {
    const byStaff = new Map<string, {
      staffId: string;
      staffName: string;
      salesCount: number;
      saleIds: Set<number>;
      revenue: number;
      profit: number;
    }>();
    
    filteredItems.forEach((item: any) => {
      const staffId = item.sales?.staff_id || 'unknown';
      const staffName = item.sales?.staff_member_name || item.sales?.profiles?.full_name || 'Unknown';
      
      if (!byStaff.has(staffId)) {
        byStaff.set(staffId, {
          staffId,
          staffName,
          salesCount: 0,
          saleIds: new Set(),
          revenue: 0,
          profit: 0
        });
      }
      
      const entry = byStaff.get(staffId)!;
      entry.saleIds.add(item.sale_id);
      entry.revenue += item.line_revenue || 0;
      entry.profit += item.line_gross_profit || 0;
    });
    
    return Array.from(byStaff.values()).map(staff => ({
      staffId: staff.staffId,
      staffName: staff.staffName,
      salesCount: staff.saleIds.size,
      revenue: staff.revenue,
      profit: staff.profit,
      commission: commissionEnabled 
        ? (commissionBasis === 'profit' 
            ? staff.profit * (commissionRate / 100)
            : staff.revenue * (commissionRate / 100))
        : 0
    })).sort((a, b) => b.commission - a.commission);
  }, [filteredItems, commissionRate, commissionBasis, commissionEnabled]);

  // Calculate totals
  const totals = useMemo(() => {
    return staffCommissions.reduce(
      (acc, staff) => ({
        salesCount: acc.salesCount + staff.salesCount,
        revenue: acc.revenue + staff.revenue,
        profit: acc.profit + staff.profit,
        commission: acc.commission + staff.commission
      }),
      { salesCount: 0, revenue: 0, profit: 0, commission: 0 }
    );
  }, [staffCommissions]);

  const handleExport = () => {
    if (staffCommissions.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no commission records for the selected period.',
        variant: 'destructive'
      });
      return;
    }
    
    exportCommissionCSV(
      staffCommissions,
      dateRange,
      commissionRate,
      commissionBasis,
      `staff-commission-${dateRange.from || 'all'}-${dateRange.to || 'time'}.csv`
    );
    
    toast({
      title: 'Export Complete',
      description: `Exported commission data for ${staffCommissions.length} staff members`
    });
  };

  const handleViewStaffSales = (staffId: string) => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    params.set('staff', staffId);
    navigate(`/sales/items?${params.toString()}`);
  };

  const columns = [
    {
      key: 'staffName',
      title: 'Staff Member',
      sortable: true,
      render: (value: string) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'salesCount',
      title: 'Sales',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-mono">{value}</span>
      )
    },
    {
      key: 'revenue',
      title: 'Revenue',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-mono">£{value.toFixed(2)}</span>
      )
    },
    {
      key: 'profit',
      title: 'Gross Profit',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className={`font-mono ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
          £{value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'commission',
      title: 'Commission Owed',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-mono font-bold text-primary">
          £{value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'actions',
      title: '',
      render: (_: any, row: StaffCommissionData) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewStaffSales(row.staffId)}
          title="View Staff Sales"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <Button variant="outline" onClick={handleExport} disabled={isLoading || staffCommissions.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totals.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totals.salesCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              £{totals.profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gross profit for period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Owed</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">£{totals.commission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total for all staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionRate}%</div>
            <p className="text-xs text-muted-foreground">
              of {commissionBasis === 'profit' ? 'gross profit' : 'revenue'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Disabled Warning */}
      {!commissionEnabled && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-4">
            <p className="text-sm text-warning-foreground">
              Commission tracking is currently disabled in settings. Enable it to see accurate commission calculations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Commission Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            data={staffCommissions}
            columns={columns}
            loading={isLoading}
            emptyMessage="No sales data found for the selected period"
          />
        </CardContent>
      </Card>
    </div>
  );
}
