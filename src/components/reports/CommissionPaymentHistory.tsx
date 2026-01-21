import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Trash2, History } from 'lucide-react';
import { formatPaymentMethod } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedTable, Column } from '@/components/ui/enhanced-table';
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
import { useCommissionPayments, useDeleteCommissionPayment, CommissionPayment } from '@/hooks/useCommissionPayments';
import { useToast } from '@/hooks/use-toast';
import { exportCommissionPaymentsCSV } from '@/utils/commissionExport';

interface CommissionPaymentHistoryProps {
  staffId?: string;
}

export function CommissionPaymentHistory({ staffId }: CommissionPaymentHistoryProps) {
  const { data: payments = [], isLoading } = useCommissionPayments({ staffId });
  const deletePayment = useDeleteCommissionPayment();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deletePayment.mutateAsync(deleteId);
      toast({
        title: 'Payment deleted',
        description: 'The commission payment record has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete the payment record.',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    if (payments.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no payment records to export.',
        variant: 'destructive',
      });
      return;
    }

    exportCommissionPaymentsCSV(payments, 'commission-payment-history.csv');
    toast({
      title: 'Export complete',
      description: `Exported ${payments.length} payment records.`,
    });
  };

  const columns: Column<CommissionPayment>[] = [
    {
      key: 'paid_at',
      title: 'Date',
      sortable: true,
      render: (value) => format(new Date(value as string), 'dd MMM yyyy'),
    },
    {
      key: 'staff',
      title: 'Staff Member',
      render: (_, payment) => payment.staff?.full_name || payment.staff?.email || 'Unknown',
    },
    {
      key: 'period',
      title: 'Period',
      render: (_, payment) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(payment.period_start), 'dd MMM')} – {format(new Date(payment.period_end), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'commission_amount',
      title: 'Amount',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className="font-medium text-green-600">£{Number(value).toFixed(2)}</span>
      ),
    },
    {
      key: 'payment_method',
      title: 'Method',
      render: (value) => (
        <span>{formatPaymentMethod(value as string)}</span>
      ),
    },
    {
      key: 'paid_by_profile',
      title: 'Paid By',
      render: (_, payment) => payment.paid_by_profile?.full_name || 'Unknown',
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      render: (_, payment) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteId(payment.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.commission_amount), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Commission Payment History
          </CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 ? 's' : ''} totaling £{totalPaid.toFixed(2)}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={payments.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <EnhancedTable
          data={payments}
          columns={columns}
          loading={isLoading}
          emptyMessage="No commission payments recorded yet."
          pageSize={10}
        />
      </CardContent>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this commission payment record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
