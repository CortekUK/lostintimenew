import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, 
  ShoppingCart, 
  Package, 
  PoundSterling, 
  BarChart3, 
  Settings,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const features = [
  {
    icon: ShoppingCart,
    title: 'Point of Sale',
    description: 'Fast checkout with part-exchange support & receipt printing'
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Track stock, consignments & trade-ins'
  },
  {
    icon: PoundSterling,
    title: 'Expense Tracking',
    description: 'Record and categorise business expenses'
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Clear profit & loss, sales trends, supplier insights'
  },
  {
    icon: Settings,
    title: 'Settings & Preferences',
    description: 'Configure business details, tax rates, and currency'
  }
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show welcome modal on the user's very first login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userWelcomeKey = `jc_welcome_seen_${session.user.id}`;
          const hasSeenWelcome = localStorage.getItem(userWelcomeKey);
          
          if (!hasSeenWelcome) {
            setOpen(true);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleClose = async () => {
    // Get current user and store per-user flag
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const userWelcomeKey = `jc_welcome_seen_${currentUser.id}`;
      localStorage.setItem(userWelcomeKey, 'true');
    }
    setOpen(false);
  };

  if (step === 0) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-lg p-4 sm:p-6">
          <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-6 w-6 text-primary" />
          👋 Welcome to Sourced Jewellers CRM
        </DialogTitle>
        <DialogDescription>
          A complete POS and inventory management system designed for jewellers
        </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <feature.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            
            
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setStep(1)} className="w-full">
                Get Started
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            🚀 Quick Start Guide
          </DialogTitle>
          <DialogDescription>
            Follow these steps to get your store up and running
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                Add Your Products
              </CardTitle>
              <CardDescription className="text-sm">
                Upload watches, rings, or other jewellery to your inventory
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                Configure Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Set up tax rates, supplier details, and consignment rules
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                Make Your First Sale
              </CardTitle>
              <CardDescription className="text-sm">
                Use POS to process a transaction or part-exchange
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Button onClick={handleClose} className="w-full">
            ✨ Start Using Your CRM
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}