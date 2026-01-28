import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategoryBreakdown, useMonthlyTrends } from '@/hooks/useExpenseAnalytics';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { ExpenseFilters } from '@/hooks/useExpenseAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#6366f1',
];

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent & Utilities',
  utilities: 'Utilities',
  marketing: 'Marketing',
  fees: 'Fees',
  wages: 'Wages & Salaries',
  repairs: 'Repairs & Maintenance',
  commission: 'Commission',
  other: 'Other',
};

interface ExpenseChartsProps {
  filters?: ExpenseFilters;
}

export function CategoryBreakdownChart({ filters }: ExpenseChartsProps) {
  const categoryData = useCategoryBreakdown(filters);

  if (!categoryData || categoryData.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Expenses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center px-4">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-muted-foreground font-medium">No category data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add expenses to see your category breakdown
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = categoryData.map(item => ({
    name: CATEGORY_LABELS[item.category] || item.category,
    value: item.total,
    count: item.count,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            Amount: £{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground">
            Count: {payload[0].payload.count} expenses
          </p>
          <p className="text-sm text-muted-foreground">
            {payload[0].payload.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>Expenses by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
              label={({ percentage }) => `${percentage.toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlyTrendsChart({ filters }: ExpenseChartsProps) {
  const trendsData = useMonthlyTrends(filters);

  if (!trendsData || trendsData.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>Expense trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center px-4">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-muted-foreground font-medium">No trend data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Track your expenses over time to see trends
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: £{entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ))}
          <p className="text-sm font-semibold mt-1 border-t border-border pt-1">
            Total: £{payload.reduce((sum: number, p: any) => sum + p.value, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
        <CardDescription>Operating expenses vs COGS over the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendsData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="operating"
              name="Operating"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: '#0ea5e9' }}
            />
            <Line
              type="monotone"
              dataKey="cogs"
              name="COGS"
              stroke="#D4AF37"
              strokeWidth={2}
              dot={{ fill: '#D4AF37' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ExpenseChartsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
