import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Admin email for testing - all emails go here during development
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@example.com";
// When true, sends to admin email instead of customer (test mode)
const TEST_MODE = Deno.env.get("EMAIL_TEST_MODE") !== "false";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface PartExchange {
  title: string;
  allowance: number;
}

interface ReceiptEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  saleId: number;
  saleDate: string;
  items: ReceiptItem[];
  partExchanges?: PartExchange[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  customMessage?: string;
}

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function generateReceiptHtml(data: ReceiptEmailRequest): string {
  const pxTotal = data.partExchanges?.reduce((sum, px) => sum + px.allowance, 0) || 0;
  const netTotal = data.total - pxTotal;

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
    </tr>
    ${item.discount && item.discount > 0 ? `
    <tr>
      <td colspan="3" style="padding: 4px 0 8px 16px; color: #dc2626; font-size: 12px;">Discount</td>
      <td style="padding: 4px 0 8px 0; text-align: right; color: #dc2626; font-size: 12px;">-${formatCurrency(item.discount)}</td>
    </tr>
    ` : ''}
  `).join('');

  const partExchangesHtml = data.partExchanges?.map(px => `
    <tr>
      <td colspan="3" style="padding: 8px 0; border-bottom: 1px solid #eee;">Part Exchange - ${px.title}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">-${formatCurrency(px.allowance)}</td>
    </tr>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt #${data.saleId}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <img src="https://qthosixbvinxmmjdfuii.supabase.co/storage/v1/object/public/assets/new-logo-cropped.png" alt="Sourced Jewellers" width="280" style="height: auto; max-width: 280px; display: block; margin: 0 auto 12px auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="color: #6b7280; font-size: 14px;">123 High Street, London SW1A 1AA</td>
          </tr>
          <tr>
            <td align="center" style="color: #6b7280; font-size: 14px;">Tel: 020 7123 4567</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        ${data.customMessage ? `
        <!-- Personal Message -->
        <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px; white-space: pre-wrap;">${data.customMessage}</p>
        </div>
        ` : ''}

        <!-- Receipt Info -->
        <div style="margin-bottom: 24px;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #6b7280;">Receipt #:</td>
              <td style="text-align: right; font-family: monospace;">${data.saleId}</td>
            </tr>
            <tr>
              <td style="color: #6b7280;">Date:</td>
              <td style="text-align: right;">${new Date(data.saleDate).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</td>
            </tr>
            ${data.recipientName ? `
            <tr>
              <td style="color: #6b7280;">Customer:</td>
              <td style="text-align: right;">${data.recipientName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #6b7280;">Payment:</td>
              <td style="text-align: right;">${data.paymentMethod}</td>
            </tr>
          </table>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <!-- Items -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Items</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 8px 0; text-align: left; color: #6b7280; font-weight: 500;">Item</th>
                <th style="padding: 8px 0; text-align: center; color: #6b7280; font-weight: 500;">Qty</th>
                <th style="padding: 8px 0; text-align: right; color: #6b7280; font-weight: 500;">Price</th>
                <th style="padding: 8px 0; text-align: right; color: #6b7280; font-weight: 500;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${partExchangesHtml}
            </tbody>
          </table>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <!-- Totals -->
        <div style="margin-bottom: 24px;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Subtotal:</td>
              <td style="padding: 4px 0; text-align: right;">${formatCurrency(data.subtotal)}</td>
            </tr>
            ${pxTotal > 0 ? `
            <tr>
              <td style="padding: 4px 0; color: #dc2626;">Part Exchange:</td>
              <td style="padding: 4px 0; text-align: right; color: #dc2626;">-${formatCurrency(pxTotal)}</td>
            </tr>
            ` : ''}
            ${data.discountTotal > 0 ? `
            <tr>
              <td style="padding: 4px 0; color: #dc2626;">Discount:</td>
              <td style="padding: 4px 0; text-align: right; color: #dc2626;">-${formatCurrency(data.discountTotal)}</td>
            </tr>
            ` : ''}
            ${data.taxTotal > 0 ? `
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Tax:</td>
              <td style="padding: 4px 0; text-align: right;">${formatCurrency(data.taxTotal)}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2"><hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;"></td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; font-size: 16px;">Net Total:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; font-size: 16px;">${formatCurrency(netTotal)}</td>
            </tr>
          </table>
        </div>

        ${data.notes ? `
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Notes:</h4>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">${data.notes}</p>
        </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <!-- Footer -->
        <div style="text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 4px 0;">Thank you for your business!</p>
          <p style="margin: 0;">Please retain this receipt for your records.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return errorResponse("Email service not configured", 500);
  }

  try {
    const data: ReceiptEmailRequest = await req.json();

    // Validate required fields
    if (!data.recipientEmail || !data.saleId) {
      return errorResponse("Missing required fields: recipientEmail and saleId");
    }

    // Determine actual recipient based on test mode
    const actualRecipient = TEST_MODE ? ADMIN_EMAIL : data.recipientEmail;

    // Build subject with original recipient info if in test mode
    let subject = `Receipt for Sale #${data.saleId}`;
    if (TEST_MODE && data.recipientEmail !== ADMIN_EMAIL) {
      subject = `[To: ${data.recipientEmail}] ${subject}`;
    }

    // Generate HTML email
    const html = generateReceiptHtml(data);

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: TEST_MODE
          ? "Sourced Jewellers <onboarding@resend.dev>"
          : "Sourced Jewellers <receipts@yourdomain.com>",
        to: [actualRecipient],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      return errorResponse(`Failed to send email: ${error}`, 500);
    }

    const result = await res.json();

    return jsonResponse({
      success: true,
      messageId: result.id,
      testMode: TEST_MODE,
      sentTo: actualRecipient,
    });

  } catch (error) {
    console.error("Error sending receipt email:", error);
    return errorResponse(error.message || "Failed to send email", 500);
  }
});
