import { Button } from '@/components/ui/button';
import { SuggestedQuery } from '@/types/chat';
import {
  Receipt,
  AlertTriangle,
  Crown,
  Package,
  CreditCard,
  Handshake,
} from 'lucide-react';

interface ChatSuggestionsProps {
  suggestions: SuggestedQuery[];
  onSelect: (index: number) => void;
  disabled?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  receipt: Receipt,
  'alert-triangle': AlertTriangle,
  crown: Crown,
  package: Package,
  'credit-card': CreditCard,
  handshake: Handshake,
};

export function ChatSuggestions({ suggestions, onSelect, disabled }: ChatSuggestionsProps) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Try asking about:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon ? iconMap[suggestion.icon] : null;
          return (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSelect(index)}
              disabled={disabled}
              className="justify-start gap-2 h-auto py-2 px-3 text-left"
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
              <span className="truncate text-xs">{suggestion.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
