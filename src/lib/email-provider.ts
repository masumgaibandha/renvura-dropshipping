import { Resend } from "resend";

import type { OrderSummary } from "@/types/order";
import { genericOtpTemplate, orderConfirmationTemplate, resetPasswordTemplate, verifyEmailTemplate, type EmailContent } from "./email-templates";

/**
 * Central, server-only transactional email module — Resend is the one and
 * only place that ever calls the provider (`sendEmail` below); every
 * higher-level function (`sendAccountEmail`, `sendOrderConfirmationEmail`)
 * builds an `EmailContent` and hands it there rather than calling Resend
 * itself. `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`/`EMAIL_REPLY_TO` are read
 * once here — never `NEXT_PUBLIC_*`, never imported anywhere else. See
 * CLAUDE.md's "Email verification & account recovery (Phase 10.5)" section
 * for the full design, including why `sendAccountEmail` deliberately never
 * throws.
 */

const DEFAULT_FROM = "Renvura <no-reply@renvura.com>";
const DEFAULT_REPLY_TO = "hello@renvura.com";

function fromAddress(): string {
  return process.env.EMAIL_FROM_ADDRESS?.trim() || DEFAULT_FROM;
}

function replyToAddress(): string {
  return process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_REPLY_TO;
}

export function isEmailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

let cachedClient: Resend | null = null;

function getResendClient(): Resend {
  if (!cachedClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set — checked by isEmailProviderConfigured() before this is ever called.");
    }
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

type SendResult = { ok: true; providerMessageId: string | null } | { ok: false; error: string };

/**
 * The one function that ever talks to Resend. Unconfigured + production →
 * fails closed, nothing sent, nothing faked. Unconfigured + dev → logs the
 * email content to the server console only (never returned to a client,
 * never a real send) so every flow is testable without a live Resend
 * account.
 */
async function sendEmail(to: string, content: EmailContent): Promise<SendResult> {
  if (!isEmailProviderConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV EMAIL] To: ${to} | Subject: ${content.subject}\n${content.text}`);
      return { ok: true, providerMessageId: null };
    }
    console.error(`sendEmail: RESEND_API_KEY is not set — could not send "${content.subject}".`);
    return { ok: false, error: "Email delivery is not configured." };
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: fromAddress(),
      to,
      replyTo: replyToAddress(),
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      console.error("sendEmail: Resend returned an error", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, providerMessageId: data?.id ?? null };
  } catch (error) {
    console.error("sendEmail: Resend request failed", error);
    return { ok: false, error: "Email delivery failed." };
  }
}

export type AccountEmailType = "sign-in" | "email-verification" | "forget-password" | "change-email";

export interface SendAccountEmailInput {
  to: string;
  otp: string;
  type: AccountEmailType;
}

function templateFor(type: AccountEmailType, otp: string): EmailContent {
  if (type === "email-verification") return verifyEmailTemplate({ otp });
  if (type === "forget-password") return resetPasswordTemplate({ otp });
  // "sign-in"/"change-email" OTP types aren't enabled by this app's Better Auth config
  // (no email-OTP sign-in, no change-email flow) — kept only so this stays exhaustive.
  return genericOtpTemplate({ otp });
}

/**
 * Called directly by Better Auth's `emailOTP` plugin (`src/lib/auth.ts`) —
 * signature matches its `sendVerificationOTP` callback exactly. Deliberately
 * never throws: `/email-otp/request-password-reset` (Better Auth's own
 * endpoint) only reaches this function when a real account exists —
 * throwing here would surface as a different HTTP response than the
 * "no such account" case and leak account existence. A delivery failure is
 * logged server-side (visible in deploy logs immediately) instead, without
 * ever changing what the client sees.
 */
export async function sendAccountEmail({ to, otp, type }: SendAccountEmailInput): Promise<void> {
  await sendEmail(to, templateFor(type, otp));
}

export interface SendOrderConfirmationEmailInput {
  to: string;
  order: OrderSummary;
}

export type SendOrderConfirmationEmailResult = { status: "sent"; providerMessageId: string | null } | { status: "failed"; lastError: string };

/**
 * Called from `createOrder`'s `after()` callback (`src/actions/orders.ts`)
 * — runs after the order-creation response has already been sent, so a
 * failure here can never affect what the customer sees or roll back the
 * order. Returns (rather than throws) the outcome so the caller can record
 * it via `recordOrderConfirmationEmailResult` (`src/services/orders.ts`).
 */
export async function sendOrderConfirmationEmail({ to, order }: SendOrderConfirmationEmailInput): Promise<SendOrderConfirmationEmailResult> {
  const result = await sendEmail(to, orderConfirmationTemplate(order));
  if (!result.ok) {
    return { status: "failed", lastError: result.error };
  }
  return { status: "sent", providerMessageId: result.providerMessageId };
}
