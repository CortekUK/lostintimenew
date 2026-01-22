import { useEffect, useRef, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTransactionDetails } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from 'next-themes';
import { Printer, Mail, X, AlertCircle, Eye, Ban, Edit, Coins, Repeat, MapPin, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { QuickSettlementModal } from '@/components/consignments/QuickSettlementModal';
import { ConsignmentBadge } from '@/components/ui/consignment-badge';
import { TradeInBadge } from '@/components/ui/trade-in-badge';
import { buildReceiptHtml } from '@/utils/receiptHtmlBuilder';
import { printHtml } from '@/utils/printUtils';
import { EmailService } from '@/components/integrations/EmailService';
import { VoidSaleModal } from './VoidSaleModal';
import { EditSaleModal } from './EditSaleModal';
import { EditSaleCommissionModal } from '@/components/reports/EditSaleCommissionModal';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { useStaffCommissionOverride } from '@/hooks/useStaffCommissionOverrides';
import { AddPartExchangeToSaleModal } from './AddPartExchangeToSaleModal';
import { ProductDetailModal } from '@/components/modals/ProductDetailModal';

interface SaleDetailModalProps {
  saleId: number | null;
  open: boolean;
  onClose: () => void;
  focusLineItemId?: number;
}

export function SaleDetailModal({ saleId, open, onClose, focusLineItemId }: SaleDetailModalProps) {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const { canEdit, canDelete, isAtLeast } = usePermissions();
  const canEditSales = canEdit(CRM_MODULES.SALES);
  const canVoidSales = canDelete(CRM_MODULES.SALES);
  const { data, isLoading, error, refetch } = useTransactionDetails(saleId || undefined);
  const focusedItemRef = useRef<HTMLDivElement>(null);
  const [settlementModalOpen, setSettlementModalOpen] = useState<boolean>(false);
  const [selectedConsignment, setSelectedConsignment] = useState<any>(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [addPxModalOpen, setAddPxModalOpen] = useState(false);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setProductDetailOpen(true);
  };

  const items = data?.items || [];
  const partExchanges = data?.partExchanges || [];
  const settlements = data?.settlements || [];
  const sale = data?.sale;
  const staffId = sale?.staff_id;
  
  // Get staff override for commission calculation
  const { data: staffOverride } = useStaffCommissionOverride(staffId);
  
  // Calculate commission
  const commissionDetails = useMemo(() => {
    if (!sale || !settings.commissionSettings?.enabled) {
      return { calculated: 0, hasOverride: false, current: 0, reason: null };
    }
    
    const rate = staffOverride?.commission_rate ?? settings.commissionSettings?.defaultRate ?? 5;
    const basis = staffOverride?.commission_basis ?? settings.commissionSettings?.calculationBasis ?? 'revenue';
    
    // Calculate based on items
    const totalRevenue = items.reduce((sum, item) => {
      return sum + ((item.quantity * item.unit_price) - item.discount);
    }, 0);
    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const totalProfit = totalRevenue - totalCost;
    
    const calculated = basis === 'profit' 
      ? totalProfit * (rate / 100)
      : totalRevenue * (rate / 100);
    
    const hasOverride = (sale as any).commission_override !== null && (sale as any).commission_override !== undefined;
    const current = hasOverride ? Number((sale as any).commission_override) : calculated;
    
    return {
      calculated,
      hasOverride,
      current,
      reason: (sale as any).commission_override_reason,
    };
  }, [sale, items, settings.commissionSettings, staffOverride]);
  
  // Auto-scroll and highlight focused item
  useEffect(() => {
    if (focusLineItemId && focusedItemRef.current && open) {
      setTimeout(() => {
        focusedItemRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 200);
    }
  }, [focusLineItemId, open]);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleEmail();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open]);
  
  // Memoized calculations
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const lineRevenue = (item.quantity * item.unit_price) - item.discount;
      const lineCOGS = item.quantity * item.unit_cost;
      const lineGP = lineRevenue - lineCOGS;
      const marginPercent = lineRevenue > 0 ? (lineGP / lineRevenue) * 100 : 0;
      
      return {
        ...item,
        lineRevenue,
        lineCOGS,
        lineGP,
        marginPercent
      };
    });
  }, [items]);

  const handlePrint = async () => {
    if (!sale || !data) {
      toast({
        title: "Cannot print",
        description: "Receipt data is not available",
        variant: "destructive"
      });
      return;
    }

    try {
      const pxTotal = partExchanges?.reduce((sum, px) => sum + Number(px.allowance || 0), 0) || 0;
      
      const html = buildReceiptHtml(
        {
          sale: sale,
          saleItems: items,
          partExchanges: partExchanges || [],
          pxTotal: pxTotal,
          staff: sale.profiles
        },
        settings,
        theme === 'dark'
      );
      
      await printHtml(html);
      
      toast({
        title: "Printing receipt",
        description: "Print dialog opened"
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: "Failed to print receipt. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEmail = () => {
    if (!sale || !data) return;
    
    EmailService.sendReceipt({
      saleId: saleId?.toString() || '',
      customerName: (sale as any).customer_name || sale.customer_email,
      items: items,
      total: sale.total,
      soldAt: sale.sold_at,
      paymentMethod: sale.payment,
      notes: sale.notes
    });
  };

  const handleRecordSettlement = (item: any) => {
    if (!item.products?.consignment_supplier) return;
    
    setSelectedConsignment({
      productId: item.product_id,
      productName: item.products.name,
      supplierId: item.products.consignment_supplier_id,
      supplierName: item.products.consignment_supplier.name,
      salePrice: item.lineRevenue,
      agreedPrice: null
    });
    setSettlementModalOpen(true);
  };
  
  
  const handleOpenSoldItem = () => {
    if (focusLineItemId) {
      window.open(`/sales/items?sale=${saleId}&item=${focusLineItemId}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-luxury">Loading Transaction Details...</DialogTitle>
          </DialogHeader>
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data || !sale) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sale Not Found</DialogTitle>
            <DialogDescription>Unable to load sale details</DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-luxury flex items-center gap-3">
              Sale #{saleId}
              {sale.is_voided && (
                <Badge variant="destructive" className="text-sm">
                  <Ban className="h-3 w-3 mr-1" />
                  VOIDED
                </Badge>
              )}
              {sale.edited_at && !sale.is_voided && (
                <Badge variant="secondary" className="text-sm">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <span>{format(new Date(sale.sold_at), 'PPpp')}</span>
              <span>•</span>
              <Badge variant="outline" className="capitalize">{sale.payment}</Badge>
            </div>
            {sale.is_voided && sale.void_reason && (
              <Alert className="mt-3 border-destructive/50 bg-destructive/10">
                <Ban className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>Voided:</strong> {sale.void_reason}
                  {sale.voided_at && (
                    <span className="ml-2 text-muted-foreground">
                      on {format(new Date(sale.voided_at), 'PPp')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {((sale as any).customer_name || sale.customer_email) && (
              <div className="text-sm mt-2 space-y-1">
                {(sale as any).customer_name && (
                  <div className="font-medium text-foreground">
                    Customer: {(sale as any).customer_name}
                  </div>
                )}
                {sale.customer_email && (
                  <div className="text-muted-foreground">
                    {sale.customer_email}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-normal">
                <User className="h-3 w-3" />
                {(sale as any).staff_member_name || sale.profiles?.full_name || 'Unknown'}
              </Badge>
              {(sale as any).locations?.name && (
                <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-normal">
                  <MapPin className="h-3 w-3" />
                  {(sale as any).locations.name}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Consignment Alert */}
            {userRole === 'owner' && items.some(item => {
              const isConsignment = item.products?.is_consignment;
              const isSettled = settlements.some(s => s.product_id === item.product_id);
              return isConsignment && !isSettled;
            }) && (
              <Alert className="border-warning/50 bg-warning/10" role="alert" aria-live="polite">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  This sale contains unsettled consignment items. Record supplier payouts below.
                </AlertDescription>
              </Alert>
            )}

            {/* Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">Items Sold</h3>
              {calculatedItems.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-sm">No line items were recorded for this sale.</p>
                  {sale.notes?.includes('Converted from Deposit Order') && (
                    <p className="text-xs mt-1 text-muted-foreground/70">
                      This can happen for older deposit-order conversions.
                    </p>
                  )}
                </div>
              ) : calculatedItems.map((item) => {
                const product = item.products;
                const isCustomOrder = (item as any).is_custom_order;
                const displayName = product?.name || (item as any).product_name || 'Unknown Product';
                
                // Skip only if no product AND no product_name (truly empty item)
                if (!product && !displayName) return null;
                
                const isFocused = focusLineItemId === item.id;
                const isConsignment = product?.is_consignment;
                const isSettled = settlements.some(s => s.product_id === item.product_id);
                
                // Find serial number from part exchanges
                const serial = partExchanges.find(px => px.product_id === item.product_id)?.serial;
                
                // Color code margin
                let marginColor = 'text-muted-foreground';
                if (item.marginPercent >= 20) marginColor = 'text-success';
                else if (item.marginPercent >= 10) marginColor = 'text-warning';
                else marginColor = 'text-destructive';
                
                return (
                  <div 
                    key={item.id}
                    ref={isFocused ? focusedItemRef : null}
                    className={`flex items-start justify-between gap-4 p-3 rounded-lg transition-all duration-200 ${
                      isFocused 
                        ? 'bg-primary/10 border-2 border-primary shadow-gold' 
                        : 'bg-muted/30 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{displayName}</span>
                        {isCustomOrder && (
                          <Badge variant="secondary" className="text-xs">Custom Order</Badge>
                        )}
                        {product?.is_trade_in && <TradeInBadge />}
                        {product?.is_consignment && <ConsignmentBadge />}
                        {product?.is_registered && (
                          <Badge variant="outline" className="border-purple-500/50 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30">
                            Registered
                          </Badge>
                        )}
                        {isConsignment && !isSettled && userRole === 'owner' && (
                          <Badge variant="outline" className="border-warning text-warning bg-warning/10">
                            Payout Due
                          </Badge>
                        )}
                      </div>
                      
                      {product && (
                        <div className="text-xs text-muted-foreground space-x-2">
                          {product.sku && <span>SKU: {product.sku}</span>}
                          {product.sku && <span>•</span>}
                          <span>INT: {product.internal_sku}</span>
                          {serial && (
                            <>
                              <span>•</span>
                              <span className="font-mono">SKU: {serial}</span>
                            </>
                          )}
                          {product.category && (
                            <>
                              <span>•</span>
                              <span>{product.category}</span>
                            </>
                          )}
                          {product.metal && (
                            <>
                              <span>•</span>
                              <span>{product.metal}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} × £{item.unit_price.toFixed(2)}
                        {item.discount > 0 && <span className="text-success ml-2">(-£{item.discount.toFixed(2)} discount)</span>}
                      </div>
                      
                      {/* COGS & GP (owner only) */}
                      {userRole === 'owner' && (
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                          <span>COGS: £{item.lineCOGS.toFixed(2)}</span>
                          <span>•</span>
                          <span className={marginColor}>
                            GP: £{item.lineGP.toFixed(2)} ({item.marginPercent.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                      
                      <div className="flex gap-2 flex-wrap mt-2">
                        {product && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => handleViewProduct(product)}
                            aria-label={`View ${displayName} product details`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Product
                          </Button>
                        )}
                        
                        {isConsignment && !isSettled && userRole === 'owner' && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-warning hover:text-warning/80"
                            onClick={() => handleRecordSettlement(item)}
                            aria-label="Record consignment settlement"
                          >
                            Record Settlement
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium font-mono">£{item.lineRevenue.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Part Exchanges */}
            {partExchanges.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Part Exchanges</h3>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate('/products/intake')}
                      className="text-xs h-auto p-0"
                    >
                      View Intake Queue →
                    </Button>
                  </div>
                  {partExchanges.map((px) => {
                    const statusBadge = () => {
                      if (px.status === 'linked' && px.product_id) {
                        return <Badge className="bg-success/10 text-success border-success/20">Converted</Badge>;
                      }
                      if (px.status === 'discarded') {
                        return <Badge variant="outline" className="border-muted text-muted-foreground">Discarded</Badge>;
                      }
                      return <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">In Queue</Badge>;
                    };
                    
                    return (
                      <div key={px.id} className="flex items-start justify-between gap-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{px.title || 'Part Exchange Item'}</span>
                            <TradeInBadge />
                            {statusBadge()}
                          </div>
                          {px.description && (
                            <div className="text-xs text-muted-foreground">{px.description}</div>
                          )}
                          {px.serial && (
                            <div className="text-xs text-muted-foreground font-mono">SKU: {px.serial}</div>
                          )}
                          {px.customer_name && (
                            <div className="text-xs text-muted-foreground">From: {px.customer_name}</div>
                          )}
                          {px.status === 'linked' && px.product_id && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => handleViewProduct(px.product_id)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Product
                            </Button>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium font-mono text-destructive">-£{px.allowance.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">Allowance</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Signature Display */}
            {(sale as any).signature_data && (
              <>
                <Separator />
                <div className="space-y-2 p-4 bg-muted/20 rounded-lg border">
                  <h3 className="text-sm font-medium">Customer Signature</h3>
                  <div className="border-2 border-muted rounded-lg overflow-hidden bg-background">
                    <img src={(sale as any).signature_data} alt="Customer signature" className="w-full h-32 object-contain" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Signed at point of sale on {format(new Date(sale.sold_at), 'PPpp')}
                  </p>
                </div>
              </>
            )}

            {/* Totals */}
            <div className="space-y-2 p-4 bg-muted/20 rounded-lg border-2 border-muted">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">£{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-mono text-success">-£{sale.discount_total.toFixed(2)}</span>
                </div>
              )}
              {sale.tax_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-mono">£{sale.tax_total.toFixed(2)}</span>
                </div>
              )}
              {sale.part_exchange_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Part Exchange:</span>
                  <span className="font-mono text-destructive">-£{sale.part_exchange_total.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg border-l-4 border-primary pl-3 py-1 bg-primary/5">
                <span className="text-primary">Net Total:</span>
                <span className="font-mono text-primary">£{(sale.total - (sale.part_exchange_total || 0)).toFixed(2)}</span>
              </div>
            </div>

            {/* Commission Section (Owner only) */}
            {userRole === 'owner' && settings.commissionSettings?.enabled && !sale.is_voided && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Coins className="h-4 w-4" />
                      Staff Commission
                      {commissionDetails.hasOverride && (
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          Overridden
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-lg font-bold text-primary">
                      £{commissionDetails.current.toFixed(2)}
                    </div>
                    {commissionDetails.hasOverride && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Calculated: £{commissionDetails.calculated.toFixed(2)}
                        {commissionDetails.reason && (
                          <span className="ml-2">• {commissionDetails.reason}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommissionModalOpen(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {sale.notes && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <div className="text-sm">{sale.notes}</div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} aria-label="Close dialog">
                Close
              </Button>
              {/* Void and Edit buttons - Owners and Managers, not for voided sales */}
              {canEditSales && !sale?.is_voided && (
                <Button
                  variant="outline"
                  onClick={() => setEditModalOpen(true)}
                  aria-label="Edit sale"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {canVoidSales && !sale?.is_voided && (
                <Button
                  variant="outline"
                  onClick={() => setVoidModalOpen(true)}
                  className="text-destructive hover:text-destructive"
                  aria-label="Void sale"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Void
                </Button>
              )}
              {isAtLeast('manager') && !sale?.is_voided && (
                <Button
                  variant="outline"
                  onClick={() => setAddPxModalOpen(true)}
                  aria-label="Add part exchange to sale"
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Add Trade-In
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {focusLineItemId && (
                <Button
                  variant="outline"
                  onClick={handleOpenSoldItem}
                  size="sm"
                  aria-label="View sold item details"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Sold Item
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleEmail}
                aria-label="Email receipt via desktop email client"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-gradient-primary"
                aria-label="Print receipt (Ctrl+P or Cmd+P)"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
        
        {/* Print styles */}
        <style>{`
          @media print {
            [role="dialog"] {
              position: static !important;
              max-width: 100% !important;
            }
            [role="dialog"] button,
            [role="dialog"] [data-dialog-close] {
              display: none !important;
            }
          }
        `}</style>
      </Dialog>
      
      {/* Quick Settlement Modal */}
      {selectedConsignment && (
        <QuickSettlementModal
          isOpen={settlementModalOpen}
          onClose={() => {
            setSettlementModalOpen(false);
            setSelectedConsignment(null);
          }}
          productName={selectedConsignment.productName}
          supplierName={selectedConsignment.supplierName}
          salePrice={selectedConsignment.salePrice}
          agreedPrice={selectedConsignment.agreedPrice}
          productId={selectedConsignment.productId}
          supplierId={selectedConsignment.supplierId}
          saleId={saleId!}
        />
      )}

      {/* Void Sale Modal */}
      {saleId && sale && (
        <VoidSaleModal
          open={voidModalOpen}
          onOpenChange={setVoidModalOpen}
          saleId={saleId}
          saleTotal={sale.total}
          onSuccess={async () => {
            // Refetch the current sale details
            await refetch();
            // Also invalidate the transactions list so it updates
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}

      {/* Edit Sale Modal */}
      {saleId && (
        <EditSaleModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          saleId={saleId}
          onSuccess={async () => {
            // Refetch the current sale details
            await refetch();
            // Also invalidate the transactions list so it updates
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}

      {/* Edit Commission Modal */}
      {saleId && sale && (
        <EditSaleCommissionModal
          open={commissionModalOpen}
          onClose={() => setCommissionModalOpen(false)}
          saleId={saleId}
          currentCommission={commissionDetails.current}
          calculatedCommission={commissionDetails.calculated}
          hasOverride={commissionDetails.hasOverride}
          overrideReason={commissionDetails.reason}
        />
      )}

      {/* Add Part Exchange Modal */}
      {saleId && (
        <AddPartExchangeToSaleModal
          open={addPxModalOpen}
          onOpenChange={setAddPxModalOpen}
          saleId={saleId}
          onSuccess={async () => {
            await refetch();
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
          }}
        />
      )}
      
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          open={productDetailOpen}
          onOpenChange={setProductDetailOpen}
          onEditClick={() => {}}
        />
      )}
    </>
  );
}
