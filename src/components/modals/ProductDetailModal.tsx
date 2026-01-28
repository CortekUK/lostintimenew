import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Product } from '@/types';
import { Package, PoundSterling, TrendingUp, Calendar, Truck, Tag, Gem, Award, FileText, Eye, Download, Repeat, User, Phone, Copy, ExternalLink, MapPin, Clock, Percent, CalendarClock, X, AlertTriangle, Video, Image as ImageIcon } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ConsignmentAgreementSection } from '@/components/consignments/ConsignmentAgreementSection';
import { StockAdjustmentModal } from '@/components/products/StockAdjustmentModal';
import { ImageModal } from '@/components/ui/image-modal';
import { ProductDocumentsTab } from '@/components/documents/ProductDocumentsTab';
import { PartExchangeInfoTab } from '@/components/products/PartExchangeInfoTab';
import { isVideoUrl } from '@/components/ui/multi-image-upload';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { useToast } from '@/hooks/use-toast';
import { useProductTradeInStatus } from '@/hooks/useProductTradeInStatus';
import { usePartExchangesByProduct } from '@/hooks/usePartExchanges';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getSupplierDisplayName, getCleanedDescription, formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick: () => void;
  onDuplicateClick?: () => void;
  soldInfo?: {
    soldAt: string;
    salePrice: number;
    saleId: number;
  };
  hideViewSale?: boolean;
}

export function ProductDetailModal({ product, open, onOpenChange, onEditClick, onDuplicateClick, soldInfo, hideViewSale }: ProductDetailModalProps) {
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<{ orderId: number; itemId: number; customerName: string } | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const navigate = useNavigate();
  const isOwner = useOwnerGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check product type status
  const { data: isTradeIn } = useProductTradeInStatus(product?.id || 0);
  const { data: partExchange } = usePartExchangesByProduct(product?.id || 0);

  // Fetch product reservations
  const { data: reservations = [] } = useQuery({
    queryKey: ['product-reservations', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from('deposit_order_items')
        .select(`
          id,
          product_id,
          product_name,
          unit_price,
          quantity,
          reserved_at,
          deposit_order:deposit_orders!inner(
            id,
            customer_name,
            customer_id,
            expected_date,
            status,
            amount_paid,
            total_amount
          )
        `)
        .eq('product_id', product.id)
        .not('deposit_order.status', 'in', '(completed,cancelled)');
      
      if (error) throw error;
      return (data || []).map((item: any) => ({
        itemId: item.id,
        productName: item.product_name,
        unitPrice: item.unit_price,
        quantity: item.quantity || 1,
        reservedAt: item.reserved_at,
        orderId: item.deposit_order.id,
        customerName: item.deposit_order.customer_name,
        customerId: item.deposit_order.customer_id,
        expectedDate: item.deposit_order.expected_date,
        status: item.deposit_order.status,
        amountPaid: item.deposit_order.amount_paid,
        totalAmount: item.deposit_order.total_amount
      }));
    },
    enabled: !!product?.id && open,
  });

  const handleReleaseReservation = async () => {
    if (!selectedReservation) return;
    
    setIsReleasing(true);
    try {
      const { error } = await supabase
        .from('deposit_order_items')
        .delete()
        .eq('id', selectedReservation.itemId);

      if (error) throw error;

      toast({
        title: 'Reservation released',
        description: `Removed reservation for ${selectedReservation.customerName}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['product-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
    } catch (error: any) {
      toast({
        title: 'Error releasing reservation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsReleasing(false);
      setReleaseConfirmOpen(false);
      setSelectedReservation(null);
    }
  };

  const getPickupStatus = (expectedDate: string | null) => {
    if (!expectedDate) return null;
    const days = differenceInDays(parseISO(expectedDate), new Date());
    if (days < 0) {
      return { text: `${Math.abs(days)}d overdue`, className: 'bg-destructive/10 text-destructive border-destructive/30', isOverdue: true };
    }
    if (days <= 3) {
      return { text: `${days}d left`, className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300', isOverdue: false };
    }
    return { text: format(parseISO(expectedDate), 'MMM d'), className: 'bg-muted text-muted-foreground', isOverdue: false };
  };

  // Keyboard shortcut for duplicate (Cmd/Ctrl + D)
  useKeyboardShortcuts([
    {
      key: 'd',
      ctrlKey: true,
      callback: () => {
        if (isOwner && onDuplicateClick && open) {
          onDuplicateClick();
        }
      },
      description: 'Duplicate Product (Cmd/Ctrl+D)'
    }
  ]);

  if (!product) return null;

  const stock = (product as any).qty_on_hand || 0;
  const inventoryValue = (product as any).inventory_value || 0;
  const profit = (Number(product.unit_price) - Number(product.unit_cost)).toFixed(2);
  // Markup = (Profit / Cost) * 100 - standard jewellery industry metric
  const markup = Number(product.unit_cost) > 0 
    ? (((Number(product.unit_price) - Number(product.unit_cost)) / Number(product.unit_cost)) * 100).toFixed(1)
    : 0;
  
  const getStockStatus = (qty: number) => {
    if (qty === 0) return { variant: 'destructive' as const, text: 'Out of Stock', color: 'text-destructive' };
    if (qty < 5) return { variant: 'secondary' as const, text: 'Low Stock', color: 'text-warning' };
    return { variant: 'outline' as const, text: 'In Stock', color: 'text-success' };
  };
  
  const stockStatus = getStockStatus(stock);

  // Calculate days in inventory
  const getDaysInInventory = () => {
    const purchaseDate = (product as any).purchase_date 
      ? new Date((product as any).purchase_date)
      : new Date((product as any).created_at);
    return Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysInInventory = getDaysInInventory();
  const getAgingStatus = (days: number) => {
    if (days >= 90) return { variant: 'destructive' as const, text: 'Aged Stock' };
    if (days >= 60) return { variant: 'secondary' as const, text: 'Aging' };
    return { variant: 'outline' as const, text: 'Fresh' };
  };
  const agingStatus = getAgingStatus(daysInInventory);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`w-full max-w-[58rem] max-h-[90vh] overflow-hidden p-0 ${soldInfo ? 'border-destructive/50' : ''}`}>
          <div className="max-h-[90vh] overflow-y-auto">
          
            {/* Hero Header Section */}
            <div className="p-6 pb-0">
            {soldInfo && (
              <div className="mb-5 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-base px-3 py-1.5 font-medium">
                      SOLD
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">
                        Sold on {format(new Date(soldInfo.soldAt), 'MMM dd, yyyy')} for £{soldInfo.salePrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This product has been sold and is archived
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogHeader className="mb-0">
              <div className="flex items-start gap-5">
                {/* Premium Image/Video Container */}
                {(product as any).image_url ? (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-sm opacity-50" />
                    {isVideoUrl((product as any).image_url) ? (
                      <div className="relative w-24 h-24 rounded-xl border border-border/50 overflow-hidden shadow-md">
                        <video
                          src={(product as any).image_url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <img
                          src={(product as any).image_url}
                          alt={product.name}
                          className="relative w-24 h-24 object-cover rounded-xl border border-border/50 cursor-pointer shadow-md transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.02]"
                          onClick={() => setImageModalOpen(true)}
                        />
                        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => setImageModalOpen(true)}>
                          <Eye className="h-5 w-5 text-white drop-shadow-md" />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-muted to-muted/50 rounded-xl border border-border/50 flex items-center justify-center shadow-sm">
                    <Gem className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <DialogTitle className="font-luxury text-2xl text-foreground mb-1 truncate">{product.name}</DialogTitle>
                      <p className="text-muted-foreground text-sm">
                        {product.category} • <span className="font-mono text-xs">{product.internal_sku || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Product Type & Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {!soldInfo && stock < 5 && (
                      <Badge variant={stockStatus.variant} className="font-medium px-2.5 py-0.5">
                        <Package className="h-3 w-3 mr-1.5" />
                        {stockStatus.text}
                      </Badge>
                    )}
                    {reservations.length > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 font-medium px-2.5 py-0.5">
                        <CalendarClock className="h-3 w-3 mr-1.5" />
                        {reservations.length} Reserved
                      </Badge>
                    )}
                    {(product as any).is_registered && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-medium px-2.5 py-0.5">
                        <Award className="h-3 w-3 mr-1.5" />
                        Registered
                      </Badge>
                    )}
                    {(product as any).is_consignment && (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-700 bg-amber-50 dark:bg-amber-900/20 font-medium px-2.5 py-0.5">
                        <FileText className="h-3 w-3 mr-1.5" />
                        Consignment
                      </Badge>
                    )}
                    {isTradeIn && (
                      <Badge variant="outline" className="border-blue-500/50 text-blue-700 bg-blue-50 dark:bg-blue-900/20 font-medium px-2.5 py-0.5">
                        <Repeat className="h-3 w-3 mr-1.5" />
                        Part Exchange
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Media Gallery Carousel */}
          {(() => {
            // Get media from images array, falling back to image_url for backwards compatibility
            const mediaList: string[] = (product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0
              ? (product as any).images
              : (product as any).image_url
                ? [(product as any).image_url]
                : [];

            if (mediaList.length === 0) return null;

            return (
            <div className="px-6 pt-5">
              <Card className="shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="bg-muted/30 py-3 px-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Media Gallery ({mediaList.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {mediaList.map((mediaUrl, index) => (
                        <CarouselItem key={index}>
                          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                            {isVideoUrl(mediaUrl) ? (
                              <video
                                src={mediaUrl}
                                controls
                                className="w-full h-full object-contain bg-black"
                              >
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={`${product.name} - ${index + 1}`}
                                className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                  setSelectedImageIndex(index);
                                  setImageModalOpen(true);
                                }}
                              />
                            )}
                            {/* Media type indicator */}
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              {isVideoUrl(mediaUrl) ? (
                                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>
                              ) : (
                                <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {index + 1}/{mediaList.length}</span>
                              )}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {/* Navigation arrows - visible when multiple items exist */}
                    {mediaList.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </>
                    )}
                  </Carousel>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    {mediaList.length > 1
                      ? `Swipe or use arrows to navigate (${mediaList.length} items)`
                      : isVideoUrl(mediaList[0]) ? 'Click to play video' : 'Click image to enlarge'}
                  </p>
                </CardContent>
              </Card>
            </div>
            );
          })()}

          {/* Financial Highlights Bar */}
          <div className="px-6 pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <PoundSterling className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">Sell Price</span>
                      <p className="text-xl font-bold text-primary truncate">£{Number(product.unit_price).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${Number(profit) >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      <TrendingUp className={`h-5 w-5 ${Number(profit) >= 0 ? 'text-success' : 'text-destructive'}`} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">Profit</span>
                      <p className={`text-xl font-bold truncate ${Number(profit) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        £{profit}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${Number(markup) >= 50 ? 'bg-success/10' : Number(markup) >= 25 ? 'bg-muted' : 'bg-warning/10'}`}>
                      <Percent className={`h-5 w-5 ${Number(markup) >= 50 ? 'text-success' : Number(markup) >= 25 ? 'text-muted-foreground' : 'text-warning'}`} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">Markup</span>
                      <p className={`text-xl font-bold truncate ${Number(markup) >= 50 ? 'text-success' : Number(markup) >= 25 ? 'text-foreground' : 'text-warning'}`}>{markup}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stock === 0 ? 'bg-destructive/10' : stock < 5 ? 'bg-warning/10' : 'bg-muted'}`}>
                      <Package className={`h-5 w-5 ${stockStatus.color}`} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">In Stock</span>
                      <p className={`text-xl font-bold ${stockStatus.color}`}>{stock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-6 py-5 space-y-5">
            
            {/* Purchase Tracking Section - Hide if sold */}
            {stock > 0 && !soldInfo && (
              <Card className="shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="bg-muted/30 py-4 px-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium text-foreground">Purchase & Inventory Age</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Tracking and aging information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Purchase Date</p>
                      <p className="font-medium text-foreground">{(product as any).purchase_date 
                        ? new Date((product as any).purchase_date).toLocaleDateString('en-GB')
                        : new Date((product as any).created_at).toLocaleDateString('en-GB')}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {(product as any).purchase_date 
                          ? new Date((product as any).purchase_date).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : new Date((product as any).created_at).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Days in Inventory</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-primary">{daysInInventory}</p>
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                      <Badge variant={agingStatus.variant} className="mt-2 text-xs">
                        {agingStatus.text}
                      </Badge>
                    </div>
                    <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Cost vs. Value</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cost:</span>
                          <span className="font-medium">{formatCurrency(Number((product as any).unit_cost))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Value:</span>
                          <span className="font-medium text-foreground">{formatCurrency(inventoryValue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Reservations Section */}
            {reservations.length > 0 && !soldInfo && (
              <Card className="shadow-sm border-amber-300/50 overflow-hidden bg-amber-50/30 dark:bg-amber-950/20">
                <CardHeader className="bg-amber-100/50 dark:bg-amber-900/30 py-4 px-5 border-b border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <CalendarClock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium text-foreground">Active Reservations</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {reservations.length} reservation{reservations.length !== 1 ? 's' : ''} for deposit orders
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {reservations.map((reservation: any, index: number) => {
                      const pickupStatus = getPickupStatus(reservation.expectedDate);
                      
                      return (
                        <div
                          key={`${reservation.orderId}-${reservation.itemId}-${index}`}
                          className="flex items-center gap-4 p-3 rounded-lg bg-background border border-border/50 hover:border-border transition-colors"
                        >
                          {/* Customer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">{reservation.customerName}</p>
                              {pickupStatus && (
                                <Badge variant="outline" className={`text-xs ${pickupStatus.className}`}>
                                  {pickupStatus.isOverdue && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  {pickupStatus.text}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>Order #{reservation.orderId}</span>
                              {reservation.quantity > 1 && <span>Qty: {reservation.quantity}</span>}
                              <span>{formatCurrency(reservation.unitPrice)}</span>
                              <Badge variant="outline" className="text-xs capitalize">{reservation.status}</Badge>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigate(`/deposits/${reservation.orderId}`);
                                onOpenChange(false);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Order
                            </Button>
                            {isOwner && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        setSelectedReservation({
                                          orderId: reservation.orderId,
                                          itemId: reservation.itemId,
                                          customerName: reservation.customerName
                                        });
                                        setReleaseConfirmOpen(true);
                                      }}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Release this reservation</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {((product as any).is_consignment || isTradeIn || getSupplierDisplayName(product) !== 'Unknown Supplier') && (
              <Card className="shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="bg-muted/30 py-4 px-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium text-foreground">Ownership Source</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {(product as any).is_consignment 
                          ? "Consignment product details"
                          : isTradeIn 
                            ? "Part exchange customer information"
                            : "Supplier information"
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {(product as any).is_consignment ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="divide-y divide-border/50">
                        <div className="flex justify-between py-2.5 first:pt-0">
                          <span className="text-muted-foreground text-sm">Consignment Supplier</span>
                          <span className="font-medium text-sm">
                            {(product as any).consignment_supplier?.name || 'N/A'}
                          </span>
                        </div>
                        {(product as any).consignment_start_date && (
                          <div className="flex justify-between py-2.5">
                            <span className="text-muted-foreground text-sm">Start Date</span>
                            <span className="font-medium text-sm">
                              {new Date((product as any).consignment_start_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {(product as any).consignment_end_date && (
                          <div className="flex justify-between py-2.5 last:pb-0">
                            <span className="text-muted-foreground text-sm">End Date</span>
                            <span className="font-medium text-sm">
                              {new Date((product as any).consignment_end_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {(product as any).consignment_terms && (
                        <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Terms</span>
                          <p className="mt-2 text-sm">{(product as any).consignment_terms}</p>
                        </div>
                      )}
                    </div>
                  ) : isTradeIn && partExchange ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium text-sm">Customer Details</h4>
                        </div>
                        <div className="divide-y divide-border/50">
                          <div className="flex justify-between py-2 first:pt-0">
                            <span className="text-muted-foreground text-sm">Name</span>
                            <span className="font-medium text-sm">
                              {partExchange.customer_name || 'Not recorded'}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 last:pb-0">
                            <span className="text-muted-foreground text-sm">Contact</span>
                            <span className="font-medium font-mono text-sm">
                              {partExchange.customer_contact || 'Not recorded'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
                        <div className="flex items-center gap-2 mb-3">
                          <PoundSterling className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium text-sm">Trade-In Details</h4>
                        </div>
                        <div className="divide-y divide-border/50">
                          <div className="flex justify-between py-2 first:pt-0">
                            <span className="text-muted-foreground text-sm">Allowance</span>
                            <span className="font-medium text-success text-sm">
                              {formatCurrency(Number(partExchange.allowance))}
                            </span>
                          </div>
                          {partExchange.sale?.sold_at && (
                            <div className="flex justify-between py-2 last:pb-0">
                              <span className="text-muted-foreground text-sm">Date</span>
                              <span className="font-medium text-sm">
                                {new Date(partExchange.sale.sold_at).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}
                        </div>
                        {partExchange.sale_id && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sales/${partExchange.sale_id}`);
                              onOpenChange(false);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Original Sale
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground text-sm">Supplier</span>
                      <span className="font-medium text-sm">
                        {getSupplierDisplayName(product)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Collapsible Sections */}
            <Accordion type="multiple" defaultValue={["pricing", "specifications"]} className="space-y-3">
              
              {/* Pricing & Financials */}
              <AccordionItem value="pricing" className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <PoundSterling className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-base">Pricing & Financials</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 bg-muted/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-border/50">
                    <div className="divide-y divide-border/50 sm:pr-5">
                      <div className="flex justify-between py-3 first:pt-0">
                        <span className="text-muted-foreground text-sm">Cost Price</span>
                        <span className="font-medium">£{Number(product.unit_cost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-3">
                        <span className="text-muted-foreground text-sm">Sell Price</span>
                        <span className="font-medium">£{Number(product.unit_price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-3 last:pb-0">
                        <span className="text-muted-foreground text-sm">Tax Rate</span>
                        <span className="font-medium">{Number(product.tax_rate || 0).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="divide-y divide-border/50 sm:pl-5 sm:border-l border-border/50">
                      <div className="flex justify-between py-3 sm:first:pt-0">
                        <span className="text-muted-foreground text-sm">Profit per Unit</span>
                        <span className={`font-medium ${Number(profit) >= 0 ? 'text-success' : 'text-destructive'}`}>£{profit}</span>
                      </div>
                      <div className="flex justify-between py-3 last:pb-0">
                        <span className="text-muted-foreground text-sm">Markup</span>
                        <span className={`font-medium ${Number(markup) >= 50 ? 'text-success' : Number(markup) >= 25 ? '' : 'text-warning'}`}>{markup}%</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Specifications */}
              <AccordionItem value="specifications" className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gem className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-base">Specifications</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 bg-muted/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-border/50">
                    <div className="divide-y divide-border/50 sm:pr-5">
                      <div className="flex justify-between py-3 first:pt-0">
                        <span className="text-muted-foreground text-sm">Internal SKU</span>
                        <span className="font-medium font-mono text-sm">{product.internal_sku}</span>
                      </div>
                      {product.sku && (
                        <div className="flex justify-between py-3">
                          <span className="text-muted-foreground text-sm">SKU</span>
                          <span className="font-medium font-mono text-sm">{product.sku}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-3">
                        <span className="text-muted-foreground text-sm">Category</span>
                        <span className="font-medium">{product.category || 'N/A'}</span>
                      </div>
                      {(product as any).location && (
                        <div className="flex justify-between py-3 last:pb-0">
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Location
                          </span>
                          <span className="font-medium">{(product as any).location.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-border/50 sm:pl-5 sm:border-l border-border/50">
                      {product.metal && (
                        <div className="flex justify-between py-3 sm:first:pt-0">
                          <span className="text-muted-foreground text-sm">Metal</span>
                          <span className="font-medium">{product.metal}</span>
                        </div>
                      )}
                      {product.karat && (
                        <div className="flex justify-between py-3">
                          <span className="text-muted-foreground text-sm">Karat/Purity</span>
                          <span className="font-medium">{product.karat}</span>
                        </div>
                      )}
                      {product.gemstone && (
                        <div className="flex justify-between py-3 last:pb-0">
                          <span className="text-muted-foreground text-sm">Gemstone</span>
                          <span className="font-medium">{product.gemstone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {getCleanedDescription(product.description) && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <span className="text-muted-foreground text-sm">Description</span>
                      <p className="mt-2 text-sm leading-relaxed">{getCleanedDescription(product.description)}</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Stock Management - Owner only */}
              {isOwner && (
                <AccordionItem value="stock" className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                  <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-base">Stock Management</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          Current Stock: <span className={stockStatus.color}>{stock} units</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Inventory Value: £{inventoryValue.toFixed(2)}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setStockModalOpen(true)}
                        className="shrink-0"
                      >
                        Adjust Stock
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Documents & Media */}
              <AccordionItem value="documents" className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-base">Documents & Media</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 bg-muted/10">
                  <div>
                    <ProductDocumentsTab productId={product.id} />
                    
                    {/* Consignment Agreements - if applicable */}
                    {(product as any).is_consignment && (
                      <div className="mt-6">
                        <ConsignmentAgreementSection 
                          productId={product.id} 
                          isConsignment={true}
                        />
                      </div>
                    )}

                    {/* Trade-in Notes - if applicable */}
                    {isTradeIn && partExchange?.notes && (
                      <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                            <Repeat className="h-4 w-4" />
                            Trade-In Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm">{partExchange.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
            </Accordion>
          </div>

          {/* Action Buttons - Hide when viewing sold items */}
          {!soldInfo && (
            <div className="px-6 pb-6">
              <div className="flex gap-3 pt-5 border-t border-border/50 justify-end">
                {isOwner && (
                  <>
                    {onDuplicateClick && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                onOpenChange(false);
                                onDuplicateClick();
                              }}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate this product (Cmd/Ctrl+D)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button variant="premium" onClick={onEditClick} className="min-w-[140px]">
                      Edit Product
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      <StockAdjustmentModal
        product={product}
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
      />

      {(product as any)?.image_url && (
        <ImageModal
          src={(product as any).image_url}
          alt={product.name}
          open={imageModalOpen}
          onOpenChange={setImageModalOpen}
        />
      )}

      {/* Release Reservation Confirmation */}
      <AlertDialog open={releaseConfirmOpen} onOpenChange={setReleaseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release this reservation for{' '}
              <span className="font-medium">{selectedReservation?.customerName}</span>?
              This will remove the product from Deposit Order #{selectedReservation?.orderId}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReleasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReleaseReservation}
              disabled={isReleasing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isReleasing ? 'Releasing...' : 'Release Reservation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
