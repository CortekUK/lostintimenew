import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ShoppingCartComponent } from '@/components/pos/ShoppingCart';
import { CheckoutForm, DiscountType } from '@/components/pos/CheckoutForm';
import { DepositCheckoutSection } from '@/components/pos/DepositCheckoutSection';
import { PartExchangeModal } from '@/components/pos/PartExchangeModal';
import { EditCartPartExchangeModal } from '@/components/pos/EditCartPartExchangeModal';
import { SaleConfirmationModal } from '@/components/pos/SaleConfirmationModal';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { AddCustomItemModal, CustomItemData } from '@/components/pos/AddCustomItemModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useOwnerGuard, useManagerOrAboveGuard } from '@/hooks/useOwnerGuard';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { matchOrCreateCustomer } from '@/hooks/useCustomerMatchOrCreate';
import { useRecordCashMovement } from '@/hooks/useCashDrawer';
import { useCreateDepositOrder, PaymentMethod as DepositPaymentMethod } from '@/hooks/useDepositOrders';
import type { CartItem, Product, Sale, PartExchangeItem, CustomCartItem } from '@/types';

export default function EnhancedSales() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isOwner = useOwnerGuard();
  const isManagerOrAbove = useManagerOrAboveGuard();
  const { canCreate } = usePermissions();
  const canCreateSales = canCreate(CRM_MODULES.SALES);
  const recordCashMovement = useRecordCashMovement();
  const createDepositOrder = useCreateDepositOrder();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [partExchanges, setPartExchanges] = useState<PartExchangeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [staffMember, setStaffMember] = useState('');
  const [showPartExchangeModal, setShowPartExchangeModal] = useState(false);
  const [showEditPxModal, setShowEditPxModal] = useState(false);
  const [editingPartExchange, setEditingPartExchange] = useState<PartExchangeItem | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ sale: any; items: any[]; partExchanges: any[]; signature: string | null } | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [depositMode, setDepositMode] = useState(false);
  const [customItems, setCustomItems] = useState<CustomCartItem[]>([]);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);

  // Fetch current user's profile for auto-fill
  const { data: userProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  // Auto-set staff member when profile loads
  useEffect(() => {
    if (userProfile?.full_name && !staffMember) {
      setStaffMember(userProfile.full_name);
    }
  }, [userProfile?.full_name, staffMember]);

  // Fetch products with stock data and location details
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-with-stock'],
    queryFn: async () => {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, location:locations(id, name)')
        .order('name');
      
      if (productsError) throw productsError;
      
      // Get stock data
      const productIds = productsData?.map(p => p.id) || [];
      if (productIds.length === 0) return [];
      
      const { data: stockData } = await supabase
        .from('v_stock_on_hand')
        .select('*')
        .in('product_id', productIds);
      
      const stockMap = new Map(stockData?.map(s => [s.product_id, s.qty_on_hand]) || []);
      
      return productsData.map(p => ({
        ...p,
        stock_on_hand: stockMap.get(p.id) || 0
      })) as (Product & { stock_on_hand: number; location?: { id: number; name: string } | null })[];
    }
  });

  // Auto-set location from first cart item's product location
  useEffect(() => {
    if (cart.length > 0) {
      const firstProduct = cart[0].product as Product & { location?: { id: number; name: string } | null };
      if (firstProduct.location_id && !locationId) {
        setLocationId(firstProduct.location_id);
      }
    }
    // Clear location when cart and part exchanges are empty
    if (cart.length === 0 && partExchanges.length === 0) {
      setLocationId(null);
    }
  }, [cart, partExchanges.length]);

  // Handle productId from URL (coming from Products page)
  useEffect(() => {
    const productId = searchParams.get('productId');
    if (productId && products && products.length > 0) {
      const product = products.find(p => p.id === parseInt(productId, 10));
      if (product) {
        // Check if not already in cart
        const alreadyInCart = cart.find(item => item.product.id === product.id);
        if (!alreadyInCart) {
          const newItem: CartItem = {
            product,
            quantity: 1,
            unit_price: product.unit_price,
            unit_cost: product.unit_cost,
            tax_rate: product.tax_rate,
            discount: 0,
            stock_on_hand: product.stock_on_hand
          };
          setCart(prev => [...prev, newItem]);
          toast({
            title: 'Added to cart',
            description: `${product.name}`,
          });
        }
        // Clear the param to prevent re-adding on refresh
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, products]);

  // Get Customer Trade-In supplier ID
  const { data: tradeInSupplier } = useQuery({
    queryKey: ['trade-in-supplier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', 'Customer Trade-In')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate totals (including custom items for deposit mode)
  const regularSubtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const customSubtotal = customItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const subtotal = regularSubtotal + customSubtotal;
  const discountAmount = discountType === 'percentage' 
    ? (regularSubtotal * discount) / 100  // Discount only on regular items
    : discount;
  const taxAmount = cart.reduce((sum, item) => {
    const itemSubtotal = item.unit_price * item.quantity;
    const itemDiscountRatio = discountType === 'percentage'
      ? discount / 100
      : regularSubtotal > 0 ? discountAmount / regularSubtotal : 0;
    const itemAfterDiscount = itemSubtotal - (itemSubtotal * itemDiscountRatio);
    return sum + (itemAfterDiscount * (item.product.tax_rate / 100));
  }, 0);
  const customTaxAmount = customItems.reduce((sum, item) => sum + (item.unit_price * item.quantity * (item.tax_rate / 100)), 0);
  const total = subtotal - discountAmount + taxAmount + customTaxAmount;
  const partExchangeTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const netTotal = total - partExchangeTotal;

  // Part Exchange handlers
  const addPartExchange = (partExchange: PartExchangeItem) => {
    setPartExchanges([...partExchanges, partExchange]);
    
    // Auto-fill customer details from PX if checkout customer is empty
    if (!customerName.trim()) {
      if (partExchange.customer_name) {
        setCustomerName(partExchange.customer_name);
      }
      if (partExchange.customer_email) {
        setCustomerEmail(partExchange.customer_email);
      }
      if (partExchange.customer_phone) {
        setCustomerPhone(partExchange.customer_phone);
      }
      if (partExchange.customer_id) {
        setSelectedCustomerId(partExchange.customer_id);
      }
    }
    
    toast({
      title: 'Part exchange added',
      description: `${partExchange.product_name} trade-in for ${formatCurrency(partExchange.allowance)}`,
    });
  };

  const removePartExchange = (id: string) => {
    setPartExchanges(partExchanges.filter(px => px.id !== id));
  };

  const editPartExchange = (id: string) => {
    const px = partExchanges.find(p => p.id === id);
    if (px) {
      setEditingPartExchange(px);
      setShowEditPxModal(true);
    }
  };

  const updatePartExchange = (updated: PartExchangeItem) => {
    setPartExchanges(partExchanges.map(px => px.id === updated.id ? updated : px));
    toast({
      title: 'Trade-in updated',
      description: `${updated.product_name} - ${formatCurrency(updated.allowance)}`,
    });
  };

  const addToCart = (product: Product & { stock_on_hand?: number }) => {
    // Check if this product is from a different location than items already in cart
    if (cart.length > 0 && product.location_id) {
      const currentLocationId = cart[0].product.location_id;
      if (currentLocationId && product.location_id !== currentLocationId) {
        toast({
          title: 'Different shop location',
          description: 'Cannot add products from different locations to the same sale. Complete this sale first.',
          variant: 'destructive',
        });
        return;
      }
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Don't exceed available stock for tracked products
      if (product.track_stock && existingItem.stock_on_hand !== undefined) {
        if (existingItem.quantity >= existingItem.stock_on_hand) {
          toast({
            title: 'Stock limit reached',
            description: `Only ${existingItem.stock_on_hand} available`,
            variant: 'destructive',
          });
          return;
        }
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unit_price: product.unit_price,
        unit_cost: product.unit_cost,
        tax_rate: product.tax_rate,
        discount: 0,
        stock_on_hand: product.stock_on_hand
      };
      setCart([...cart, newItem]);
    }

    toast({
      title: 'Added to cart',
      description: `${product.name}`,
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }

    // Check stock limit
    const item = cart.find(i => i.product.id === productId);
    if (item?.product.track_stock && item.stock_on_hand !== undefined && quantity > item.stock_on_hand) {
      toast({
        title: 'Stock limit reached',
        description: `Only ${item.stock_on_hand} available`,
        variant: 'destructive',
      });
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Custom item handlers
  const addCustomItem = (item: CustomItemData) => {
    setCustomItems([...customItems, item as CustomCartItem]);
    toast({
      title: 'Custom item added',
      description: item.product_name,
    });
  };

  const updateCustomQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCustomItems(customItems.filter(item => item.id !== id));
      return;
    }
    setCustomItems(customItems.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };

  // Remove serial assignment functionality - simplified model

  // Complete sale mutation with part exchanges
  const completeSaleMutation = useMutation({
    mutationFn: async () => {
      // Validate stock availability before sale (frontend check - DB trigger is backup)
      if (cart.length > 0) {
        const { data: stockData, error: stockError } = await supabase
          .from('v_stock_on_hand')
          .select('product_id, qty_on_hand')
          .in('product_id', cart.map(item => item.product.id));

        if (stockError) throw new Error('Failed to verify stock availability');

        const stockMap = new Map(stockData?.map(s => [s.product_id, s.qty_on_hand]) || []);

        for (const item of cart) {
          if (item.product.track_stock) {
            const available = stockMap.get(item.product.id) || 0;
            if (available < item.quantity) {
              throw new Error(`Insufficient stock for "${item.product.name}". Available: ${available}, Requested: ${item.quantity}`);
            }
          }
        }
      }

      // Match or create customer if name provided
      let customerId: number | null = selectedCustomerId;
      
      if (!customerId && customerName.trim()) {
        const result = await matchOrCreateCustomer(
          customerName.trim(),
          customerEmail.trim() || null
        );
        customerId = result.customerId;
      }

      const saleData = {
        staff_id: user?.id,
        staff_member_name: staffMember,
        payment: paymentMethod,
        subtotal,
        tax_total: taxAmount,
        discount_total: discountAmount,
        total,
        part_exchange_total: partExchangeTotal,
        notes: notes || null,
        customer_id: customerId,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        signature_data: signature,
        location_id: locationId
      };

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      if (cart.length > 0) {
        const saleItems = cart.map(item => ({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.product.unit_cost,
          tax_rate: item.product.tax_rate,
          discount: item.discount
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        // Create consignment settlement records for consignment products
        const consignmentItems = cart.filter(item => item.product.is_consignment);
        if (consignmentItems.length > 0) {
          const settlementRecords = consignmentItems.map(item => ({
            product_id: item.product.id,
            sale_id: sale.id,
            supplier_id: item.product.consignment_supplier_id,
            sale_price: item.unit_price * item.quantity,
            payout_amount: item.product.unit_cost * item.quantity,
            paid_at: null
          }));

          const { error: settlementError } = await supabase
            .from('consignment_settlements')
            .insert(settlementRecords);

          if (settlementError) throw settlementError;
        }
      }

      // Store part exchanges as pending (don't create products yet)
      if (partExchanges.length > 0) {
        const pxRecords = partExchanges.map(px => ({
          sale_id: sale.id,
          title: px.product_name,
          category: px.category || null,
          description: px.description || null,
          serial: px.serial || null,
          allowance: px.allowance,
          customer_name: px.customer_name || null,
          customer_contact: px.customer_contact || null,
          customer_supplier_id: px.supplier_id || null,
          notes: px.notes || null,
          status: 'pending',
          product_id: null
        }));

        const { error: pxError } = await supabase
          .from('part_exchanges')
          .insert(pxRecords);

        if (pxError) throw pxError;
      }

      // Record cash drawer movement for cash payments
      if (paymentMethod === 'cash' && locationId && netTotal > 0) {
        await recordCashMovement.mutateAsync({
          location_id: locationId,
          movement_type: 'sale_cash_in',
          amount: netTotal,
          reference_sale_id: sale.id,
          notes: `Sale #${sale.id}`,
        });
      }

      return { sale, items: cart, partExchanges, signature };
    },
    onSuccess: ({ sale, items, partExchanges: pxItems, signature: sig }) => {
      // Invalidate all product-related caches for immediate UI updates
      queryClient.invalidateQueries({ queryKey: ['products-base'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-data'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-values'] });
      
      // Invalidate related data
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-drawer-balances'] });
      queryClient.invalidateQueries({ queryKey: ['cash-drawer-history'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sold-items'] });
      queryClient.invalidateQueries({ queryKey: ['sold-items-report'] });
      queryClient.invalidateQueries({ queryKey: ['commission-payments'] });
      // Store completed sale data for modal
      setCompletedSale({ 
        sale, 
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price
        })), 
        partExchanges: pxItems,
        signature: sig
      });

      // Reset form
      setCart([]);
      setPartExchanges([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSelectedCustomerId(null);
      setDiscount(0);
      setDiscountType('percentage');
      setNotes('');
      setSignature(null);
      setStaffMember('');
      // Keep locationId - user likely wants to continue at same location
      // Show confirmation modal
      setShowConfirmationModal(true);
    },
    onError: (error) => {
      toast({
        title: "Sale failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  });

  // Handle deposit order creation
  const handleCreateDepositOrder = async (initialPayment: number, paymentMethod: DepositPaymentMethod) => {
    try {
      // Match or create customer if name provided
      let customerId: number | null = selectedCustomerId;
      
      if (!customerId && customerName.trim()) {
        const result = await matchOrCreateCustomer(
          customerName.trim(),
          customerEmail.trim() || null
        );
        customerId = result.customerId;
      }

      // Build items array from regular cart + custom items
      const regularItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.product.unit_cost,
        is_custom_order: false,
      }));

      const customOrderItems = customItems.map(item => ({
        product_id: null,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        is_custom_order: true,
      }));

      const order = await createDepositOrder.mutateAsync({
        customer_id: customerId,
        customer_name: customerName.trim() || 'Walk-in Customer',
        notes: notes || undefined,
        location_id: locationId,
        items: [...regularItems, ...customOrderItems],
        part_exchanges: partExchanges.map(px => ({
          product_name: px.product_name,
          category: px.category,
          serial: px.serial,
          allowance: px.allowance,
          notes: px.notes,
        })),
        initial_payment: {
          amount: initialPayment,
          payment_method: paymentMethod,
        },
      });

      // Record cash movement for cash deposits
      if (paymentMethod === 'cash' && locationId && initialPayment > 0) {
        await recordCashMovement.mutateAsync({
          location_id: locationId,
          movement_type: 'deposit',
          amount: initialPayment,
          notes: `Deposit Order #${order.id}`,
        });
      }

      toast({
        title: 'Deposit order created',
        description: `Order #${order.id} created. Stock has been reserved.`,
      });

      // Reset form
      setCart([]);
      setCustomItems([]);
      setPartExchanges([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSelectedCustomerId(null);
      setDiscount(0);
      setDiscountType('percentage');
      setNotes('');
      setSignature(null);
      setDepositMode(false);

      // Navigate to the deposit order detail
      navigate(`/deposits/${order.id}`);
    } catch (error) {
      // Error toast is handled by the hook
    }
  };

  return (
    <AppLayout 
      title="Point of Sale"
      subtitle="Process sales transactions with part exchange support"
    >
      <div className="space-y-6">
        {/* Page-level mode switcher */}
        <div className="py-2 sm:py-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Tabs 
              value={depositMode ? 'deposit' : 'sale'} 
              onValueChange={(v) => {
                const isDeposit = v === 'deposit';
                setDepositMode(isDeposit);
                if (isDeposit) {
                  setDiscount(0); // Clear discount when switching to deposit mode
                }
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="sale" className="gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                  <span className="truncate">Complete Sale</span>
                </TabsTrigger>
                <TabsTrigger value="deposit" className="gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
                  <Wallet className="h-4 w-4 shrink-0" />
                  <span className="truncate">Deposit Order</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Quick access custom item button - only shown in deposit mode */}
            {depositMode && (
              <Button
                size="sm"
                onClick={() => setShowCustomItemModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Add Custom Item</span>
                <span className="sm:hidden">Custom Item</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Product Search */}
          <div className="xl:col-span-1">
            <ProductSearch 
              onAddToCart={addToCart}
              cartItems={cart.map(item => ({ product_id: item.product.id, quantity: item.quantity }))}
            />
          </div>
          
          {/* Middle: Shopping Cart */}
          <div className="xl:col-span-1">
            <ShoppingCartComponent
              items={cart}
              customItems={depositMode ? customItems : []}
              partExchanges={partExchanges}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onUpdateCustomQuantity={updateCustomQuantity}
              onRemoveCustomItem={removeCustomItem}
              onRemovePartExchange={removePartExchange}
              onEditPartExchange={editPartExchange}
              onAddPartExchange={() => setShowPartExchangeModal(true)}
              onAddCustomItem={() => setShowCustomItemModal(true)}
              discount={depositMode ? 0 : discount}
              discountType={discountType}
              showCustomItemButton={depositMode}
            />
          </div>
          
          {/* Right: Checkout - Conditional based on deposit mode */}
          <div className="xl:col-span-1">
            {depositMode ? (
              <DepositCheckoutSection
                items={cart}
                customItems={customItems}
                partExchanges={partExchanges}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                customerEmail={customerEmail}
                onCustomerEmailChange={setCustomerEmail}
                customerPhone={customerPhone}
                onCustomerPhoneChange={setCustomerPhone}
                selectedCustomerId={selectedCustomerId}
                onCustomerSelect={(id, name, email, phone) => {
                  setSelectedCustomerId(id);
                  setCustomerName(name);
                  setCustomerEmail(email);
                  setCustomerPhone(phone);
                }}
                customerNotes={notes}
                onCustomerNotesChange={setNotes}
                staffMember={staffMember}
                locationId={locationId}
                onLocationChange={setLocationId}
                locationLocked={cart.length > 0}
                onCreateDepositOrder={handleCreateDepositOrder}
                isProcessing={createDepositOrder.isPending}
                disabled={!canCreateSales}
                onSwitchToSale={() => setDepositMode(false)}
              />
            ) : (
            <CheckoutForm
                items={cart}
                partExchanges={partExchanges}
                discount={discount}
                discountType={discountType}
                onDiscountChange={setDiscount}
                onDiscountTypeChange={setDiscountType}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                customerEmail={customerEmail}
                onCustomerEmailChange={setCustomerEmail}
                customerPhone={customerPhone}
                onCustomerPhoneChange={setCustomerPhone}
                selectedCustomerId={selectedCustomerId}
                onCustomerSelect={(id, name, email, phone) => {
                  setSelectedCustomerId(id);
                  setCustomerName(name);
                  setCustomerEmail(email);
                  setCustomerPhone(phone);
                }}
                customerNotes={notes}
                onCustomerNotesChange={setNotes}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onCompleteSale={() => completeSaleMutation.mutate()}
                isProcessing={completeSaleMutation.isPending}
                requiresOwnerApproval={netTotal < 0 && !isManagerOrAbove}
                signature={signature}
                onSignatureChange={setSignature}
                staffMember={staffMember}
                onStaffMemberChange={setStaffMember}
                locationId={locationId}
                onLocationChange={setLocationId}
                locationLocked={cart.length > 0}
                disabled={!canCreateSales}
                onSwitchToDeposit={() => {
                  setDepositMode(true);
                  setDiscount(0);
                }}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        <PartExchangeModal
          isOpen={showPartExchangeModal}
          onClose={() => setShowPartExchangeModal(false)}
          onAdd={addPartExchange}
        />

        <EditCartPartExchangeModal
          open={showEditPxModal}
          onOpenChange={setShowEditPxModal}
          partExchange={editingPartExchange}
          onSave={updatePartExchange}
        />

        <AddCustomItemModal
          open={showCustomItemModal}
          onOpenChange={setShowCustomItemModal}
          onAdd={addCustomItem}
        />

        {completedSale && (
          <SaleConfirmationModal
            isOpen={showConfirmationModal}
            onClose={() => {
              setShowConfirmationModal(false);
              setCompletedSale(null);
            }}
            sale={completedSale.sale}
            items={completedSale.items}
            partExchanges={completedSale.partExchanges}
            signature={completedSale.signature}
            onPrint={() => {}} // Modal handles this internally
            onEmailReceipt={customerEmail ? () => {} : undefined} // Modal handles this internally
            onDownloadPDF={() => {}} // Modal handles this internally
          />
        )}
      </div>
    </AppLayout>
  );
}