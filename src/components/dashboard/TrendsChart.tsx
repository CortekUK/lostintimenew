import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { useTrendsData, TrendsPeriod } from '@/hooks/useDashboardData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useState } from 'react';

const periods: TrendsPeriod[] = [
  { period: '7d', label: '7 days' },
  { period: '30d', label: '30 days' },
  { period: '90d', label: '90 days' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: £{entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const TrendsChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: trendsData, isLoading } = useTrendsData(selectedPeriod);
  
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Revenue and profit over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="space-y-4 w-full">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!trendsData || trendsData.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Revenue Trends
              </CardTitle>
              <CardDescription>Revenue and profit over time</CardDescription>
            </div>
            <div className="flex gap-1">
              {periods.map((period) => (
                <Button
                  key={period.period}
                  variant={selectedPeriod === period.period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod(period.period)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground font-medium">No data available</p>
              <p className="text-sm text-muted-foreground">Trends will appear as sales are made</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Revenue Trends
            </CardTitle>
            <CardDescription>Revenue and profit over time</CardDescription>
          </div>
          <div className="flex gap-1">
            {periods.map((period) => (
              <Button
                key={period.period}
                variant={selectedPeriod === period.period ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(period.period)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendsData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="opacity-30" 
                stroke="hsl(var(--border))"
              />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `£${value}`}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#D4AF37"
                strokeWidth={3}
                dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#D4AF37', strokeWidth: 2 }}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="gross_profit" 
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
                name="Gross Profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};