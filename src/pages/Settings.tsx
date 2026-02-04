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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Building, ShoppingCart, Download, Upload, Smartphone, Sparkles, Filter, Clock, Package, Store, Plus, Pencil, Trash2, Watch, CircleDot, Gem, Star, Heart, Crown, Diamond, Zap, Tag, Percent, Users, ExternalLink, KeyRound, Shield, MapPin, Database, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings, CustomFilter } from '@/contexts/SettingsContext';
import { CustomFilterDialog } from '@/components/settings/CustomFilterDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { CSVExportButton } from '@/components/csv/CSVExportButton';
import { CSVImportModal } from '@/components/csv/CSVImportModal';
import { UserManagement } from '@/components/settings/UserManagement';
import { LocationsSettings } from '@/components/settings/LocationsSettings';
import { RolePermissionsManager } from '@/components/settings/RolePermissionsManager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { productCSVHeaders, supplierCSVHeaders, expenseCSVHeaders, productTypeCoercion, expenseTypeCoercion } from '@/utils/csvUtils';
import { CommissionSettingsModal } from '@/components/reports/CommissionSettingsModal';
import { useStaffCommissionOverrides } from '@/hooks/useStaffCommissionOverrides';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { SupplierTagsCard } from '@/components/settings/SupplierTagsCard';
import { BrandManagement } from '@/components/settings/BrandManagement';

// Section header component for consistent styling
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}

function SettingsSection({ title, description, children, id }: SettingsSectionProps) {
  return (
    <section id={id} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-luxury tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </section>
  );
}

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
  
  // Custom filter dialog state
  const [showCustomFilterDialog, setShowCustomFilterDialog] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFilter | undefined>(undefined);
  
  // Commission modal state
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { data: commissionOverrides = [] } = useStaffCommissionOverrides();
  
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
    // Categories (clothing/accessories)
    { id: 'bags', label: 'Bags', category: 'Categories' },
    { id: 'shoes', label: 'Shoes', category: 'Categories' },
    { id: 'dresses', label: 'Dresses', category: 'Categories' },
    { id: 'coats', label: 'Coats & Jackets', category: 'Categories' },
    { id: 'tops', label: 'Tops', category: 'Categories' },
    { id: 'accessories', label: 'Accessories', category: 'Categories' },
    // Materials
    { id: 'leather', label: 'Leather', category: 'Materials' },
    { id: 'silk', label: 'Silk', category: 'Materials' },
    { id: 'cashmere', label: 'Cashmere', category: 'Materials' },
    { id: 'cotton', label: 'Cotton', category: 'Materials' },
    { id: 'wool', label: 'Wool', category: 'Materials' },
    // Condition
    { id: 'new-with-tags', label: 'New with Tags', category: 'Condition' },
    { id: 'excellent', label: 'Excellent', category: 'Condition' },
    { id: 'very-good', label: 'Very Good', category: 'Condition' },
    // Brand Tier
    { id: 'luxury', label: 'Luxury', category: 'Brand Tier' },
    { id: 'premium', label: 'Premium', category: 'Brand Tier' },
    // Stock
    { id: 'in-stock', label: 'In Stock', category: 'Stock' },
    { id: 'low-stock', label: 'Low Stock', category: 'Stock' },
    { id: 'out-of-stock', label: 'Out of Stock', category: 'Stock' },
    // Price
    { id: 'under-500', label: '< £500', category: 'Price' },
    { id: '500-1k', label: '£500–£1k', category: 'Price' },
    { id: '1k-5k', label: '£1k–£5k', category: 'Price' },
    { id: 'over-5k', label: '> £5k', category: 'Price' },
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

  // Get active tab from URL parameter
  const getActiveTab = () => {
    const section = searchParams.get('section');
    const validTabs = ['account', 'team', 'business', 'application', 'sales', 'customize', 'data'];
    if (section && validTabs.includes(section)) {
      return section;
    }
    return 'account';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTab());
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
        material: product.material,
        size: product.size,
        color: product.color,
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
    localStorage.removeItem('sc_welcome_seen');
    localStorage.removeItem('sc_welcome_never_show');
    toast({
      title: 'Welcome tour reset',
      description: 'The welcome modal will appear on your next page reload.',
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleReplayQuickStart = () => {
    localStorage.removeItem('sc_quickstart_dismissed');
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
          description: 'Sourced Clothing CRM has been installed successfully!',
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
    <AppLayout title="Settings" subtitle="Manage your account, team, and application preferences">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1.5 mb-6 bg-muted/50">
              <TabsTrigger value="account" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Business</span>
              </TabsTrigger>
              <TabsTrigger value="application" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">App</span>
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Sales</span>
              </TabsTrigger>
              <TabsTrigger value="customize" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Customise</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2 flex-1 min-w-[70px] px-3 py-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 1: ACCOUNT & SECURITY
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="account" className="mt-0">
              <SettingsSection 
                title="Account & Security" 
                description="Your personal account details and security settings"
              >
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Profile Image & Basic Info */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="h-24 w-24 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <User className="h-12 w-12 text-muted-foreground" />
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

                  {/* Profile Fields */}
                  <div className="flex-1 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email} disabled className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <div className="flex items-center gap-2 mt-2.5">
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
                          className="mt-1.5"
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
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Password Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Label>Password</Label>
                    <p className="text-sm text-muted-foreground">
                      Update your account password for security.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPasswordModal(true)}
                    className="gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SettingsSection>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 2: TEAM & PERMISSIONS
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="team" className="mt-0">
              <SettingsSection 
                title="Team & Permissions" 
                description="Manage users and control what each role can access"
              >
                <UserManagement />
                <RolePermissionsManager />
              </SettingsSection>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 3: BUSINESS INFORMATION
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="business" className="mt-0">
              <SettingsSection 
                title="Business Information" 
                description="Your store details, locations, and contact information"
              >
            {/* Store Information */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Store Details
                </CardTitle>
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
                      className="mt-1.5"
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
                      className="mt-1.5"
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
                    className="mt-1.5"
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
                      className="mt-1.5"
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
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Locations */}
            <LocationsSettings />
          </SettingsSection>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 4: APPLICATION SETTINGS
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="application" className="mt-0">
              <SettingsSection 
                title="Application Settings" 
                description="General preferences, inventory, and POS configuration"
              >
            {/* General Settings */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">General</CardTitle>
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
                      <SelectTrigger className="mt-1.5">
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
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={localSettings.timezone} 
                      onValueChange={(value) => handleSettingChange('timezone', value)}
                      disabled={settingsLoading}
                    >
                      <SelectTrigger className="mt-1.5">
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
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30">
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
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Inventory
                </CardTitle>
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
                      className="mt-1.5"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Default reorder threshold applied to new products
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30">
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
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Point of Sale
                </CardTitle>
                <CardDescription>
                  Configure checkout defaults, payment methods, and receipt settings.
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
                      <SelectTrigger className="mt-1.5">
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
                      <SelectTrigger className="mt-1.5">
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30">
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
          </SettingsSection>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 5: CUSTOMER & SALES
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="sales" className="mt-0">
              <SettingsSection 
                title="Customer & Sales" 
                description="VIP tiers, commission rates, and sales tracking"
              >
            {/* Customer VIP Tiers */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Customer VIP Tiers
                </CardTitle>
                <CardDescription>
                  Set the lifetime spending thresholds that determine customer loyalty tiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="silverThreshold" className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Silver
                      </Badge>
                      Threshold
                    </Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {localSettings.currency}
                      </span>
                      <Input
                        id="silverThreshold"
                        type="number"
                        min="0"
                        className="pl-7"
                        value={localSettings.vipTierThresholds?.silver ?? 500}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleSettingChange('vipTierThresholds', {
                            ...localSettings.vipTierThresholds,
                            silver: value,
                          });
                        }}
                        disabled={settingsLoading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="goldThreshold" className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Gold
                      </Badge>
                      Threshold
                    </Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {localSettings.currency}
                      </span>
                      <Input
                        id="goldThreshold"
                        type="number"
                        min="0"
                        className="pl-7"
                        value={localSettings.vipTierThresholds?.gold ?? 2000}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleSettingChange('vipTierThresholds', {
                            ...localSettings.vipTierThresholds,
                            gold: value,
                          });
                        }}
                        disabled={settingsLoading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="platinumThreshold" className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        Platinum
                      </Badge>
                      Threshold
                    </Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {localSettings.currency}
                      </span>
                      <Input
                        id="platinumThreshold"
                        type="number"
                        min="0"
                        className="pl-7"
                        value={localSettings.vipTierThresholds?.platinum ?? 10000}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleSettingChange('vipTierThresholds', {
                            ...localSettings.vipTierThresholds,
                            platinum: value,
                          });
                        }}
                        disabled={settingsLoading}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Customers are automatically upgraded when their lifetime spend reaches these thresholds.
                </p>
              </CardContent>
            </Card>

            {/* Commission Settings */}
            <Card id="commission-settings">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Commission Settings
                </CardTitle>
                <CardDescription>
                  Configure staff commission rates for sales tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label>Enable Commission Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Show estimated commission on the My Sales page
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.commissionSettings?.enabled ?? true}
                    onCheckedChange={(checked) => handleSettingChange('commissionSettings', {
                      ...localSettings.commissionSettings,
                      enabled: checked
                    })}
                    disabled={settingsLoading}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="commissionRate">Default Commission Rate</Label>
                    <div className="relative mt-2">
                      <Input
                        id="commissionRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        className="pr-8"
                        value={localSettings.commissionSettings?.defaultRate ?? 5}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleSettingChange('commissionSettings', {
                            ...localSettings.commissionSettings,
                            defaultRate: Math.min(100, Math.max(0, value))
                          });
                        }}
                        disabled={settingsLoading}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Percentage of revenue paid as commission
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="calculationBasis">Calculation Basis</Label>
                    <Select 
                      value={localSettings.commissionSettings?.calculationBasis ?? 'revenue'} 
                      onValueChange={(value: 'revenue' | 'profit') => handleSettingChange('commissionSettings', {
                        ...localSettings.commissionSettings,
                        calculationBasis: value
                      })}
                      disabled={settingsLoading}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue (Sale Total)</SelectItem>
                        <SelectItem value="profit">Profit (Revenue - Cost)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calculate commission on revenue or gross profit
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Example Calculation</h4>
                  <p className="text-sm text-muted-foreground">
                    A £1,000 sale at {localSettings.commissionSettings?.defaultRate ?? 5}% rate = <span className="font-mono font-medium text-green-600 dark:text-green-400">£{((localSettings.commissionSettings?.defaultRate ?? 5) * 10).toFixed(2)}</span> commission
                  </p>
                </div>

                <Separator />

                {/* Staff Commission Overrides Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-medium">Per-Staff Commission Rates</h4>
                      <p className="text-sm text-muted-foreground">
                        Set custom commission rates for individual staff members
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCommissionModal(true)}
                      disabled={userRole !== 'owner'}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Staff Rates
                    </Button>
                  </div>

                  {commissionOverrides.length > 0 ? (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">{commissionOverrides.length}</span> staff member(s) have custom commission rates
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      All staff members are using the global default rate
                    </p>
                  )}
                </div>

                <Separator />

                {/* Quick Link to Commission Report */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-medium">View Commission Report</h4>
                    <p className="text-sm text-muted-foreground">
                      See commission breakdown and record payments
                    </p>
                  </div>
                  <Button variant="ghost" asChild>
                    <a href="/reports?tab=commission">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Go to Report
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SettingsSection>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 6: CUSTOMISATION
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="customize" className="mt-0">
              <SettingsSection 
                title="Customisation" 
                description="Quick filters and interface preferences"
              >
            {/* Quick Filters Settings */}
            <Card id="quick-filters">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Filters</CardTitle>
                <CardDescription>
                  Choose which filter presets appear in the quick filters bar on the Products page, or create your own custom filters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Built-in Presets */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Label className="text-base font-medium">Built-in Presets ({localSettings.quickFilterPresets.length}/8)</Label>
                  </div>
                  
                  <div className="grid gap-4">
                    {['Categories', 'Materials', 'Condition', 'Brand Tier', 'Stock', 'Price'].map(category => (
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
                        onClick={() => handleSettingChange('quickFilterPresets', ['bags', 'shoes', 'dresses', 'leather', 'new-with-tags', 'excellent', 'luxury', 'in-stock'])}
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
                  </div>
                </div>

                <Separator />

                {/* Custom Filters Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label className="text-base font-medium">Custom Filters ({(localSettings.customFilters || []).length})</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your own filter shortcuts with custom criteria
                      </p>
                    </div>
                    {userRole === 'owner' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingFilter(undefined);
                          setShowCustomFilterDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Filter
                      </Button>
                    )}
                  </div>

                  {(localSettings.customFilters || []).length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/30">
                      <Filter className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No custom filters yet. Create one to quickly filter products.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(localSettings.customFilters || []).map((filter) => {
                        const getFilterSummary = (f: CustomFilter) => {
                          const parts: string[] = [];
                          if (f.filters.categories?.length) parts.push(`${f.filters.categories.length} categories`);
                          if (f.filters.materials?.length) parts.push(`${f.filters.materials.length} materials`);
                          if (f.filters.stockLevel && f.filters.stockLevel !== 'all') parts.push('stock filter');
                          if (f.filters.priceRange) parts.push('price range');
                          if (f.filters.isTradeIn === 'trade_in_only') parts.push('part exchange');
                          return parts.join(', ') || 'No criteria';
                        };

                        const IconMap: Record<string, React.ElementType> = {
                          filter: Filter,
                          tag: Tag,
                          watch: Watch,
                          bag: CircleDot,
                          gem: Gem,
                          star: Star,
                          sparkles: Sparkles,
                          heart: Heart,
                          crown: Crown,
                          diamond: Diamond,
                          zap: Zap,
                        };
                        const FilterIcon = IconMap[filter.icon || 'filter'] || Filter;

                        return (
                          <div
                            key={filter.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                                <FilterIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{filter.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {getFilterSummary(filter)}
                                </p>
                              </div>
                            </div>
                            {userRole === 'owner' && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingFilter(filter);
                                    setShowCustomFilterDialog(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    const newFilters = (localSettings.customFilters || []).filter(
                                      (f) => f.id !== filter.id
                                    );
                                    handleSettingChange('customFilters', newFilters);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Changes will be reflected immediately in the Products page quick filters bar.
                </p>
              </CardContent>
            </Card>

            {/* Brand Management */}
            <BrandManagement userRole={userRole} />

            {/* Supplier Tags Settings */}
            <SupplierTagsCard userRole={userRole} />
          </SettingsSection>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 7: DATA & SYSTEM
            ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="data" className="mt-0">
              <SettingsSection 
                title="Data & System" 
                description="Import, export, and system utilities"
              >
            {/* Data Management */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Data Management</CardTitle>
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
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Install App
                  </CardTitle>
                  <CardDescription>
                    Install Sourced Clothing CRM as a Progressive Web App for better performance.
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
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Onboarding
                </CardTitle>
                <CardDescription>
                  Replay welcome tours and quick start guides for training new staff
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30">
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
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30">
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
          </SettingsSection>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals (outside Tabs) */}
        <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
        
        <CommissionSettingsModal 
          open={showCommissionModal} 
          onClose={() => setShowCommissionModal(false)} 
        />
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

        {/* Custom Filter Dialog */}
        <CustomFilterDialog
          open={showCustomFilterDialog}
          onOpenChange={setShowCustomFilterDialog}
          filter={editingFilter}
          onSave={(filter) => {
            const existingFilters = localSettings.customFilters || [];
            const isEditing = existingFilters.some((f) => f.id === filter.id);
            
            const newFilters = isEditing
              ? existingFilters.map((f) => (f.id === filter.id ? filter : f))
              : [...existingFilters, filter];
            
            handleSettingChange('customFilters', newFilters);
            toast({
              title: isEditing ? 'Filter updated' : 'Filter created',
              description: `"${filter.name}" has been ${isEditing ? 'updated' : 'added'}.`,
            });
          }}
        />
      </div>
    </AppLayout>
  );
}
