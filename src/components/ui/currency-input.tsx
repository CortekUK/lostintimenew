import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onValueChange: (value: string) => void;
  error?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, error, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);
    const hasInitialized = React.useRef(false);

    // Only sync from prop on initial mount or when not focused
    React.useEffect(() => {
      if (isFocused) return; // Don't override while user is typing
      
      if (value === "" || value === undefined || value === null) {
        setDisplayValue("");
        hasInitialized.current = true;
        return;
      }
      
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        setDisplayValue(String(numValue));
        hasInitialized.current = true;
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9.]/g, "");
      
      // Prevent multiple decimal points
      const parts = rawValue.split(".");
      let cleanValue = parts[0];
      if (parts.length > 1) {
        cleanValue += "." + parts.slice(1).join("").substring(0, 2);
      }

      setDisplayValue(cleanValue);
      onValueChange(cleanValue);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (displayValue && !isNaN(parseFloat(displayValue))) {
        const numValue = parseFloat(displayValue);
        const formatted = Number.isInteger(numValue) ? String(numValue) : numValue.toString();
        setDisplayValue(formatted);
        onValueChange(formatted);
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          £
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "pl-8",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
