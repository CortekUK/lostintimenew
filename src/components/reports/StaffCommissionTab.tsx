import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { RecordCommissionPaymentModal } from '@/components/reports/RecordCommissionPaymentModal';
import { CommissionPaymentHistory } from '@/components/reports/CommissionPaymentHistory';
import { CommissionSettingsModal } from '@/components/reports/CommissionSettingsModal';
import { StaffCommissionOverrideModal } from '@/components/reports/StaffCommissionOverrideModal';
import { useToast } from '@/hooks/use-toast';
import { useSoldItemsReport } from '@/hooks/useDatabase';
import { useSettings } from '@/contexts/SettingsContext';
import { useCommissionPayments } from '@/hooks/useCommissionPayments';
import { useStaffCommissionOverrides } from '@/hooks/useStaffCommissionOverrides';
import { usePermissions } from '@/hooks/usePermissions';
import { exportCommissionCSV, StaffCommissionData } from '@/utils/commissionExport';
import { 
  Download, 
  PoundSterling, 
  TrendingUp, 
  Coins, 
  Percent,
  ExternalLink,
  Users,
  CheckCircle,
  AlertCircle,
  History,
  Settings,
  Pencil,
  Star
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, parse } from 'date-fns';
import type { DateRange } from '@/types';

export function StaffCommissionTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner } = usePermissions();
  const { data: soldItemsData = [], isLoading } = useSoldItemsReport();
  const { settings } = useSettings();
  const { data: overrides = [] } = useStaffCommissionOverrides();
  
  const commissionRate = settings.commissionSettings?.defaultRate ?? 5;
  const commissionBasis = settings.commissionSettings?.calculationBasis ?? 'revenue';
  const commissionEnabled = settings.commissionSettings?.enabled ?? true;
  
  // Default to current month
  const [dateRange, setDateRange] = useState<DateRange>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffCommissionData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<{ id: string; name: string } | null>(null);

  // Fetch payments for the current period
  const { data: periodPayments = [] } = useCommissionPayments({
    periodStart: dateRange.from,
    periodEnd: dateRange.to,
  });
  
  // Get override for a specific staff member
  const getStaffOverride = (staffId: string) => {
    return overrides.find(o => o.staff_id === staffId);
  };

  // Calculate paid amounts by staff
  const paidByStaff = useMemo(() => {
    const map = new Map<string, number>();
    periodPayments.forEach(payment => {
      const current = map.get(payment.staff_id) || 0;
      map.set(payment.staff_id, current + Number(payment.commission_amount));
    });
    return map;
  }, [periodPayments]);

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
    
    return Array.from(byStaff.values()).map(staff => {
      // Check for per-staff override
      const override = getStaffOverride(staff.staffId);
      const effectiveRate = override?.commission_rate ?? commissionRate;
      const effectiveBasis = override?.commission_basis ?? commissionBasis;
      const hasCustomRate = !!override;
      
      const commission = commissionEnabled 
        ? (effectiveBasis === 'profit' 
            ? staff.profit * (effectiveRate / 100)
            : staff.revenue * (effectiveRate / 100))
        : 0;
      
      return {
        staffId: staff.staffId,
        staffName: staff.staffName,
        salesCount: staff.saleIds.size,
        revenue: staff.revenue,
        profit: staff.profit,
        commission,
        hasCustomRate,
        effectiveRate,
        effectiveBasis,
      };
    }).sort((a, b) => b.commission - a.commission);
  }, [filteredItems, commissionRate, commissionBasis, commissionEnabled, overrides]);

  // Calculate totals including payment status
  const totals = useMemo(() => {
    const base = staffCommissions.reduce(
      (acc, staff) => ({
        salesCount: acc.salesCount + staff.salesCount,
        revenue: acc.revenue + staff.revenue,
        profit: acc.profit + staff.profit,
        commission: acc.commission + staff.commission
      }),
      { salesCount: 0, revenue: 0, profit: 0, commission: 0 }
    );

    const totalPaid = Array.from(paidByStaff.values()).reduce((sum, v) => sum + v, 0);
    
    return {
      ...base,
      paid: totalPaid,
      outstanding: base.commission - totalPaid
    };
  }, [staffCommissions, paidByStaff]);

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

  const handleRecordPayment = (staff: StaffCommissionData) => {
    setSelectedStaff(staff);
    setShowPaymentModal(true);
  };

  const getPaymentStatus = (staffId: string, owed: number) => {
    const paid = paidByStaff.get(staffId) || 0;
    if (paid >= owed) {
      return { status: 'paid', paid, outstanding: 0 };
    } else if (paid > 0) {
      return { status: 'partial', paid, outstanding: owed - paid };
    }
    return { status: 'unpaid', paid: 0, outstanding: owed };
  };

  const columns = [
    {
      key: 'staffName',
      title: 'Staff Member',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          {row.hasCustomRate && (
            <Badge variant="outline" className="text-xs gap-1 border-primary/50 text-primary">
              <Star className="h-3 w-3" />
              {row.effectiveRate}%
            </Badge>
          )}
        </div>
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
      title: 'Commission',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-mono font-bold text-primary">
          £{value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, row: StaffCommissionData) => {
        const { status, paid, outstanding } = getPaymentStatus(row.staffId, row.commission);
        
        if (status === 'paid') {
          return (
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Paid
            </Badge>
          );
        } else if (status === 'partial') {
          return (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <AlertCircle className="h-3 w-3 mr-1" />
              £{outstanding.toFixed(2)} due
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
      render: (_: any, row: any) => {
        const { outstanding } = getPaymentStatus(row.staffId, row.commission);
        return (
          <div className="flex gap-1">
            {outstanding > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRecordPayment(row)}
              >
                Pay
              </Button>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingStaff({ id: row.staffId, name: row.staffName })}
                title="Edit Commission Rate"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewStaffSales(row.staffId)}
              title="View Staff Sales"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        );
      }
    }
  ];

  // Parse dateRange for modal
  const dateRangeForModal = {
    from: dateRange.from ? parse(dateRange.from, 'yyyy-MM-dd', new Date()) : undefined,
    to: dateRange.to ? parse(dateRange.to, 'yyyy-MM-dd', new Date()) : undefined,
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <div className="flex gap-2">
          {isOwner && (
            <Button 
              variant="outline" 
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            {showHistory ? 'Hide History' : 'Payment History'}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isLoading || staffCommissions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">£{totals.paid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Already paid out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.outstanding > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
              £{totals.outstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Still to pay
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Rate Card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Commission Rate:</span>
              <span className="font-medium">{commissionRate}% of {commissionBasis === 'profit' ? 'gross profit' : 'revenue'}</span>
            </div>
            {!commissionEnabled && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                Commission Tracking Disabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History (toggleable) */}
      {showHistory && (
        <CommissionPaymentHistory />
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

      {/* Record Payment Modal */}
      {/* Commission Settings Modal */}
      <CommissionSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Staff Override Modal */}
      {editingStaff && (
        <StaffCommissionOverrideModal
          open={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staffId={editingStaff.id}
          staffName={editingStaff.name}
        />
      )}

      {/* Record Payment Modal */}
      {selectedStaff && (
        <RecordCommissionPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          staffData={selectedStaff}
          dateRange={dateRangeForModal}
          commissionRate={selectedStaff.effectiveRate || commissionRate}
          commissionBasis={commissionBasis}
          alreadyPaid={paidByStaff.get(selectedStaff.staffId) || 0}
        />
      )}
    </div>
  );
}
