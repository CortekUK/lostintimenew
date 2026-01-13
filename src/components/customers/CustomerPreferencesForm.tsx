import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CustomerPreferences {
  ring_size: string | null;
  bracelet_size: string | null;
  necklace_length: string | null;
  metal_preference: string | null;
  style_preference: string | null;
}

interface CustomerPreferencesFormProps {
  preferences: CustomerPreferences;
  onChange: (preferences: CustomerPreferences) => void;
  disabled?: boolean;
}

const RING_SIZES = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const BRACELET_SIZES = ['Small (6.5")', 'Medium (7")', 'Large (7.5")', 'XL (8")', 'XXL (8.5")'];
const NECKLACE_LENGTHS = ['14"', '16"', '18"', '20"', '22"', '24"', '30"'];
const METAL_PREFERENCES = ['Yellow Gold', 'White Gold', 'Rose Gold', 'Platinum', 'Silver', 'Mixed Metals'];
const STYLE_PREFERENCES = ['Classic', 'Modern', 'Vintage', 'Minimalist', 'Bold/Statement', 'Bohemian', 'Art Deco'];

export function CustomerPreferencesForm({ preferences, onChange, disabled }: CustomerPreferencesFormProps) {
  const updatePreference = (key: keyof CustomerPreferences, value: string | null) => {
    onChange({ ...preferences, [key]: value || null });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="ring_size">Ring Size</Label>
        <Select
          value={preferences.ring_size || ''}
          onValueChange={(value) => updatePreference('ring_size', value)}
          disabled={disabled}
        >
          <SelectTrigger id="ring_size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not specified</SelectItem>
            {RING_SIZES.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bracelet_size">Bracelet Size</Label>
        <Select
          value={preferences.bracelet_size || ''}
          onValueChange={(value) => updatePreference('bracelet_size', value)}
          disabled={disabled}
        >
          <SelectTrigger id="bracelet_size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not specified</SelectItem>
            {BRACELET_SIZES.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="necklace_length">Necklace Length</Label>
        <Select
          value={preferences.necklace_length || ''}
          onValueChange={(value) => updatePreference('necklace_length', value)}
          disabled={disabled}
        >
          <SelectTrigger id="necklace_length">
            <SelectValue placeholder="Select length" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not specified</SelectItem>
            {NECKLACE_LENGTHS.map((length) => (
              <SelectItem key={length} value={length}>{length}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metal_preference">Metal Preference</Label>
        <Select
          value={preferences.metal_preference || ''}
          onValueChange={(value) => updatePreference('metal_preference', value)}
          disabled={disabled}
        >
          <SelectTrigger id="metal_preference">
            <SelectValue placeholder="Select metal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not specified</SelectItem>
            {METAL_PREFERENCES.map((metal) => (
              <SelectItem key={metal} value={metal}>{metal}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="style_preference">Style Preference</Label>
        <Select
          value={preferences.style_preference || ''}
          onValueChange={(value) => updatePreference('style_preference', value)}
          disabled={disabled}
        >
          <SelectTrigger id="style_preference">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not specified</SelectItem>
            {STYLE_PREFERENCES.map((style) => (
              <SelectItem key={style} value={style}>{style}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
