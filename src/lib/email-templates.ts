import { paymentMethodLabels } from "@/config/payment";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderSummary } from "@/types/order";
import { formatBDT } from "@/utils/currency";

/**
 * Minimal, branded transactional email content — no marketing copy, no
 * internal IDs. `src/lib/email-provider.ts` is the only caller. Kept as
 * plain functions (not React email components) since there's a small,
 * fixed set of templates and no rendering library is otherwise used in
 * this project.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const WRAPPER_STYLE = "font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #11253C; max-width: 560px; margin: 0 auto;";
const CODE_STYLE =
  "font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #F7F1E5; color: #11253C; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 24px 0;";
const FOOTER_STYLE = "font-size: 12px; color: #6B7280; margin-top: 32px;";
const DEFAULT_FOOTER_NOTE = "If you didn't request this, you can safely ignore this email.";

function wrap(bodyHtml: string, footerNote: string = DEFAULT_FOOTER_NOTE): string {
  return `<div style="${WRAPPER_STYLE}"><h1 style="font-size: 20px;">Renvura</h1>${bodyHtml}<p style="${FOOTER_STYLE}">Renvura · https://renvura.com<br />${footerNote}</p></div>`;
}

export function verifyEmailTemplate({ otp }: { otp: string }): EmailContent {
  return {
    subject: "Verify your Renvura email",
    html: wrap(
      `<p>Enter this code to verify your email address:</p><div style="${CODE_STYLE}">${otp}</div><p>This code expires in 5 minutes.</p>`,
      "If you did not create a Renvura account, you can ignore this email.",
    ),
    text: `Verify your Renvura email\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not create a Renvura account, you can ignore this email.\n\nRenvura · https://renvura.com · hello@renvura.com`,
  };
}

export function resetPasswordTemplate({ otp }: { otp: string }): EmailContent {
  return {
    subject: "Reset your Renvura password",
    html: wrap(
      `<p>Enter this code to reset your password:</p><div style="${CODE_STYLE}">${otp}</div><p>This code expires in 5 minutes. If you requested it more than once, this same code was in every email — any of them will work.</p>`,
      "If you didn't request a password reset, you can safely ignore this email — your password will not be changed.",
    ),
    text: `Reset your Renvura password\n\nYour password reset code is: ${otp}\n\nThis code expires in 5 minutes. If you requested it more than once, this same code was in every email — any of them will work.\n\nIf you didn't request a password reset, you can safely ignore this email — your password will not be changed.\n\nRenvura · https://renvura.com · hello@renvura.com`,
  };
}

export function genericOtpTemplate({ otp }: { otp: string }): EmailContent {
  return {
    subject: "Your Renvura verification code",
    html: wrap(`<p>Your verification code is:</p><div style="${CODE_STYLE}">${otp}</div><p>This code expires in 5 minutes.</p>`),
    text: `Your Renvura verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nRenvura · https://renvura.com`,
  };
}

const TABLE_CELL_STYLE = "padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: left;";
const TABLE_CELL_RIGHT_STYLE = "padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;";

function formatOrderDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "Asia/Dhaka" }).format(new Date(isoDate));
}

/** Wording that never claims automatic payment confirmation — mirrors the checkout UI's own copy for these two states. */
function paymentStatusNote(order: OrderSummary): string {
  if (order.payment.method === "cash_on_delivery") {
    return "Payment will be collected on delivery.";
  }
  if (order.payment.status === "pending_verification") {
    return "Your payment information is awaiting verification.";
  }
  return "";
}

/**
 * `order` is the sanitized `OrderSummary` projection (`src/types/order.ts`)
 * — never the raw DB record, so `wholesalePrice`, the Mongo `_id`, the
 * `idempotencyKey`, `customerUserId`, `statusHistory`, and `notifications`
 * (Resend's own message id) are structurally impossible to leak here, not
 * just manually avoided. Orders remain `pending` until a staff member
 * manually confirms the order by phone/WhatsApp (see CLAUDE.md's "Manual
 * order confirmation workflow" — phone OTP verification is deferred) — the
 * subject line and body deliberately never say "confirmed."
 */
export function orderConfirmationTemplate(order: OrderSummary): EmailContent {
  const itemRows = order.items
    .map(
      (item) =>
        `<tr><td style="${TABLE_CELL_STYLE}">${item.titleSnapshot}</td><td style="${TABLE_CELL_RIGHT_STYLE}">${item.quantity}</td><td style="${TABLE_CELL_RIGHT_STYLE}">${formatBDT(item.unitPrice)}</td><td style="${TABLE_CELL_RIGHT_STYLE}">${formatBDT(item.lineTotal)}</td></tr>`,
    )
    .join("");

  const address = order.shippingAddress;
  const addressLines = [address.addressLine, address.landmark, `${address.upazila}, ${address.district}, ${address.division}`].filter(Boolean).join("<br />");

  const note = paymentStatusNote(order);

  const html = wrap(`
    <p>Thank you for your order, ${order.customer.name}.</p>
    <p>We'll be in touch by phone or WhatsApp shortly to confirm the details before it ships.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 4px 0;"><strong>Order Number</strong></td><td style="padding: 4px 0; text-align: right;">${order.orderNumber}</td></tr>
      <tr><td style="padding: 4px 0;"><strong>Order Date</strong></td><td style="padding: 4px 0; text-align: right;">${formatOrderDate(order.createdAt)}</td></tr>
      <tr><td style="padding: 4px 0;"><strong>Status</strong></td><td style="padding: 4px 0; text-align: right;">${ORDER_STATUS_LABELS[order.orderStatus]}</td></tr>
    </table>
    <table style="width: 100%; border-collapse: collapse;">
      <thead><tr><th style="${TABLE_CELL_STYLE}">Item</th><th style="${TABLE_CELL_RIGHT_STYLE}">Qty</th><th style="${TABLE_CELL_RIGHT_STYLE}">Unit Price</th><th style="${TABLE_CELL_RIGHT_STYLE}">Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
      <tr><td style="padding: 4px 0;">Subtotal</td><td style="padding: 4px 0; text-align: right;">${formatBDT(order.pricing.subtotal)}</td></tr>
      <tr><td style="padding: 4px 0;">Delivery Charge</td><td style="padding: 4px 0; text-align: right;">${formatBDT(order.pricing.deliveryFee)}</td></tr>
      <tr><td style="padding: 8px 0 4px; font-weight: 700;">Total</td><td style="padding: 8px 0 4px; text-align: right; font-weight: 700;">${formatBDT(order.pricing.total)}</td></tr>
    </table>
    <p><strong>Payment Method:</strong> ${paymentMethodLabels[order.payment.method]}<br />
    <strong>Payment Status:</strong> ${PAYMENT_STATUS_LABELS[order.payment.status]}${note ? `<br />${note}` : ""}</p>
    <p><strong>Delivery Address</strong><br />${addressLines}</p>
    <p>Track your order any time at <a href="https://renvura.com/track-order">renvura.com/track-order</a>.</p>
    <p>Questions? Contact us at hello@renvura.com.</p>
  `, "Didn't place this order? Contact hello@renvura.com and we'll help sort it out.");

  const text = [
    `Thank you for your order, ${order.customer.name}.`,
    `We'll be in touch by phone or WhatsApp shortly to confirm the details before it ships.`,
    ``,
    `Order Number: ${order.orderNumber}`,
    `Order Date: ${formatOrderDate(order.createdAt)}`,
    `Status: ${ORDER_STATUS_LABELS[order.orderStatus]}`,
    ``,
    ...order.items.map((item) => `${item.titleSnapshot} x${item.quantity} — ${formatBDT(item.lineTotal)}`),
    ``,
    `Subtotal: ${formatBDT(order.pricing.subtotal)}`,
    `Delivery Charge: ${formatBDT(order.pricing.deliveryFee)}`,
    `Total: ${formatBDT(order.pricing.total)}`,
    ``,
    `Payment Method: ${paymentMethodLabels[order.payment.method]}`,
    `Payment Status: ${PAYMENT_STATUS_LABELS[order.payment.status]}`,
    ...(note ? [note] : []),
    ``,
    `Delivery Address:`,
    addressLines.replace(/<br \/>/g, "\n"),
    ``,
    `Track your order any time at https://renvura.com/track-order`,
    `Questions? Contact us at hello@renvura.com`,
    ``,
    `Renvura · https://renvura.com`,
  ].join("\n");

  return { subject: `Renvura Order Received — ${order.orderNumber}`, html, text };
}
