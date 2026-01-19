import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Shield, RotateCcw, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings, RolePermissionOverrides, ModulePermissionOverrides } from '@/contexts/SettingsContext';
import {
  UserRole,
  CRMModule,
  Action,
  CRM_MODULES,
  ACTIONS,
  MODULE_LABELS,
  ACTION_LABELS,
  ROLE_LABELS,
  getDefaultRolePermissions,
} from '@/lib/permissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Modules that can be configured (excluding dashboard which is always viewable)
const CONFIGURABLE_MODULES: CRMModule[] = [
  CRM_MODULES.PRODUCTS,
  CRM_MODULES.SUPPLIERS,
  CRM_MODULES.CUSTOMERS,
  CRM_MODULES.SALES,
  CRM_MODULES.CONSIGNMENTS,
  CRM_MODULES.EXPENSES,
  CRM_MODULES.REPORTS,
  CRM_MODULES.ANALYTICS,
];

// Actions that can be configured per module
const CONFIGURABLE_ACTIONS: Action[] = [
  ACTIONS.VIEW,
  ACTIONS.CREATE,
  ACTIONS.EDIT,
  ACTIONS.DELETE,
];

// Some modules only support view action
const VIEW_ONLY_MODULES: CRMModule[] = [
  CRM_MODULES.REPORTS,
  CRM_MODULES.ANALYTICS,
  CRM_MODULES.DASHBOARD,
];

export function RolePermissionsManager() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'manager' | 'staff'>('manager');

  // Get current overrides or empty object
  const currentOverrides: RolePermissionOverrides = settings.rolePermissions || {
    manager: {},
    staff: {},
  };

  // Get effective permission value (override or default)
  const getPermission = (role: 'manager' | 'staff', module: CRMModule, action: Action): boolean => {
    const overrides = currentOverrides[role]?.[module];
    if (overrides && action in overrides) {
      return overrides[action] ?? false;
    }
    // Fall back to default
    const defaultPerms = getDefaultRolePermissions(role);
    return defaultPerms[module]?.[action] ?? false;
  };

  // Check if a permission has been customized (differs from default)
  const isCustomized = (role: 'manager' | 'staff', module: CRMModule, action: Action): boolean => {
    const overrides = currentOverrides[role]?.[module];
    if (!overrides || !(action in overrides)) {
      return false;
    }
    const defaultPerms = getDefaultRolePermissions(role);
    return overrides[action] !== defaultPerms[module]?.[action];
  };

  // Toggle a permission
  const togglePermission = async (role: 'manager' | 'staff', module: CRMModule, action: Action) => {
    setSaving(true);
    try {
      const currentValue = getPermission(role, module, action);
      const newValue = !currentValue;

      // Build new overrides
      const newOverrides: RolePermissionOverrides = {
        ...currentOverrides,
        [role]: {
          ...currentOverrides[role],
          [module]: {
            ...currentOverrides[role]?.[module],
            [action]: newValue,
          } as ModulePermissionOverrides,
        },
      };

      await updateSettings({ rolePermissions: newOverrides });
      
      toast({
        title: 'Permission updated',
        description: `${ROLE_LABELS[role]} ${newValue ? 'can now' : 'can no longer'} ${ACTION_LABELS[action].toLowerCase()} ${MODULE_LABELS[module].toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update permission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset a role's permissions to defaults
  const resetToDefaults = async (role: 'manager' | 'staff') => {
    setSaving(true);
    try {
      const newOverrides: RolePermissionOverrides = {
        ...currentOverrides,
        [role]: {},
      };

      await updateSettings({ rolePermissions: newOverrides });
      
      toast({
        title: 'Permissions reset',
        description: `${ROLE_LABELS[role]} permissions have been reset to defaults.`,
      });
    } catch (error) {
      console.error('Error resetting permissions:', error);
      toast({
        title: 'Reset failed',
        description: 'Failed to reset permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if role has any customizations
  const hasCustomizations = (role: 'manager' | 'staff'): boolean => {
    const roleOverrides = currentOverrides[role];
    if (!roleOverrides) return false;
    return Object.keys(roleOverrides).length > 0;
  };

  const renderPermissionGrid = (role: 'manager' | 'staff') => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={role === 'manager' ? 'secondary' : 'outline'}>
              {ROLE_LABELS[role]}
            </Badge>
            {hasCustomizations(role) && (
              <Badge variant="outline" className="text-xs">
                Customized
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetToDefaults(role)}
            disabled={saving || !hasCustomizations(role)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-5 gap-2 p-3 bg-muted/50 text-sm font-medium">
            <div>Module</div>
            {CONFIGURABLE_ACTIONS.map((action) => (
              <div key={action} className="text-center">
                {ACTION_LABELS[action]}
              </div>
            ))}
          </div>

          {/* Rows */}
          {CONFIGURABLE_MODULES.map((module) => {
            const isViewOnly = VIEW_ONLY_MODULES.includes(module);
            
            return (
              <div
                key={module}
                className="grid grid-cols-5 gap-2 p-3 border-t items-center hover:bg-muted/30 transition-colors"
              >
                <div className="font-medium text-sm">
                  {MODULE_LABELS[module]}
                </div>
                {CONFIGURABLE_ACTIONS.map((action) => {
                  const isDisabled = isViewOnly && action !== ACTIONS.VIEW;
                  const isOn = getPermission(role, module, action);
                  const customized = isCustomized(role, module, action);

                  return (
                    <div key={action} className="flex justify-center">
                      {isDisabled ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-9 h-5 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">—</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This module only supports viewing</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="relative">
                          <Switch
                            checked={isOn}
                            onCheckedChange={() => togglePermission(role, module, action)}
                            disabled={saving}
                          />
                          {customized && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Yellow dots indicate permissions that differ from defaults.
        </p>
      </div>
    );
  };

  return (
    <Card id="role-permissions">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>
              Customize what managers and staff can access. Owner always has full access.
            </CardDescription>
          </div>
          {saving && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manager' | 'staff')}>
          <TabsList className="mb-4">
            <TabsTrigger value="manager">Manager</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          <TabsContent value="manager">
            {renderPermissionGrid('manager')}
          </TabsContent>

          <TabsContent value="staff">
            {renderPermissionGrid('staff')}
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permission Levels
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>View:</strong> See data and navigate to the module</li>
            <li><strong>Create:</strong> Add new records (requires View)</li>
            <li><strong>Edit:</strong> Modify existing records (requires View)</li>
            <li><strong>Delete:</strong> Remove records permanently (requires View)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
