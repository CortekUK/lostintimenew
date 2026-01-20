import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerPreferencesForm, type CustomerPreferences } from './CustomerPreferencesForm';
import { useUpdateCustomer, type Customer, type CustomerUpdate } from '@/hooks/useCustomers';
import { User, Heart, Gem, Loader2 } from 'lucide-react';

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const updateCustomer = useUpdateCustomer();
  
  const [formData, setFormData] = useState<CustomerUpdate>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        birthday: customer.birthday,
        anniversary: customer.anniversary,
        notes: customer.notes,
        ring_size: customer.ring_size,
        bracelet_size: customer.bracelet_size,
        necklace_length: customer.necklace_length,
        metal_preference: customer.metal_preference,
        style_preference: customer.style_preference,
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    
    await updateCustomer.mutateAsync({ id: customer.id, ...formData });
    onOpenChange(false);
  };

  const handlePreferencesChange = (preferences: CustomerPreferences) => {
    setFormData(prev => ({ ...prev, ...preferences }));
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-luxury">Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer details, preferences, and special dates.
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
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value || null }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value || null }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value || null }))}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
                  placeholder="Any notes about this customer..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="dates" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Update special dates for birthday and anniversary reminders.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-birthday">Birthday</Label>
                  <Input
                    id="edit-birthday"
                    type="date"
                    value={formData.birthday || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-anniversary">Anniversary</Label>
                  <Input
                    id="edit-anniversary"
                    type="date"
                    value={formData.anniversary || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, anniversary: e.target.value || null }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Update customer preferences for personalized recommendations.
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
            <Button type="submit" disabled={updateCustomer.isPending || !formData.name?.trim()}>
              {updateCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
