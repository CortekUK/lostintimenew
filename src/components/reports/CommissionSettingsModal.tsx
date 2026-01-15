import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/contexts/SettingsContext';
import {
  useStaffCommissionOverrides,
  useDeleteStaffCommissionOverride,
} from '@/hooks/useStaffCommissionOverrides';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Pencil, RotateCcw, Settings, Users } from 'lucide-react';
import { StaffCommissionOverrideModal } from './StaffCommissionOverrideModal';
import { toast } from 'sonner';

interface CommissionSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function CommissionSettingsModal({ open, onClose }: CommissionSettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const { data: overrides = [] } = useStaffCommissionOverrides();
  const deleteOverride = useDeleteStaffCommissionOverride();

  const [enabled, setEnabled] = useState(settings.commissionSettings?.enabled ?? true);
  const [rate, setRate] = useState(
    (settings.commissionSettings?.defaultRate ?? 5).toString()
  );
  const [basis, setBasis] = useState<'revenue' | 'profit'>(
    settings.commissionSettings?.calculationBasis ?? 'revenue'
  );
  const [isSaving, setIsSaving] = useState(false);

  const [editingStaff, setEditingStaff] = useState<{ id: string; name: string } | null>(null);

  // Fetch all staff members
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-for-commission'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role')
        .in('role', ['owner', 'manager', 'staff'])
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      setEnabled(settings.commissionSettings?.enabled ?? true);
      setRate((settings.commissionSettings?.defaultRate ?? 5).toString());
      setBasis(settings.commissionSettings?.calculationBasis ?? 'revenue');
    }
  }, [open, settings.commissionSettings]);

  const handleSaveGlobal = async () => {
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      toast.error('Please enter a valid rate between 0 and 100');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        commissionSettings: {
          enabled,
          defaultRate: numRate,
          calculationBasis: basis,
        },
      });
      toast.success('Commission settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStaffOverride = (staffId: string) => {
    return overrides.find((o) => o.staff_id === staffId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Commission Settings</DialogTitle>
            <DialogDescription>
              Configure global and per-staff commission rates
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="global" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global" className="gap-2">
                <Settings className="h-4 w-4" />
                Global Settings
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-2">
                <Users className="h-4 w-4" />
                Staff Rates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Commission Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track and calculate commissions for all sales
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="global-rate">Default Commission Rate (%)</Label>
                <Input
                  id="global-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  disabled={!enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="global-basis">Calculation Basis</Label>
                <Select
                  value={basis}
                  onValueChange={(v) => setBasis(v as 'revenue' | 'profit')}
                  disabled={!enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue (Sale Price)</SelectItem>
                    <SelectItem value="profit">Profit (Margin)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {basis === 'revenue'
                    ? 'Commission calculated as a percentage of sale price'
                    : 'Commission calculated as a percentage of profit margin'}
                </p>
              </div>

              <Button
                onClick={handleSaveGlobal}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Saving...' : 'Save Global Settings'}
              </Button>
            </TabsContent>

            <TabsContent value="staff" className="mt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Set custom commission rates for individual staff members. Staff without a
                  custom rate will use the global default.
                </p>

                <div className="divide-y divide-border rounded-lg border">
                  {staffMembers.map((staff) => {
                    const override = getStaffOverride(staff.user_id);
                    return (
                      <div
                        key={staff.user_id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {staff.full_name || staff.email}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {staff.role}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {override ? (
                            <Badge variant="default" className="shrink-0">
                              {override.commission_rate}% of {override.commission_basis}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="shrink-0">
                              Global ({rate}%)
                            </Badge>
                          )}

                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setEditingStaff({
                                  id: staff.user_id,
                                  name: staff.full_name || staff.email,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {override && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deleteOverride.mutate(staff.user_id)}
                                disabled={deleteOverride.isPending}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {staffMembers.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No staff members found
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {editingStaff && (
        <StaffCommissionOverrideModal
          open={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staffId={editingStaff.id}
          staffName={editingStaff.name}
        />
      )}
    </>
  );
}
