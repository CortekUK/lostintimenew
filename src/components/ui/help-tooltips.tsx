import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HelpTooltipProps {
  content: string;
  type?: 'info' | 'help' | 'warning';
  children?: React.ReactNode;
}

export function HelpTooltip({ content, type = 'help', children }: HelpTooltipProps) {
  const icons = {
    help: HelpCircle,
    info: Info,
    warning: AlertCircle
  };

  const Icon = icons[type];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
            aria-label={`${type} tooltip`}
          >
            <Icon className="h-3 w-3" />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Predefined tooltips for common use cases
export const tooltips = {
  stockTracking: (
    <HelpTooltip content="When enabled, this product's inventory will be automatically tracked when sales are made. Disable for services or non-inventory items." />
  ),
  taxRate: (
    <HelpTooltip content="The tax rate applied to this product. This will be used to calculate tax during checkout." />
  ),
  unitCost: (
    <HelpTooltip content="The cost you paid for this item. Used to calculate profit margins and COGS." />
  ),
  size: (
    <HelpTooltip content="The size of the clothing item (e.g., XS, S, M, L, XL, or numeric sizes like 10, 12, 14)." />
  ),
  sku: (
    <HelpTooltip content="Stock Keeping Unit - a unique identifier for this product in your inventory system." />
  ),
  rls: (
    <HelpTooltip 
      type="warning"
      content="Row Level Security ensures data is only accessible to authorized users based on their role." 
    />
  )
};