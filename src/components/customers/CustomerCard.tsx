import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VIPTierBadge } from './VIPTierBadge';
import { Mail, Phone, MapPin, Gift, Heart, ChevronRight } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Customer } from '@/hooks/useCustomers';

interface CustomerCardProps {
  customer: Customer;
  onClick: () => void;
}

function getUpcomingDate(dateStr: string | null): { days: number; date: Date } | null {
  if (!dateStr) return null;
  
  const today = new Date();
  const date = parseISO(dateStr);
  
  // Create this year's occurrence
  let thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  
  // If it's already passed this year, use next year
  if (thisYear < today) {
    thisYear = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
  }
  
  const days = differenceInDays(thisYear, today);
  return { days, date: thisYear };
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const birthday = getUpcomingDate(customer.birthday);
  const anniversary = getUpcomingDate(customer.anniversary);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card 
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
              <VIPTierBadge tier={customer.vip_tier} size="sm" />
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {customer.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="font-semibold text-lg text-foreground">
              {formatCurrency(customer.lifetime_spend)}
            </p>
            <p className="text-xs text-muted-foreground">
              {customer.total_purchases} purchase{customer.total_purchases !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Upcoming Events */}
        {(birthday || anniversary) && (
          <div className="mt-3 pt-3 border-t border-border flex gap-3">
            {birthday && birthday.days <= 30 && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs",
                birthday.days <= 7 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"
              )}>
                <Gift className="h-3.5 w-3.5" />
                <span>Birthday in {birthday.days} day{birthday.days !== 1 ? 's' : ''}</span>
              </div>
            )}
            {anniversary && anniversary.days <= 30 && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs",
                anniversary.days <= 7 ? "text-rose-600 dark:text-rose-400 font-medium" : "text-muted-foreground"
              )}>
                <Heart className="h-3.5 w-3.5" />
                <span>Anniversary in {anniversary.days} day{anniversary.days !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* Hover indicator */}
        <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View details</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}
