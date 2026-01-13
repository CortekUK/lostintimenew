import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { VIPTierBadge, VIPTier } from '@/components/customers/VIPTierBadge';
import { useCustomerSearch } from '@/hooks/useCustomers';
import { Search, UserPlus, X, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSearchInputProps {
  customerName: string;
  customerEmail: string;
  selectedCustomerId: number | null;
  onCustomerNameChange: (name: string) => void;
  onCustomerEmailChange: (email: string) => void;
  onCustomerSelect: (customerId: number | null, name: string, email: string) => void;
  className?: string;
}

export function CustomerSearchInput({
  customerName,
  customerEmail,
  selectedCustomerId,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerSelect,
}: CustomerSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: searchResults = [], isLoading } = useCustomerSearch(searchQuery);

  // When user types, update both local search and parent state
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onCustomerNameChange(value);
    // Clear selection when typing new value
    if (selectedCustomerId) {
      onCustomerSelect(null, value, customerEmail);
    }
  };

  // Select an existing customer
  const handleSelectCustomer = (customer: { id: number; name: string; email: string | null; vip_tier: string }) => {
    onCustomerSelect(customer.id, customer.name, customer.email || '');
    setSearchQuery(customer.name);
    setOpen(false);
  };

  // Clear selection
  const handleClear = () => {
    onCustomerSelect(null, '', '');
    setSearchQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Customer Name/Search */}
      <div className="space-y-2">
        <Label htmlFor="customer-search">Customer Name (Optional)</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className="relative" data-customer-search>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer-search"
                placeholder="Search or enter customer name..."
                value={selectedCustomerId ? customerName : searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setOpen(true)}
                className={cn(
                  "pl-9 pr-9",
                  selectedCustomerId && "border-primary/50 bg-primary/5"
                )}
              />
              {(customerName || searchQuery) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </PopoverAnchor>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              // Don't close if clicking inside the anchor (input area)
              if (e.target instanceof Element && e.target.closest('[data-customer-search]')) {
                e.preventDefault();
                return;
              }
              setOpen(false);
            }}
          >
            <Command shouldFilter={false}>
              <CommandList>
                {isLoading && searchQuery.length >= 2 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}
                
                {!isLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <CommandEmpty className="py-4">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No customers found</p>
                      <p className="text-xs text-muted-foreground">
                        "{searchQuery}" will be created as new customer
                      </p>
                    </div>
                  </CommandEmpty>
                )}
                
                {searchQuery.length < 2 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <CommandGroup heading="Existing Customers">
                    {searchResults.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id.toString()}
                        onSelect={() => handleSelectCustomer(customer as { id: number; name: string; email: string | null; vip_tier: string })}
                        className="flex items-center justify-between py-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.name}</span>
                            {customer.email && (
                              <span className="text-xs text-muted-foreground">{customer.email}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <VIPTierBadge tier={customer.vip_tier as VIPTier} size="sm" />
                          {selectedCustomerId === customer.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {searchQuery.length >= 2 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        onCustomerSelect(null, searchQuery, customerEmail);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 py-3 cursor-pointer border-t"
                    >
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <span>Create new customer: "<span className="font-medium">{searchQuery}</span>"</span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Status indicator */}
        {selectedCustomerId && (
          <p className="text-xs text-primary flex items-center gap-1">
            <Check className="h-3 w-3" />
            Linked to existing customer
          </p>
        )}
        {!selectedCustomerId && customerName && customerName.length >= 2 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <UserPlus className="h-3 w-3" />
            New customer will be created
          </p>
        )}
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="customer-email">Customer Email (Optional)</Label>
        <Input
          id="customer-email"
          type="email"
          placeholder="customer@example.com"
          value={customerEmail}
          onChange={(e) => onCustomerEmailChange(e.target.value)}
          disabled={!!selectedCustomerId}
          className={cn(selectedCustomerId && "bg-muted/50")}
        />
        {selectedCustomerId && customerEmail && (
          <p className="text-xs text-muted-foreground">
            Email from customer profile
          </p>
        )}
      </div>
    </div>
  );
}
