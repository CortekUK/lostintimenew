import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RecordCommissionPaymentModal } from './RecordCommissionPaymentModal';
import { CommissionSettingsModal } from './CommissionSettingsModal';
import { StaffCommissionOverrideModal } from './StaffCommissionOverrideModal';
import { CommissionPaymentHistory } from './CommissionPaymentHistory';
import { BulkCommissionPaymentModal } from './BulkCommissionPaymentModal';
import { useMonthlyCommission, MonthlyCommission, StaffMonthlyData } from '@/hooks/useMonthlyCommission';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { exportCommissionCSV, StaffCommissionData } from '@/utils/commissionExport';
import { 
  ChevronDown,
  ChevronRight,
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
  Star,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MonthlyCommissionView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner } = usePermissions();
  const { 
    monthlyData, 
    grandTotals, 
    isLoading,
    commissionEnabled,
    commissionRate,
    commissionBasis
  } = useMonthlyCommission({ monthsBack: 12 });

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([monthlyData[0]?.month]));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ data: StaffMonthlyData; month: MonthlyCommission } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<{ id: string; name: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [bulkPayMonth, setBulkPayMonth] = useState<MonthlyCommission | null>(null);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const handleViewStaffSales = (staffId: string, month: MonthlyCommission) => {
    const params = new URLSearchParams();
    params.set('from', month.periodStart);
    params.set('to', month.periodEnd);
    params.set('staff', staffId);
    navigate(`/sales/items?${params.toString()}`);
  };

  const handleRecordPayment = (staff: StaffMonthlyData, month: MonthlyCommission) => {
    setSelectedStaff({ data: staff, month });
    setShowPaymentModal(true);
  };

  const handleExport = () => {
    // Export current expanded months or all if none expanded
    const dataToExport: StaffCommissionData[] = [];
    
    monthlyData.forEach(month => {
      month.staffData.forEach(staff => {
        dataToExport.push({
          staffId: staff.staffId,
          staffName: `${staff.staffName} (${month.monthLabel})`,
          salesCount: staff.salesCount,
          revenue: staff.revenue,
          profit: staff.profit,
          commission: staff.commissionOwed,
        });
      });
    });

    if (dataToExport.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no commission records to export.',
        variant: 'destructive'
      });
      return;
    }

    exportCommissionCSV(
      dataToExport,
      { from: monthlyData[monthlyData.length - 1]?.periodStart, to: monthlyData[0]?.periodEnd },
      commissionRate,
      commissionBasis,
      `monthly-commission-export.csv`
    );

    toast({
      title: 'Export Complete',
      description: `Exported commission data for ${monthlyData.length} months`
    });
  };

  // Filter months based on status
  const filteredMonths = monthlyData.filter(month => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return month.totals.outstanding > 0;
    if (filterStatus === 'paid') return month.totals.outstanding === 0 && month.totals.owed > 0;
    return true;
  });

  const getMonthStatusBadge = (month: MonthlyCommission) => {
    const { owed, paid, outstanding } = month.totals;
    
    if (outstanding === 0 && owed > 0) {
      return (
        <Badge variant="default" className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          All Paid
        </Badge>
      );
    } else if (paid > 0) {
      return (
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          £{outstanding.toFixed(0)} outstanding
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        £{owed.toFixed(0)} owed
      </Badge>
    );
  };

  const getStaffStatusBadge = (staff: StaffMonthlyData) => {
    if (staff.status === 'paid') {
      return (
        <Badge variant="default" className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    } else if (staff.status === 'partial') {
      return (
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          £{staff.outstanding.toFixed(2)} due
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Unpaid
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              <SelectItem value="unpaid">Unpaid Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
            </SelectContent>
          </Select>
          
          {grandTotals.outstanding > 0 && (
            <Badge variant="destructive" className="ml-2">
              £{grandTotals.outstanding.toFixed(0)} total outstanding
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          )}
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{showHistory ? 'Hide History' : 'Payment History'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{grandTotals.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {grandTotals.salesCount} transactions (12 months)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Owed</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">£{grandTotals.owed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total across all months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">£{grandTotals.paid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Already paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${grandTotals.outstanding > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              £{grandTotals.outstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Still to pay</p>
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
              <Badge variant="outline" className="text-warning border-warning/30">
                Commission Tracking Disabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History (toggleable) */}
      {showHistory && <CommissionPaymentHistory />}

      {/* Month-by-Month Expandable List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading commission data...
            </CardContent>
          </Card>
        ) : filteredMonths.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No commission data found
            </CardContent>
          </Card>
        ) : (
          filteredMonths.map(month => (
            <Collapsible
              key={month.month}
              open={expandedMonths.has(month.month)}
              onOpenChange={() => toggleMonth(month.month)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {/* Left side - Month info */}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {expandedMonths.has(month.month) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
                        <CardTitle className="text-base font-medium truncate">{month.monthLabel}</CardTitle>
                        {getMonthStatusBadge(month)}
                      </div>
                      
                      {/* Right side - Stats and actions */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm pl-6 sm:pl-0">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          {month.staffData.length} staff • {month.totals.salesCount} sales
                        </span>
                        <span className="font-mono font-medium text-xs sm:text-sm">
                          £{month.totals.owed.toFixed(2)} <span className="text-muted-foreground">owed</span>
                        </span>
                        <span className="font-mono text-success text-xs sm:text-sm">
                          £{month.totals.paid.toFixed(2)} <span className="text-muted-foreground">paid</span>
                        </span>
                        {month.totals.outstanding > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkPayMonth(month);
                            }}
                          >
                            <CreditCard className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Pay All</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Staff</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Sales</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Revenue</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Profit</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Commission</th>
                            <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2">Status</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {month.staffData.map(staff => (
                            <tr key={staff.staffId} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{staff.staffName}</span>
                                  {staff.effectiveRate !== commissionRate && (
                                    <Badge variant="outline" className="text-xs gap-1 border-primary/50 text-primary">
                                      <Star className="h-3 w-3" />
                                      {staff.effectiveRate}%
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-right px-4 py-3 font-mono text-sm">{staff.salesCount}</td>
                              <td className="text-right px-4 py-3 font-mono text-sm">£{staff.revenue.toFixed(2)}</td>
                              <td className={`text-right px-4 py-3 font-mono text-sm ${staff.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                £{staff.profit.toFixed(2)}
                              </td>
                              <td className="text-right px-4 py-3 font-mono text-sm font-bold text-primary">
                                £{staff.commissionOwed.toFixed(2)}
                              </td>
                              <td className="text-center px-4 py-3">
                                {getStaffStatusBadge(staff)}
                              </td>
                              <td className="text-right px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  {staff.outstanding > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRecordPayment(staff, month);
                                      }}
                                    >
                                      Pay
                                    </Button>
                                  )}
                                  {isOwner && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingStaff({ id: staff.staffId, name: staff.staffName });
                                      }}
                                      title="Edit Commission Rate"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewStaffSales(staff.staffId, month);
                                    }}
                                    title="View Staff Sales"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      {/* Modals */}
      <CommissionSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {editingStaff && (
        <StaffCommissionOverrideModal
          open={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staffId={editingStaff.id}
          staffName={editingStaff.name}
        />
      )}

      {selectedStaff && (
        <RecordCommissionPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          staffData={{
            staffId: selectedStaff.data.staffId,
            staffName: selectedStaff.data.staffName,
            salesCount: selectedStaff.data.salesCount,
            revenue: selectedStaff.data.revenue,
            profit: selectedStaff.data.profit,
            commission: selectedStaff.data.commissionOwed,
          }}
          dateRange={{
            from: new Date(selectedStaff.month.periodStart),
            to: new Date(selectedStaff.month.periodEnd),
          }}
          commissionRate={selectedStaff.data.effectiveRate}
          commissionBasis={selectedStaff.data.effectiveBasis}
          alreadyPaid={selectedStaff.data.commissionPaid}
        />
      )}

      {bulkPayMonth && (
        <BulkCommissionPaymentModal
          open={!!bulkPayMonth}
          onOpenChange={(open) => !open && setBulkPayMonth(null)}
          month={bulkPayMonth}
        />
      )}
    </div>
  );
}
