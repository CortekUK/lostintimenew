import { formatCurrency, formatDateTime } from '@/lib/utils';

/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ReceiptData {
  sale: any;
  saleItems: any[];
  partExchanges: any[];
  pxTotal: number;
  staff: any;
}

interface SettingsData {
  store?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  branding?: {
    logo?: string;
    primary_gold?: string;
  };
  [key: string]: any;
}

/**
 * Build complete HTML for receipt printing with inline styles
 * This ensures the receipt prints correctly without external CSS dependencies
 */
export function buildReceiptHtml(data: ReceiptData, settings: SettingsData, isDarkMode: boolean = false): string {
  const { sale, saleItems, partExchanges, pxTotal, staff } = data;
  
  // Get store and branding info from settings
  const store = settings?.store || {
    name: "Sourced Jewellers",
    tagline: "Premium Jewelry & Timepieces",
    address: "123 High Street, London SW1A 1AA",
    phone: "020 7123 4567",
    email: "info@sourcedjewellers.com"
  };
  
  const branding = settings?.branding || {
    logo: "/new-logo.png",
    primary_gold: "#D4AF37"
  };
  
  const storeName = store.name || 'Sourced Jewellers';
  const tagline = store.tagline || 'Premium Jewelry & Timepieces';
  const contactInfo = [store.address, store.phone].filter(Boolean).join(' | ') || '123 High Street | 020 7123 4567';
  
  const netTotal = sale.total - pxTotal;

  // Build items HTML (with XSS protection)
  const itemsHtml = saleItems.map(item => {
    const product = item.products;
    const badges = [];
    if (product?.is_trade_in) badges.push('<span class="pill">Trade-In</span>');
    if (product?.is_consignment) badges.push('<span class="pill">Consignment</span>');

    return `
      <tr>
        <td>
          <strong>${escapeHtml(product?.name) || 'Unknown Product'}</strong>${badges.join('')}<br>
          <small style="color: #888;">${escapeHtml(product?.internal_sku || product?.sku) || 'N/A'}</small>
        </td>
        <td class="right">${item.quantity}</td>
        <td class="right">${formatCurrency(item.unit_price)}</td>
        <td class="right">${formatCurrency(item.quantity * item.unit_price)}</td>
      </tr>
    `;
  }).join('');

  // Build part exchanges HTML (with XSS protection)
  const partExchangesHtml = partExchanges.length > 0 ? `
    <div class="rcpt-px">
      <strong>Part Exchanges Applied:</strong><br>
      ${partExchanges.map(px => {
        const customerName = escapeHtml(px.customer_name || px.suppliers?.name) || 'Customer';
        const title = escapeHtml(px.title) || 'Part Exchange';
        return `<div>${title} (${customerName}): <strong>-${formatCurrency(px.allowance)}</strong></div>`;
      }).join('')}
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt #${sale.id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; color: #000; }
    
    .receipt { 
      max-width: 720px; 
      margin: 24px auto; 
      color: #1a1a1a; 
      font: 14px/1.6 Inter, system-ui, -apple-system; 
      background: #fff;
      padding: 20px;
    }
    
    .rcpt-header { 
      text-align: center; 
      margin-bottom: 24px; 
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 16px;
    }
    
    
    .rcpt-title { 
      font-family: 'Playfair Display', Georgia, serif; 
      font-size: 24px; 
      margin: 0 0 8px 0; 
      color: #1a1a1a;
      font-weight: 700;
    }
    
    .rcpt-tag { 
      color: #666; 
      font-size: 13px; 
      margin-bottom: 8px;
      font-style: italic;
    }
    
    .rcpt-meta { 
      color: #666; 
      font-size: 12px; 
      line-height: 1.4;
    }
    
    .rcpt-info { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 8px 20px; 
      margin: 20px 0; 
      padding: 16px;
      background: #f8f8f8;
      border-radius: 8px;
    }
    
    .rcpt-info > div { font-size: 13px; }
    .rcpt-info strong { font-weight: 600; color: #1a1a1a; }
    
    .rcpt-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 16px 0; 
    }
    
    .rcpt-table th, 
    .rcpt-table td { 
      border-bottom: 1px solid #e0e0e0; 
      padding: 10px 4px; 
      vertical-align: top;
    }
    
    .rcpt-table th { 
      text-align: left; 
      color: #444; 
      font-weight: 600; 
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .right { text-align: right; }
    
    .pill { 
      margin-left: 6px; 
      padding: 2px 8px; 
      font-size: 10px; 
      border: 1px solid #D4AF37; 
      border-radius: 12px; 
      color: #8B7355; 
      background: rgba(212, 175, 55, 0.1);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .rcpt-px { 
      margin: 12px 0; 
      text-align: right; 
      font-size: 15px;
      color: #666;
      border-top: 1px solid #e0e0e0;
      padding-top: 8px;
    }
    
    .rcpt-totals { 
      margin: 16px 0; 
      border-top: 2px solid #e0e0e0; 
      padding-top: 12px; 
    }
    
    .rcpt-totals > div { 
      display: flex; 
      justify-content: space-between; 
      margin: 4px 0; 
      padding: 2px 0;
    }
    
    .rcpt-totals .net { 
      border-top: 1px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 8px;
    }
    
    .rcpt-totals .net span:first-child { 
      font-weight: 700; 
      font-size: 16px;
    }
    
    .rcpt-totals .net span:last-child { 
      font-weight: 800; 
      font-size: 18px;
      color: #D4AF37; 
    }
    
    .rcpt-notes { 
      margin: 16px 0; 
      color: #666; 
      font-style: italic;
      padding: 12px;
      background: #f8f8f8;
      border-radius: 6px;
      border-left: 3px solid #D4AF37;
    }
    
    .rcpt-footer {
      margin-top: 24px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
    }
    
    .rcpt-footer > div:first-child {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    
    .rcpt-footer .fine {
      font-size: 11px;
      color: #666;
      line-height: 1.4;
    }

    @media print {
      @page { size: A4; margin: 15mm; }
      html, body { background: #fff !important; color: #000 !important; }
      .receipt { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="rcpt-header">
      <h1 class="rcpt-title">${escapeHtml(storeName)}</h1>
      <div class="rcpt-tag">${escapeHtml(tagline)}</div>
      <div class="rcpt-meta">${escapeHtml(contactInfo)}</div>
    </div>

    <div class="rcpt-info">
      <div><strong>Transaction #:</strong> ${sale.id.toString().padStart(6, '0')}</div>
      <div><strong>Date:</strong> ${formatDateTime(sale.sold_at)}</div>
      <div><strong>Customer:</strong> ${escapeHtml(sale.customer_name) || 'Walk-in'}</div>
      <div><strong>Payment:</strong> ${escapeHtml(sale.payment.charAt(0).toUpperCase() + sale.payment.slice(1))}</div>
      ${staff?.full_name ? `<div><strong>Served by:</strong> ${escapeHtml(staff.full_name)}</div>` : ''}
    </div>

    <table class="rcpt-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="right">Qty</th>
          <th class="right">Price</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    ${partExchangesHtml}

    <div class="rcpt-totals">
      <div><span>Subtotal:</span> <span>${formatCurrency(sale.subtotal)}</span></div>
      ${sale.discount_total > 0 ? `<div><span>Discount:</span> <span>-${formatCurrency(sale.discount_total)}</span></div>` : ''}
      ${sale.tax_total > 0 ? `<div><span>Tax:</span> <span>${formatCurrency(sale.tax_total)}</span></div>` : ''}
      ${pxTotal > 0 ? `<div><span>Part Exchange:</span> <span>-${formatCurrency(pxTotal)}</span></div>` : ''}
      <div class="net">
        <span>Net Total:</span>
        <span>${formatCurrency(netTotal)}</span>
      </div>
    </div>

    ${sale.notes ? `<div class="rcpt-notes">Notes: ${escapeHtml(sale.notes)}</div>` : ''}

    <div class="rcpt-footer">
      <div>Thank you for your purchase!</div>
      <div class="fine">
        This receipt is proof of purchase.<br>
        Please retain for your records.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
