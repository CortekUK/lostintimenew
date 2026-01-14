import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, User, Database, Trash2, TrendingUp } from 'lucide-react';
import { useAuditSummary } from '@/hooks/useAuditLog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ActivitySummaryProps {
  className?: string;
}

export function ActivitySummary({ className }: ActivitySummaryProps) {
  const { data: summary, isLoading } = useAuditSummary();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const chartData = summary.activityByUser.slice(0, 5).map(user => ({
    name: user.name.split(' ')[0], // First name only for chart
    inserts: user.inserts,
    updates: user.updates,
    deletes: user.deletes
  }));

  const chartConfig = {
    inserts: { label: 'Created', color: 'hsl(var(--chart-1))' },
    updates: { label: 'Updated', color: 'hsl(var(--chart-2))' },
    deletes: { label: 'Deleted', color: 'hsl(var(--chart-3))' }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Today</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalToday}</div>
            <div className="text-xs text-muted-foreground">changes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">This Week</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalThisWeek}</div>
            <div className="text-xs text-muted-foreground">total changes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Most Active</span>
            </div>
            <div className="text-lg font-bold truncate">
              {summary.mostActiveUser?.name || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {summary.mostActiveUser ? `${summary.mostActiveUser.count} actions` : 'No activity'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Top Table</span>
            </div>
            <div className="text-lg font-bold truncate capitalize">
              {summary.mostChangedTable?.table.replace(/_/g, ' ') || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {summary.mostChangedTable ? `${summary.mostChangedTable.count} changes` : 'No changes'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity by User Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-sm">Activity by Team Member (7 days)</h4>
              {summary.recentDeletions > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <Trash2 className="h-3 w-3" />
                  {summary.recentDeletions} deletion{summary.recentDeletions !== 1 ? 's' : ''} today
                </div>
              )}
            </div>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={70}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconSize={8}
                  />
                  <Bar 
                    dataKey="inserts" 
                    name="Created"
                    fill="hsl(var(--chart-1))" 
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="updates" 
                    name="Updated"
                    fill="hsl(var(--chart-2))" 
                    stackId="a"
                  />
                  <Bar 
                    dataKey="deletes" 
                    name="Deleted"
                    fill="hsl(var(--chart-3))" 
                    stackId="a"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
