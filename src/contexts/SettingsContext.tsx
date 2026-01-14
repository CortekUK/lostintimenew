import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface CustomFilter {
  id: string;
  name: string;
  icon?: string;
  filters: {
    categories?: string[];
    metals?: string[];
    karats?: string[];
    gemstones?: string[];
    stockLevel?: 'all' | 'in' | 'risk' | 'out';
    priceRange?: { min: number; max: number };
    isTradeIn?: 'all' | 'trade_in_only' | 'non_trade_in';
  };
}

export interface VIPTierThresholds {
  silver: number;
  gold: number;
  platinum: number;
}

export interface CommissionSettings {
  defaultRate: number;
  calculationBasis: 'revenue' | 'profit';
  enabled: boolean;
}

export interface AppSettings {
  currency: string;
  taxInclusive: boolean;
  lowStockThreshold: number;
  requireStock: boolean;
  defaultPayment: 'cash' | 'card' | 'bank_transfer';
  printAfterCheckout: boolean;
  timezone: string;
  reorderPointDefault: number;
  digitalReceiptDefault: 'email' | 'none';
  quickFilterPresets: string[];
  customFilters: CustomFilter[];
  vipTierThresholds: VIPTierThresholds;
  commissionSettings: CommissionSettings;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const defaultSettings: AppSettings = {
  currency: '£',
  taxInclusive: false,
  lowStockThreshold: 1,
  requireStock: true,
  defaultPayment: 'cash',
  printAfterCheckout: false,
  timezone: 'Europe/London',
  reorderPointDefault: 5,
  digitalReceiptDefault: 'none',
  quickFilterPresets: ['watches', 'rings', 'gold', 'white-gold', 'rose-gold', 'silver', 'in-stock', 'low-stock'],
  customFilters: [],
  vipTierThresholds: {
    silver: 500,
    gold: 2000,
    platinum: 5000,
  },
  commissionSettings: {
    defaultRate: 5,
    calculationBasis: 'revenue',
    enabled: true,
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('values')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.values) {
        const savedSettings = typeof data.values === 'object' ? data.values : {};
        setSettings({ ...defaultSettings, ...savedSettings });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (userRole !== 'owner') {
      throw new Error('Only owners can update settings');
    }

    try {
      const newSettings = { ...settings, ...updates };
      
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 1,
          values: JSON.parse(JSON.stringify(newSettings)),
          updated_at: new Date().toISOString()
        } as any);

      if (error) throw error;

      setSettings(newSettings);
      setError(null);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings');
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}