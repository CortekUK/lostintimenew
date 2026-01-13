import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerPreferencesForm, type CustomerPreferences } from './CustomerPreferencesForm';
import { useCreateCustomer, type CustomerInsert } from '@/hooks/useCustomers';
import { User, Heart, Gem, Loader2 } from 'lucide-react';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customerId: number) => void;
}

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
  const createCustomer = useCreateCustomer();
  
  const [formData, setFormData] = useState<CustomerInsert>({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthday: '',
    anniversary: '',
    notes: '',
    ring_size: null,
    bracelet_size: null,
    necklace_length: null,
    metal_preference: null,
    style_preference: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanData = {
      ...formData,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      birthday: formData.birthday || null,
      anniversary: formData.anniversary || null,
      notes: formData.notes || null,
    };

    const result = await createCustomer.mutateAsync(cleanData);
    onSuccess?.(result.id);
    onOpenChange(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      birthday: '',
      anniversary: '',
      notes: '',
      ring_size: null,
      bracelet_size: null,
      necklace_length: null,
      metal_preference: null,
      style_preference: null,
    });
  };

  const handlePreferencesChange = (preferences: CustomerPreferences) => {
    setFormData(prev => ({ ...prev, ...preferences }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record. You can add preferences and special dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="dates" className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                Dates
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1.5">
                <Gem className="h-3.5 w-3.5" />
                Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes about this customer..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="dates" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Add special dates to receive reminders for upcoming birthdays and anniversaries.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anniversary">Anniversary</Label>
                  <Input
                    id="anniversary"
                    type="date"
                    value={formData.anniversary || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, anniversary: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Record customer preferences for personalized recommendations.
              </p>
              <CustomerPreferencesForm
                preferences={{
                  ring_size: formData.ring_size || null,
                  bracelet_size: formData.bracelet_size || null,
                  necklace_length: formData.necklace_length || null,
                  metal_preference: formData.metal_preference || null,
                  style_preference: formData.style_preference || null,
                }}
                onChange={handlePreferencesChange}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending || !formData.name.trim()}>
              {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
