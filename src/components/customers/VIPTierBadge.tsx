import { Badge } from '@/components/ui/badge';
import { Crown, Award, Medal, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VIPTier = 'standard' | 'silver' | 'gold' | 'platinum';

interface VIPTierBadgeProps {
  tier: VIPTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const tierConfig: Record<VIPTier, {
  label: string;
  icon: typeof Crown;
  className: string;
}> = {
  standard: {
    label: 'Standard',
    icon: User,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  silver: {
    label: 'Silver',
    icon: Medal,
    className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  },
  gold: {
    label: 'Gold',
    icon: Award,
    className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  },
  platinum: {
    label: 'Platinum',
    icon: Crown,
    className: 'bg-gradient-to-r from-violet-50 to-purple-50 text-purple-700 border-purple-300 dark:from-violet-900/30 dark:to-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  },
};

const sizeConfig = {
  sm: { badge: 'text-xs px-1.5 py-0', icon: 'h-3 w-3' },
  md: { badge: 'text-xs px-2 py-0.5', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'text-sm px-2.5 py-1', icon: 'h-4 w-4' },
};

export function VIPTierBadge({ tier, size = 'md', showLabel = true, className }: VIPTierBadgeProps) {
  const config = tierConfig[tier];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        sizes.badge,
        config.className,
        className
      )}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

export function getVIPTierThreshold(tier: VIPTier): number {
  switch (tier) {
    case 'platinum': return 5000;
    case 'gold': return 2000;
    case 'silver': return 500;
    default: return 0;
  }
}

export function getNextVIPTier(currentTier: VIPTier): VIPTier | null {
  switch (currentTier) {
    case 'standard': return 'silver';
    case 'silver': return 'gold';
    case 'gold': return 'platinum';
    default: return null;
  }
}
