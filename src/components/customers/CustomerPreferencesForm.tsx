import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CustomerPreferences {
  shirt_size: string | null;
  pants_size: string | null;
  shoe_size: string | null;
  preferred_style: string | null;
  style_preference: string | null;
}

interface CustomerPreferencesFormProps {
  preferences: CustomerPreferences;
  onChange: (preferences: CustomerPreferences) => void;
  disabled?: boolean;
}

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '6', '8', '10', '12', '14', '16', '18', '20'];
const PANTS_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '26', '28', '30', '32', '34', '36', '38', '40', '42'];
const SHOE_SIZES = ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13'];
const PREFERRED_STYLES = ['Casual', 'Formal', 'Smart Casual', 'Streetwear', 'Bohemian', 'Minimalist', 'Classic', 'Sporty'];
const STYLE_PREFERENCES = ['Classic', 'Modern', 'Vintage', 'Minimalist', 'Bold/Statement', 'Bohemian', 'Preppy'];

export function CustomerPreferencesForm({ preferences, onChange, disabled }: CustomerPreferencesFormProps) {
  const updatePreference = (key: keyof CustomerPreferences, value: string | null) => {
    onChange({ ...preferences, [key]: value === 'none' ? null : value });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="shirt_size">Shirt/Top Size</Label>
        <Select
          value={preferences.shirt_size || 'none'}
          onValueChange={(value) => updatePreference('shirt_size', value)}
          disabled={disabled}
        >
          <SelectTrigger id="shirt_size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {SHIRT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pants_size">Pants/Bottom Size</Label>
        <Select
          value={preferences.pants_size || 'none'}
          onValueChange={(value) => updatePreference('pants_size', value)}
          disabled={disabled}
        >
          <SelectTrigger id="pants_size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {PANTS_SIZES.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shoe_size">Shoe Size</Label>
        <Select
          value={preferences.shoe_size || 'none'}
          onValueChange={(value) => updatePreference('shoe_size', value)}
          disabled={disabled}
        >
          <SelectTrigger id="shoe_size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {SHOE_SIZES.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferred_style">Preferred Style</Label>
        <Select
          value={preferences.preferred_style || 'none'}
          onValueChange={(value) => updatePreference('preferred_style', value)}
          disabled={disabled}
        >
          <SelectTrigger id="preferred_style">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {PREFERRED_STYLES.map((style) => (
              <SelectItem key={style} value={style}>{style}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="style_preference">Fashion Preference</Label>
        <Select
          value={preferences.style_preference || 'none'}
          onValueChange={(value) => updatePreference('style_preference', value)}
          disabled={disabled}
        >
          <SelectTrigger id="style_preference">
            <SelectValue placeholder="Select preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {STYLE_PREFERENCES.map((style) => (
              <SelectItem key={style} value={style}>{style}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
