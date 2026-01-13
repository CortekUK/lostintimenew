import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Target, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';
import { useBusinessInsights } from '@/hooks/useDashboardData';
import { useNavigate } from 'react-router-dom';

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'top_seller':
      return Target;
    case 'avg_margin':
      return TrendingUp;
    case 'aged_stock':
      return AlertTriangle;
    default:
      return Lightbulb;
  }
};

const getInsightVariant = (type: string) => {
  switch (type) {
    case 'top_seller':
      return 'default';
    case 'avg_margin':
      return 'secondary';
    case 'aged_stock':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function BusinessInsights() {
  const { data: insights, isLoading } = useBusinessInsights();
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>Real-time performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!insights || insights.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>Real-time performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No insights available</p>
            <p className="text-sm text-muted-foreground">Insights will appear as data accumulates</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <CardTitle>Business Insights</CardTitle>
        <CardDescription>Real-time performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <Button
                key={index}
                variant="ghost"
                onClick={() => navigate(insight.link)}
                className="w-full justify-between p-3 h-auto hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground mb-0.5">{insight.label}</p>
                    <p className="text-sm font-semibold text-foreground">{insight.value}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}