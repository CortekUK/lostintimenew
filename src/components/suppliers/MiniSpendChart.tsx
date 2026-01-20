import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface SpendTrendData {
  month: string;
  stockSpend: number;
  expenseSpend: number;
  totalSpend?: number;
  total?: number;
}

interface MiniSpendChartProps {
  spendTrend: SpendTrendData[] | undefined;
  months?: number;
}

export function MiniSpendChart({ spendTrend, months = 6 }: MiniSpendChartProps) {
  const chartData = spendTrend?.slice(-months) || [];

  if (!chartData.length) {
    return (
      <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="font-luxury text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Spend Trend ({months} Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No spend data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Trends will appear after transactions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="font-luxury text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Spend Trend ({months} Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip 
                formatter={(value) => [`£${Number(value).toLocaleString()}`, '']}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: 12,
                }}
              />
              <Bar 
                dataKey="stockSpend" 
                stackId="a" 
                fill="hsl(var(--primary))" 
                name="Stock" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="expenseSpend" 
                stackId="a" 
                fill="hsl(var(--secondary))" 
                name="Expenses"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-primary" />
            <span>Stock</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-secondary" />
            <span>Expenses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
