// Document loaders - convert database records to text for embedding

interface Product {
  id: number;
  name: string;
  sku?: string;
  internal_sku: string;
  category?: string;
  metal?: string;
  karat?: string;
  gemstone?: string;
  description?: string;
  unit_price: number;
  unit_cost: number;
  is_consignment: boolean;
  is_trade_in: boolean;
  supplier?: { name: string } | null;
  consignment_supplier?: { name: string } | null;
  location?: { name: string } | null;
  stock_qty?: number;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vip_tier: string;
  lifetime_spend: number;
  total_purchases: number;
  metal_preference?: string;
  style_preference?: string;
  ring_size?: string;
  bracelet_size?: string;
  necklace_length?: string;
  birthday?: string;
  anniversary?: string;
  notes?: string;
}

interface Sale {
  id: number;
  sold_at: string;
  total: number;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  payment: string;
  customer_name?: string;
  customer_email?: string;
  staff_member_name?: string;
  notes?: string;
  is_voided: boolean;
  sale_items?: Array<{
    product?: { name: string; sku?: string };
    quantity: number;
    unit_price: number;
  }>;
}

interface Supplier {
  id: number;
  name: string;
  supplier_type: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  status?: string;
}

interface Expense {
  id: number;
  incurred_at: string;
  category: string;
  description?: string;
  amount: number;
  payment_method?: string;
  supplier?: { name: string } | null;
  staff?: { full_name: string } | null;
  notes?: string;
  is_cogs: boolean;
}

export function productToDocument(product: Product): { content: string; metadata: Record<string, unknown> } {
  const parts: string[] = [];

  parts.push(`Product: ${product.name}`);
  parts.push(`SKU: ${product.internal_sku}${product.sku ? ` (${product.sku})` : ''}`);

  if (product.category) parts.push(`Category: ${product.category}`);
  if (product.metal) parts.push(`Metal: ${product.metal}`);
  if (product.karat) parts.push(`Karat: ${product.karat}`);
  if (product.gemstone) parts.push(`Gemstone: ${product.gemstone}`);
  if (product.description) parts.push(`Description: ${product.description}`);

  parts.push(`Price: £${product.unit_price.toFixed(2)}`);
  parts.push(`Cost: £${product.unit_cost.toFixed(2)}`);

  if (product.stock_qty !== undefined) {
    parts.push(`Stock: ${product.stock_qty} units`);
  }

  if (product.supplier?.name) {
    parts.push(`Supplier: ${product.supplier.name}`);
  }

  if (product.is_consignment && product.consignment_supplier?.name) {
    parts.push(`Consignment from: ${product.consignment_supplier.name}`);
  }

  if (product.is_trade_in) {
    parts.push(`Type: Trade-in item`);
  }

  if (product.location?.name) {
    parts.push(`Location: ${product.location.name}`);
  }

  return {
    content: parts.join('. '),
    metadata: {
      category: product.category,
      metal: product.metal,
      karat: product.karat,
      is_consignment: product.is_consignment,
      is_trade_in: product.is_trade_in,
      price: product.unit_price,
    },
  };
}

export function customerToDocument(customer: Customer): { content: string; metadata: Record<string, unknown> } {
  const parts: string[] = [];

  parts.push(`Customer: ${customer.name}`);
  if (customer.email) parts.push(`Email: ${customer.email}`);
  if (customer.phone) parts.push(`Phone: ${customer.phone}`);
  if (customer.address) parts.push(`Address: ${customer.address}`);

  parts.push(`VIP Tier: ${customer.vip_tier}`);
  parts.push(`Lifetime Spend: £${customer.lifetime_spend.toFixed(2)}`);
  parts.push(`Total Purchases: ${customer.total_purchases}`);

  if (customer.metal_preference) parts.push(`Metal Preference: ${customer.metal_preference}`);
  if (customer.style_preference) parts.push(`Style Preference: ${customer.style_preference}`);
  if (customer.ring_size) parts.push(`Ring Size: ${customer.ring_size}`);
  if (customer.bracelet_size) parts.push(`Bracelet Size: ${customer.bracelet_size}`);
  if (customer.necklace_length) parts.push(`Necklace Length: ${customer.necklace_length}`);

  if (customer.birthday) parts.push(`Birthday: ${customer.birthday}`);
  if (customer.anniversary) parts.push(`Anniversary: ${customer.anniversary}`);

  if (customer.notes) parts.push(`Notes: ${customer.notes}`);

  return {
    content: parts.join('. '),
    metadata: {
      vip_tier: customer.vip_tier,
      lifetime_spend: customer.lifetime_spend,
      total_purchases: customer.total_purchases,
    },
  };
}

export function saleToDocument(sale: Sale): { content: string; metadata: Record<string, unknown> } {
  const parts: string[] = [];

  const saleDate = new Date(sale.sold_at).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  parts.push(`Sale #${sale.id} on ${saleDate}`);
  parts.push(`Total: £${sale.total.toFixed(2)}`);
  parts.push(`Payment Method: ${sale.payment}`);

  if (sale.customer_name) {
    parts.push(`Customer: ${sale.customer_name}`);
    if (sale.customer_email) parts.push(`Customer Email: ${sale.customer_email}`);
  }

  if (sale.staff_member_name) {
    parts.push(`Staff: ${sale.staff_member_name}`);
  }

  if (sale.discount_total > 0) {
    parts.push(`Discount: £${sale.discount_total.toFixed(2)}`);
  }

  if (sale.is_voided) {
    parts.push(`Status: VOIDED`);
  }

  if (sale.sale_items && sale.sale_items.length > 0) {
    const itemDescriptions = sale.sale_items.map(item => {
      const productName = item.product?.name || 'Unknown Product';
      return `${item.quantity}x ${productName} at £${item.unit_price.toFixed(2)}`;
    });
    parts.push(`Items: ${itemDescriptions.join(', ')}`);
  }

  if (sale.notes) parts.push(`Notes: ${sale.notes}`);

  return {
    content: parts.join('. '),
    metadata: {
      sold_at: sale.sold_at,
      total: sale.total,
      payment_method: sale.payment,
      customer_name: sale.customer_name,
      is_voided: sale.is_voided,
    },
  };
}

export function supplierToDocument(supplier: Supplier): { content: string; metadata: Record<string, unknown> } {
  const parts: string[] = [];

  parts.push(`Supplier: ${supplier.name}`);
  parts.push(`Type: ${supplier.supplier_type === 'customer' ? 'Customer/Trade-in Source' : 'Registered Supplier'}`);

  if (supplier.contact_name) parts.push(`Contact: ${supplier.contact_name}`);
  if (supplier.phone) parts.push(`Phone: ${supplier.phone}`);
  if (supplier.email) parts.push(`Email: ${supplier.email}`);
  if (supplier.address) parts.push(`Address: ${supplier.address}`);

  if (supplier.tags && supplier.tags.length > 0) {
    parts.push(`Tags: ${supplier.tags.join(', ')}`);
  }

  if (supplier.status) parts.push(`Status: ${supplier.status}`);
  if (supplier.notes) parts.push(`Notes: ${supplier.notes}`);

  return {
    content: parts.join('. '),
    metadata: {
      supplier_type: supplier.supplier_type,
      tags: supplier.tags,
      status: supplier.status,
    },
  };
}

export function expenseToDocument(expense: Expense): { content: string; metadata: Record<string, unknown> } {
  const parts: string[] = [];

  const expenseDate = new Date(expense.incurred_at).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  parts.push(`Expense on ${expenseDate}`);
  parts.push(`Category: ${expense.category}`);
  parts.push(`Amount: £${expense.amount.toFixed(2)}`);

  if (expense.description) parts.push(`Description: ${expense.description}`);
  if (expense.payment_method) parts.push(`Payment Method: ${expense.payment_method}`);

  if (expense.supplier?.name) {
    parts.push(`Supplier: ${expense.supplier.name}`);
  }

  if (expense.staff?.full_name) {
    parts.push(`Recorded by: ${expense.staff.full_name}`);
  }

  if (expense.is_cogs) {
    parts.push(`Type: Cost of Goods Sold (COGS)`);
  }

  if (expense.notes) parts.push(`Notes: ${expense.notes}`);

  return {
    content: parts.join('. '),
    metadata: {
      incurred_at: expense.incurred_at,
      category: expense.category,
      amount: expense.amount,
      is_cogs: expense.is_cogs,
    },
  };
}
