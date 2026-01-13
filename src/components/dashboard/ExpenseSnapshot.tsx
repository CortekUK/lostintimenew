import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PoundSterling, TrendingDown } from 'lucide-react';
import { useExpenseSnapshot } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const formatCategoryName = (category: string) => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const ExpenseSnapshot = () => {
  const { data: expenseSnapshot, isLoading } = useExpenseSnapshot();
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Weekly Expenses</CardTitle>
          <CardDescription>This week's spending overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <Skeleton className="h-8 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!expenseSnapshot) {
    return (
      <Card className="shadow-card">
        <CardHeader>
        <CardTitle>Weekly Expenses</CardTitle>
          <CardDescription>This week's spending overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No expenses this week</p>
            <p className="text-sm text-muted-foreground">Weekly expenses will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer" onClick={() => navigate('/expenses')}>
      <CardHeader>
        <CardTitle>Weekly Expenses</CardTitle>
        <CardDescription>This week's spending overview · Click to view all</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(expenseSnapshot.weeklyTotal)}
            </div>
            <p className="text-sm text-muted-foreground">
              Total expenses this week
            </p>
          </div>
          
          {expenseSnapshot.topCategory && expenseSnapshot.categoryAmount > 0 && (
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-sm">
                Top: {formatCategoryName(expenseSnapshot.topCategory)} 
                <span className="ml-1 font-semibold">
                  {formatCurrency(expenseSnapshot.categoryAmount)}
                </span>
              </Badge>
            </div>
          )}
          
          {expenseSnapshot.weeklyTotal === 0 && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                No expenses recorded this week 🎉
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};