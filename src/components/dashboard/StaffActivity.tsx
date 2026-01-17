import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, ExternalLink } from 'lucide-react';
import { useStaffActivity } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

const StaffRow = ({ sale }: { sale: any }) => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group"
      onClick={() => navigate(`/sales/${sale.id}`)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {sale.staff_initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {sale.staff_name || 'Unknown Staff'}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(sale.sold_at), 'HH:mm')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-primary">
          {formatCurrency(sale.total)}
        </p>
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
};

export const StaffActivity = () => {
  const { data: staffActivity, isLoading } = useStaffActivity();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const salesHistoryPath = can('reports', 'view') ? '/sales/transactions' : '/sales/my-sales';
  
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Staff Activity</CardTitle>
          <CardDescription>Recent team sales performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!staffActivity || (!staffActivity.lastSale && staffActivity.recentSales.length === 0)) {
    return (
      <Card className="shadow-card">
        <CardHeader>
        <CardTitle>Staff Activity</CardTitle>
          <CardDescription>Recent team sales performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No recent activity</p>
            <p className="text-sm text-muted-foreground">Staff sales will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <CardTitle>Staff Activity</CardTitle>
        <CardDescription>Recent team sales performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Last Sale Highlight */}
          {staffActivity.lastSale && (
            <div 
              className="p-3 bg-primary/5 border border-primary/20 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => navigate(`/sales/${staffActivity.lastSale?.sale_id}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Latest Sale</span>
              </div>
              <p className="text-sm">
                <span className="font-medium">
                  {staffActivity.lastSale.staff_name || 'Unknown Staff'}
                </span>
                <span className="text-muted-foreground ml-1">
                  {formatDistanceToNow(new Date(staffActivity.lastSale.sold_at), { addSuffix: true })}
                </span>
              </p>
            </div>
          )}
          
          {/* Recent Sales List */}
          {staffActivity.recentSales.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Recent Sales
              </h4>
              <div className="space-y-1">
                {staffActivity.recentSales.slice(0, 4).map((sale) => (
                  <StaffRow key={sale.id} sale={sale} />
                ))}
              </div>
            </div>
          )}
          
          {/* View All Button */}
          {staffActivity.recentSales.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(salesHistoryPath)}
              className="w-full mt-3"
            >
              View All Sales History
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};