import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';
import { useDuplicateProduct, DuplicateProductOptions } from '@/hooks/useDuplicateProduct';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { ProductWithStock } from '@/types';

interface DuplicateProductModalProps {
  product: ProductWithStock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newProduct: any, action: 'stay' | 'open') => void;
}

export function DuplicateProductModal({ product, open, onOpenChange, onSuccess }: DuplicateProductModalProps) {
  const { data: suppliers } = useSuppliers();
  const duplicateMutation = useDuplicateProduct();

  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [barcode, setBarcode] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseToday, setPurchaseToday] = useState(true);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [manualSku, setManualSku] = useState('');

  const [copyImages, setCopyImages] = useState(true);
  const [copyDescription, setCopyDescription] = useState(true);
  const [copyDocuments, setCopyDocuments] = useState(true);
  const [copyRegistrationDocs, setCopyRegistrationDocs] = useState(false);
  const [copyConsignment, setCopyConsignment] = useState(false);
  const [copyPartExchange, setCopyPartExchange] = useState(false);

  const [afterAction, setAfterAction] = useState<'stay' | 'open'>('stay');

  // Initialize form when product changes
  useEffect(() => {
    if (product && open) {
      setName(`${product.name} (copy)`);
      setUnitPrice(product.unit_price?.toString() || '');
      setUnitCost(product.unit_cost?.toString() || '');
      setSupplierId(product.supplier_id?.toString() || '');
      setQuantity('1');
      setBarcode('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseToday(true);
      setAutoGenerateSku(true);
      setManualSku('');
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const options: DuplicateProductOptions = {
      sourceProductId: product.id,
      newData: {
        name,
        unit_price: parseFloat(unitPrice),
        unit_cost: parseFloat(unitCost),
        supplier_id: supplierId ? parseInt(supplierId) : undefined,
        quantity: parseInt(quantity),
        barcode: barcode || undefined,
        purchase_date: purchaseToday ? new Date().toISOString().split('T')[0] : purchaseDate,
        auto_generate_sku: autoGenerateSku,
        internal_sku: !autoGenerateSku ? manualSku : undefined,
      },
      copyOptions: {
        images: copyImages,
        description: copyDescription,
        documents: copyDocuments,
        registration_docs: copyRegistrationDocs,
        consignment: copyConsignment,
        part_exchange: copyPartExchange,
      },
      afterAction,
    };

    duplicateMutation.mutate(options, {
      onSuccess: (newProduct) => {
        onOpenChange(false);
        onSuccess?.(newProduct, afterAction);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Duplicate Product
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Sell Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01" min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_cost">Cost Price *</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01" min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Serial Number</Label>
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Leave blank or enter new serial"
              />
              <p className="text-xs text-muted-foreground">
                Serial numbers must be unique
              </p>
            </div>

            {/* Purchase Date */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Purchase Date</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="purchase-today"
                    checked={purchaseToday}
                    onCheckedChange={setPurchaseToday}
                  />
                  <Label htmlFor="purchase-today" className="text-sm font-normal cursor-pointer">
                    Purchased today
                  </Label>
                </div>
              </div>
              {!purchaseToday && (
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              )}
            </div>
          </div>

          <Separator />

          {/* SKU Generation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-generate SKU</Label>
                <p className="text-sm text-muted-foreground">Automatically assign a unique internal SKU</p>
              </div>
              <Switch
                checked={autoGenerateSku}
                onCheckedChange={setAutoGenerateSku}
              />
            </div>

            {autoGenerateSku ? (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Internal SKU will be: <span className="font-medium text-primary">00XXX (auto-generated)</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="manual-sku">Manual SKU *</Label>
                <Input
                  id="manual-sku"
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  placeholder="Enter unique SKU"
                  required={!autoGenerateSku}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Copy Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Copy Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-images"
                  checked={copyImages}
                  onCheckedChange={(checked) => setCopyImages(checked as boolean)}
                />
                <label htmlFor="copy-images" className="text-sm cursor-pointer">
                  Images
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-description"
                  checked={copyDescription}
                  onCheckedChange={(checked) => setCopyDescription(checked as boolean)}
                />
                <label htmlFor="copy-description" className="text-sm cursor-pointer">
                  Description/Notes
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-documents"
                  checked={copyDocuments}
                  onCheckedChange={(checked) => setCopyDocuments(checked as boolean)}
                />
                <label htmlFor="copy-documents" className="text-sm cursor-pointer">
                  Documents
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-registration"
                  checked={copyRegistrationDocs}
                  onCheckedChange={(checked) => setCopyRegistrationDocs(checked as boolean)}
                />
                <label htmlFor="copy-registration" className="text-sm cursor-pointer">
                  Registration Documents
                </label>
              </div>

              {product?.is_consignment && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="copy-consignment"
                      checked={copyConsignment}
                      onCheckedChange={(checked) => setCopyConsignment(checked as boolean)}
                    />
                    <label htmlFor="copy-consignment" className="text-sm cursor-pointer">
                      Consignment Details
                    </label>
                  </div>
                  {copyConsignment && (
                    <div className="ml-6 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-400">
                          Dates and settlements will be reset
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {product?.is_trade_in && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="copy-px"
                      checked={copyPartExchange}
                      onCheckedChange={(checked) => setCopyPartExchange(checked as boolean)}
                    />
                    <label htmlFor="copy-px" className="text-sm cursor-pointer">
                      Part Exchange Info
                    </label>
                  </div>
                  {copyPartExchange && (
                    <div className="ml-6 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-400">
                          Customer information will not be copied
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* After-create options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">After creating</Label>
            <RadioGroup value={afterAction} onValueChange={(value: 'stay' | 'open') => setAfterAction(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stay" id="stay" />
                <label htmlFor="stay" className="text-sm cursor-pointer">
                  Stay on Products page (highlight new card)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="open" />
                <label htmlFor="open" className="text-sm cursor-pointer">
                  Open new product detail modal
                </label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={duplicateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={duplicateMutation.isPending}>
              {duplicateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
