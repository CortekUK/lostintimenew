import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings as SettingsIcon, User, Building, ShoppingCart, Download, Upload, Smartphone, Sparkles, Filter, Clock, Package, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { CSVExportButton } from '@/components/csv/CSVExportButton';
import { CSVImportModal } from '@/components/csv/CSVImportModal';
import { UserManagement } from '@/components/settings/UserManagement';
import { LocationsSettings } from '@/components/settings/LocationsSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { productCSVHeaders, supplierCSVHeaders, expenseCSVHeaders, productTypeCoercion, expenseTypeCoercion } from '@/utils/csvUtils';

// Timezone options grouped by region
const timezoneOptions = [
  { label: 'Europe', options: [
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Rome', label: 'Rome (CET)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET)' },
    { value: 'Europe/Athens', label: 'Athens (EET)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  ]},
  { label: 'Americas', options: [
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'America/Chicago', label: 'Chicago (CST)' },
    { value: 'America/Denver', label: 'Denver (MST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
    { value: 'America/Toronto', label: 'Toronto (EST)' },
    { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  ]},
  { label: 'Asia/Pacific', options: [
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ]},
];

export default function Settings() {
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();
  const { toast } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showProductImport, setShowProductImport] = useState(false);
  const [showSupplierImport, setShowSupplierImport] = useState(false);
  const [showExpenseImport, setShowExpenseImport] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Local state for immediate UI updates
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Store information state
  const [storeInfo, setStoreInfo] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: ''
  });

  // Available quick filter presets
  const availablePresets = [
    { id: 'watches', label: 'Watches', category: 'Categories' },
    { id: 'rings', label: 'Rings', category: 'Categories' },
    { id: 'necklaces', label: 'Necklaces', category: 'Categories' },
    { id: 'bracelets', label: 'Bracelets', category: 'Categories' },
    { id: 'earrings', label: 'Earrings', category: 'Categories' },
    { id: 'gold', label: 'Gold', category: 'Metals' },
    { id: 'white-gold', label: 'White Gold', category: 'Metals' },
    { id: 'rose-gold', label: 'Rose Gold', category: 'Metals' },
    { id: 'silver', label: 'Silver', category: 'Metals' },
    { id: 'platinum', label: 'Platinum', category: 'Metals' },
    { id: 'in-stock', label: 'In Stock', category: 'Stock' },
    { id: 'low-stock', label: 'Low Stock', category: 'Stock' },
    { id: 'out-of-stock', label: 'Out of Stock', category: 'Stock' },
    { id: 'under-1k', label: '< £1k', category: 'Price' },
    { id: '1k-5k', label: '£1k–£5k', category: 'Price' },
    { id: '5k-10k', label: '£5k–£10k', category: 'Price' },
    { id: 'over-10k', label: '> £10k', category: 'Price' },
  ];

  // Load profile data
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Update local settings when settings change
  useEffect(() => {
    setLocalSettings(settings);
    // Load store information from settings
    if (settings && (settings as any).store) {
      const store = (settings as any).store;
      setStoreInfo({
        name: store.name || '',
        tagline: store.tagline || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || ''
      });
    }
  }, [settings]);

  // Auto-scroll to section based on URL parameter
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setTimeout(() => {
        const element = document.getElementById(section);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [searchParams]);

  // Handle PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Check if app is already installed
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleProfileUpdate = async (field: 'full_name' | 'bio', value: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file.',
          variant: 'destructive'
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 2MB.',
          variant: 'destructive'
        });
        return;
      }

      setIsUploadingAvatar(true);

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-images')
            .remove([`${user?.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: 'Avatar updated',
        description: 'Your profile image has been updated successfully.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!avatarUrl) return;

    try {
      setIsUploadingAvatar(true);

      // Delete from storage
      const path = avatarUrl.split('/').pop();
      if (path) {
        await supabase.storage
          .from('profile-images')
          .remove([`${user?.id}/${path}`]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user?.id);

      if (error) throw error;

      setAvatarUrl('');
      toast({
        title: 'Avatar removed',
        description: 'Your profile image has been removed.',
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Remove failed',
        description: 'Failed to remove avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSettingChange = async (key: keyof typeof settings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    if (userRole === 'owner') {
      try {
        setIsUpdating(true);
        await updateSettings({ [key]: value });
        toast({
          title: 'Settings updated',
          description: 'Your changes have been saved.',
        });
      } catch (error) {
        console.error('Failed to update settings:', error);
        setLocalSettings(settings);
        toast({
          title: 'Update failed',
          description: 'Failed to save settings. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleStoreInfoUpdate = async (field: keyof typeof storeInfo, value: string) => {
    const updatedStoreInfo = { ...storeInfo, [field]: value };
    setStoreInfo(updatedStoreInfo);
    
    if (userRole === 'owner') {
      try {
        setIsUpdating(true);
        await updateSettings({ store: updatedStoreInfo } as any);
        toast({
          title: 'Store information updated',
          description: 'Your store details have been saved.',
        });
      } catch (error) {
        console.error('Failed to update store info:', error);
        toast({
          title: 'Update failed',
          description: 'Failed to save store information. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // CSV Import handlers
  const handleProductImport = async (data: any[]) => {
    const { data: suppliers } = await supabase.from('suppliers').select('id, name');
    const supplierMap = new Map(suppliers?.map(s => [s.name.toLowerCase(), s.id]));

    for (const product of data) {
      const productData: any = {
        name: product.name,
        sku: product.sku,
        category: product.category,
        metal: product.metal,
        karat: product.karat,
        gemstone: product.gemstone,
        unit_cost: product.unit_cost,
        unit_price: product.unit_price,
        tax_rate: product.tax_rate,
        track_stock: product.track_stock
      };

      if (product.supplier_name) {
        const supplierId = supplierMap.get(product.supplier_name.toLowerCase());
        if (supplierId) {
          productData.supplier_id = supplierId;
        }
      }

      await supabase.from('products').insert(productData);
    }

    toast({
      title: 'Products imported',
      description: `${data.length} products have been imported successfully.`,
    });
  };

  const handleSupplierImport = async (data: any[]) => {
    for (const supplier of data) {
      await supabase.from('suppliers').insert(supplier);
    }

    toast({
      title: 'Suppliers imported',
      description: `${data.length} suppliers have been imported successfully.`,
    });
  };

  const handleExpenseImport = async (data: any[]) => {
    const { data: suppliers } = await supabase.from('suppliers').select('id, name');
    const supplierMap = new Map(suppliers?.map(s => [s.name.toLowerCase(), s.id]));

    for (const expense of data) {
      const expenseData: any = {
        incurred_at: expense.incurred_at,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        is_cogs: expense.is_cogs
      };

      if (expense.supplier_name) {
        const supplierId = supplierMap.get(expense.supplier_name.toLowerCase());
        if (supplierId) {
          expenseData.supplier_id = supplierId;
        }
      }

      await supabase.from('expenses').insert(expenseData);
    }

    toast({
      title: 'Expenses imported',
      description: `${data.length} expenses have been imported successfully.`,
    });
  };

  const handleReplayWelcome = () => {
    localStorage.removeItem('jc_welcome_seen');
    localStorage.removeItem('jc_welcome_never_show');
    toast({
      title: 'Welcome tour reset',
      description: 'The welcome modal will appear on your next page reload.',
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleReplayQuickStart = () => {
    localStorage.removeItem('jc_quickstart_dismissed');
    toast({
      title: 'Quick start guide reset',
      description: 'Navigate to the dashboard to see the guide.',
    });
    setTimeout(() => window.location.href = '/dashboard', 1500);
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast({
        title: 'Cannot install',
        description: 'Installation is not available in this browser or the app is already installed.',
        variant: 'destructive'
      });
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast({
          title: 'App installed',
          description: 'Sourced Jewellers CRM has been installed successfully!',
        });
        setShowInstallPrompt(false);
      } else {
        toast({
          title: 'Installation cancelled',
          description: 'You can install the app later from the Settings page.',
        });
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast({
        title: 'Installation failed',
        description: 'Failed to install the app. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (userRole !== 'owner') {
    return (
      <AppLayout title="Settings">
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Settings can only be accessed by the owner account.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Settings" subtitle="Manage your account information and application preferences">
      <div className="p-4 md:p-6">
        <div className="space-y-6">

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your personal account details and role information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Image */}
              <div>
                <Label>Profile Image</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploadingAvatar}
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? 'Uploading...' : 'Upload'}
                    </Button>
                    {avatarUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingAvatar}
                        onClick={handleAvatarRemove}
                      >
                        Remove
                      </Button>
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} disabled />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={userRole === 'owner' ? 'default' : 'secondary'}>
                      {userRole}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => handleProfileUpdate('full_name', fullName)}
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Input 
                    id="bio" 
                    placeholder="Tell us about yourself"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={() => handleProfileUpdate('bio', bio)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <UserManagement />

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Your business contact details that appear on receipts and documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    placeholder="Your Store Name"
                    value={storeInfo.name}
                    onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                    onBlur={() => handleStoreInfoUpdate('name', storeInfo.name)}
                    disabled={settingsLoading || isUpdating}
                  />
                </div>
                <div>
                  <Label htmlFor="storeTagline">Tagline</Label>
                  <Input
                    id="storeTagline"
                    placeholder="Your Business Tagline"
                    value={storeInfo.tagline}
                    onChange={(e) => setStoreInfo({ ...storeInfo, tagline: e.target.value })}
                    onBlur={() => handleStoreInfoUpdate('tagline', storeInfo.tagline)}
                    disabled={settingsLoading || isUpdating}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="storeAddress">Address</Label>
                <Textarea
                  id="storeAddress"
                  placeholder="Store Address"
                  value={storeInfo.address}
                  onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                  onBlur={() => handleStoreInfoUpdate('address', storeInfo.address)}
                  disabled={settingsLoading || isUpdating}
                  rows={3}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="storePhone">Phone</Label>
                  <Input
                    id="storePhone"
                    type="tel"
                    placeholder="Phone Number"
                    value={storeInfo.phone}
                    onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                    onBlur={() => handleStoreInfoUpdate('phone', storeInfo.phone)}
                    disabled={settingsLoading || isUpdating}
                  />
                </div>
                <div>
                  <Label htmlFor="storeEmail">Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    placeholder="info@yourstore.com"
                    value={storeInfo.email}
                    onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                    onBlur={() => handleStoreInfoUpdate('email', storeInfo.email)}
                    disabled={settingsLoading || isUpdating}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Locations */}
          <LocationsSettings />

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic application preferences and currency settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="currency">Currency Symbol</Label>
                  <Select 
                    value={localSettings.currency} 
                    onValueChange={(value) => handleSettingChange('currency', value)}
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="£">£ (GBP)</SelectItem>
                      <SelectItem value="$">$ (USD)</SelectItem>
                      <SelectItem value="€">€ (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lowStock">Low Stock Threshold</Label>
                  <Input
                    id="lowStock"
                    type="number"
                    min="0"
                    value={localSettings.lowStockThreshold}
                    onChange={(e) => handleSettingChange('lowStockThreshold', parseInt(e.target.value) || 1)}
                    disabled={settingsLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={localSettings.timezone} 
                    onValueChange={(value) => handleSettingChange('timezone', value)}
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map(group => (
                        <React.Fragment key={group.label}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            {group.label}
                          </div>
                          {group.options.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Tax-Inclusive Pricing Display</Label>
                  <p className="text-sm text-muted-foreground">
                    Show prices with tax included (display only)
                  </p>
                </div>
                <Switch
                  checked={localSettings.taxInclusive}
                  onCheckedChange={(checked) => handleSettingChange('taxInclusive', checked)}
                  disabled={settingsLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>
                Stock management and inventory control preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="reorderPoint">Reorder Point Default</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    min="0"
                    value={localSettings.reorderPointDefault}
                    onChange={(e) => handleSettingChange('reorderPointDefault', parseInt(e.target.value) || 5)}
                    disabled={settingsLoading}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Default reorder threshold applied to new products
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Require Stock for Tracked Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent overselling by blocking sales when stock is insufficient
                  </p>
                </div>
                <Switch
                  checked={localSettings.requireStock}
                  onCheckedChange={(checked) => handleSettingChange('requireStock', checked)}
                  disabled={settingsLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* POS Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Point of Sale Settings</CardTitle>
              <CardDescription>
                Configure POS behavior and receipt preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="defaultPayment">Default Payment Method</Label>
                  <Select 
                    value={localSettings.defaultPayment} 
                    onValueChange={(value: 'cash' | 'card' | 'bank_transfer') => handleSettingChange('defaultPayment', value)}
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="digitalReceipt">Digital Receipt Default</Label>
                  <Select 
                    value={localSettings.digitalReceiptDefault} 
                    onValueChange={(value: 'email' | 'none') => handleSettingChange('digitalReceiptDefault', value)}
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send receipts via email when customer email is provided
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Print Receipt After Checkout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically show print dialog after successful sale
                  </p>
                </div>
                <Switch
                  checked={localSettings.printAfterCheckout}
                  onCheckedChange={(checked) => handleSettingChange('printAfterCheckout', checked)}
                  disabled={settingsLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Staff Members Management */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>
                Manage staff members for tracking who processes sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(localSettings.staffMembers || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff members added yet. Add staff members to track sales.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(localSettings.staffMembers || []).map((member, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                        {member}
                        {userRole === 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => {
                              const newStaffMembers = (localSettings.staffMembers || []).filter((_, i) => i !== index);
                              handleSettingChange('staffMembers', newStaffMembers);
                            }}
                          >
                            ×
                          </Button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {userRole === 'owner' && (
                <div className="flex gap-2">
                  <Input
                    id="newStaffMember"
                    placeholder="Enter staff member name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const name = input.value.trim();
                        if (name && !(localSettings.staffMembers || []).includes(name)) {
                          handleSettingChange('staffMembers', [...(localSettings.staffMembers || []), name]);
                          input.value = '';
                        }
                      }
                    }}
                    disabled={settingsLoading}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById('newStaffMember') as HTMLInputElement;
                      const name = input?.value.trim();
                      if (name && !(localSettings.staffMembers || []).includes(name)) {
                        handleSettingChange('staffMembers', [...(localSettings.staffMembers || []), name]);
                        input.value = '';
                      }
                    }}
                    disabled={settingsLoading}
                  >
                    Add
                  </Button>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Staff members can be selected at checkout to track who processed each sale.
              </p>
            </CardContent>
          </Card>

          {/* Quick Filters Settings */}
          <Card id="quick-filters">
            <CardHeader>
              <CardTitle>Quick Filters</CardTitle>
              <CardDescription>
                Choose which filter presets appear in the quick filters bar on the Products page. Select up to 8 presets for optimal display.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Label className="text-base font-medium">Active Presets ({localSettings.quickFilterPresets.length}/8)</Label>
                </div>
                
                <div className="grid gap-4">
                  {['Categories', 'Metals', 'Stock', 'Price'].map(category => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {availablePresets
                          .filter(preset => preset.category === category)
                          .map(preset => (
                            <div key={preset.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={preset.id}
                                checked={localSettings.quickFilterPresets.includes(preset.id)}
                                onCheckedChange={(checked) => {
                                  const newPresets = checked
                                    ? [...localSettings.quickFilterPresets, preset.id]
                                    : localSettings.quickFilterPresets.filter(id => id !== preset.id);
                                  handleSettingChange('quickFilterPresets', newPresets);
                                }}
                                disabled={settingsLoading || userRole !== 'owner'}
                              />
                              <Label
                                htmlFor={preset.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {preset.label}
                              </Label>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSettingChange('quickFilterPresets', ['watches', 'rings', 'gold', 'white-gold', 'rose-gold', 'silver', 'in-stock', 'low-stock'])}
                      disabled={settingsLoading || userRole !== 'owner'}
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSettingChange('quickFilterPresets', [])}
                      disabled={settingsLoading || userRole !== 'owner'}
                    >
                      Clear All
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Changes will be reflected immediately in the Products page quick filters bar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Import and export your business data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Section */}
              <div>
                <h4 className="font-medium mb-3">Export Data</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <CSVExportButton
                    data={[]}
                    filename="products-export"
                    headers={productCSVHeaders}
                  >
                    Export Products
                  </CSVExportButton>
                  
                  <CSVExportButton
                    data={[]}
                    filename="suppliers-export"
                    headers={supplierCSVHeaders}
                  >
                    Export Suppliers
                  </CSVExportButton>
                  
                  <CSVExportButton
                    data={[]}
                    filename="expenses-export"
                    headers={expenseCSVHeaders}
                  >
                    Export Expenses
                  </CSVExportButton>
                </div>
              </div>

              <Separator />

              {/* Import Section */}
              <div>
                <h4 className="font-medium mb-3">Import Data</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <Button
                    onClick={() => setShowProductImport(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Products
                  </Button>
                  
                  <Button
                    onClick={() => setShowSupplierImport(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Suppliers
                  </Button>
                  
                  <Button
                    onClick={() => setShowExpenseImport(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Expenses
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Import CSV files with the correct column headers. Product and expense imports will map supplier names automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PWA Installation */}
          {showInstallPrompt && (
            <Card>
              <CardHeader>
              <CardTitle>Install App</CardTitle>
                <CardDescription>
                  Install Sourced Jewellers CRM as a Progressive Web App for better performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full md:w-auto"
                  onClick={handleInstallPWA}
                  disabled={!deferredPrompt}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  {!deferredPrompt && "Your browser doesn't support PWA installation or the app is already installed."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Onboarding Section */}
          <Card id="onboarding">
            <CardHeader>
              <CardTitle>Onboarding</CardTitle>
              <CardDescription>
                Replay welcome tours and quick start guides for training new staff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Label>Welcome Tour</Label>
                  <p className="text-sm text-muted-foreground">
                    Replay the initial welcome and features overview
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReplayWelcome}
                >
                  Replay Tour
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Label>Quick Start Guide</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the step-by-step setup guide again
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReplayQuickStart}
                >
                  Replay Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CSV Import Modals */}
        <CSVImportModal
          open={showProductImport}
          onOpenChange={setShowProductImport}
          title="Import Products"
          description="Import products from a CSV file. Make sure to include all required columns."
          expectedHeaders={productCSVHeaders}
          typeCoercion={productTypeCoercion}
          onImport={handleProductImport}
        />

        <CSVImportModal
          open={showSupplierImport}
          onOpenChange={setShowSupplierImport}
          title="Import Suppliers"
          description="Import suppliers from a CSV file."
          expectedHeaders={supplierCSVHeaders}
          onImport={handleSupplierImport}
        />

        <CSVImportModal
          open={showExpenseImport}
          onOpenChange={setShowExpenseImport}
          title="Import Expenses"
          description="Import expenses from a CSV file. Supplier names will be mapped automatically."
          expectedHeaders={expenseCSVHeaders}
          typeCoercion={expenseTypeCoercion}
          onImport={handleExpenseImport}
        />
      </div>
    </AppLayout>
  );
}
