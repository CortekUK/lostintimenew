import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VIPTierBadge } from './VIPTierBadge';
import { useCustomerSearch, type Customer } from '@/hooks/useCustomers';
import { Search, X, UserPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSearchProps {
  selectedCustomer: Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'vip_tier'> | null;
  onSelect: (customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'vip_tier'> | null) => void;
  onAddNew?: () => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSearch({ 
  selectedCustomer, 
  onSelect, 
  onAddNew,
  placeholder = "Search customers...",
  className 
}: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: results, isLoading } = useCustomerSearch(query);

  // Reset query when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setQuery('');
    }
  }, [selectedCustomer]);

  const handleSelect = (customer: Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'vip_tier'>) => {
    onSelect(customer);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    inputRef.current?.focus();
  };

  if (selectedCustomer) {
    return (
      <div className={cn("flex items-center gap-2 p-2 border rounded-md bg-muted/50", className)}>
        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{selectedCustomer.name}</span>
            <VIPTierBadge tier={selectedCustomer.vip_tier} size="sm" showLabel={false} />
          </div>
          {selectedCustomer.email && (
            <p className="text-xs text-muted-foreground truncate">{selectedCustomer.email}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open && e.target.value.length >= 2) {
                setOpen(true);
              }
            }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results && results.length > 0 ? (
              <CommandGroup heading="Customers">
                {results.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.name}
                    onSelect={() => handleSelect(customer)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{customer.name}</span>
                          <VIPTierBadge tier={customer.vip_tier} size="sm" showLabel={false} />
                        </div>
                        {customer.email && (
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : query.length >= 2 ? (
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">No customers found</p>
                  {onAddNew && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        onAddNew();
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Customer
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
          </CommandList>
          {onAddNew && results && results.length > 0 && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  onAddNew();
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
