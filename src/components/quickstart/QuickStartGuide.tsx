import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useSuppliers } from '@/hooks/useDatabase';
import { useSettings } from '@/contexts/SettingsContext';

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionText?: string;
}

export function QuickStartGuide() {
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem('sc_quickstart_dismissed') === 'true'
  );
  
  const { userRole } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const { settings } = useSettings();

  if (dismissed || userRole !== 'owner') return null;

  const steps: QuickStartStep[] = [
    {
      id: 'settings',
      title: 'Configure Basic Settings',
      description: 'Set your currency, tax rates, and business preferences',
      completed: settings.currency !== '£' || settings.taxInclusive !== false,
      action: () => window.location.href = '/settings',
      actionText: 'Open Settings'
    },
    {
      id: 'suppliers',
      title: 'Add Your Suppliers',
      description: 'Add suppliers to track your inventory sources',
      completed: suppliers.length > 0,
      action: () => window.location.href = '/suppliers',
      actionText: 'Add Suppliers'
    },
    {
      id: 'products',
      title: 'Add Your Products',
      description: 'Start building your clothing inventory catalog',
      completed: products.length > 0,
      action: () => window.location.href = '/products',
      actionText: 'Add Products'
    },
    {
      id: 'first-sale',
      title: 'Make Your First Sale',
      description: 'Test the POS system with a sample transaction',
      completed: false, // We could track this with a flag in the database
      action: () => window.location.href = '/sales',
      actionText: 'Start Selling'
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const handleDismiss = () => {
    localStorage.setItem('sc_quickstart_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <Card className="shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Quick Start Guide</CardTitle>
            <Badge variant="secondary">{completedSteps}/{steps.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Dismiss
          </Button>
        </div>
        <CardDescription>
          Get your clothing store POS system set up in just a few steps
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                step.completed 
                  ? 'bg-success/10 border-success/20' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <h4 className={`font-medium text-sm ${step.completed ? 'text-success' : 'text-foreground'}`}>
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              
              {!step.completed && step.action && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={step.action}
                  className="ml-4"
                >
                  {step.actionText}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {completedSteps === steps.length && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="font-medium text-success">Congratulations!</p>
            <p className="text-sm text-muted-foreground">Your clothing store POS is ready to use</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}