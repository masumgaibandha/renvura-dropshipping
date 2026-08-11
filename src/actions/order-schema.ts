import { z } from "zod";

import { isValidDistrictForDivision, isValidDivision, isValidUpazilaForDistrict } from "@/data/bangladesh-locations";
import { normalizeBdPhone } from "@/utils/phone";
import { MAX_QUANTITY_PER_ITEM, MAX_UNIQUE_ITEMS } from "./order-logic";

/**
 * Schema-validates the untrusted input to `createOrder` — the one place in
 * this app that genuinely needs a validation library (see
 * `src/lib/validate-product.ts`'s doc comment, which deliberately skipped
 * Zod for our own seed data and named "an admin product form" or similar
 * untrusted-input case as the bar for revisiting that; this is that case).
 */

const orderItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Missing product."),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(MAX_QUANTITY_PER_ITEM, `Quantity cannot exceed ${MAX_QUANTITY_PER_ITEM}.`),
});

const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeBdPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX)." });
      return z.NEVER;
    }
    return normalized;
  });

const optionalEmailSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => value === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Enter a valid email address.",
  });

function optionalTrimmed(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

/**
 * Division/District/Upazila are dependent selects in the UI, but the client
 * is never trusted to have kept them consistent — this re-validates the
 * whole combination against `src/data/bangladesh-locations.ts` (the same
 * dataset the UI's dropdowns read from), rejecting e.g. a Rangpur division
 * paired with a Dhaka district, or a Gaibandha district paired with a
 * Dhanmondi upazila.
 */
const shippingAddressSchema = z
  .object({
    division: z.string().trim().min(1, "Select a division."),
    district: z.string().trim().min(1, "Select a district."),
    upazila: z.string().trim().min(1, "Select an upazila/thana."),
    addressLine: z.string().trim().min(2, "Enter your address (area/road/house).").max(200, "Address is too long."),
    landmark: optionalTrimmed(200),
    notes: optionalTrimmed(500),
  })
  .superRefine((data, ctx) => {
    if (!isValidDivision(data.division)) {
      ctx.addIssue({ code: "custom", message: "Select a valid division.", path: ["division"] });
      return;
    }
    if (!isValidDistrictForDivision(data.division, data.district)) {
      ctx.addIssue({ code: "custom", message: "Select a district that belongs to the chosen division.", path: ["district"] });
      return;
    }
    if (!isValidUpazilaForDistrict(data.division, data.district, data.upazila)) {
      ctx.addIssue({ code: "custom", message: "Select an upazila/thana that belongs to the chosen district.", path: ["upazila"] });
    }
  });

export const orderInputSchema = z
  .object({
    items: z
      .array(orderItemInputSchema)
      .min(1, "Your cart is empty.")
      .max(MAX_UNIQUE_ITEMS, `A single order can contain at most ${MAX_UNIQUE_ITEMS} different products.`),
    customer: z.object({
      name: z.string().trim().min(2, "Enter your full name.").max(100, "Name is too long."),
      phone: phoneSchema,
      email: optionalEmailSchema,
    }),
    shippingAddress: shippingAddressSchema,
    payment: z.object({
      method: z.enum(["cash_on_delivery", "bkash", "nagad", "rocket"]),
      transactionId: optionalTrimmed(50),
    }),
    idempotencyKey: z.string().trim().min(10, "Missing idempotency key.").max(100),
  })
  .superRefine((data, ctx) => {
    if (data.payment.method !== "cash_on_delivery" && !data.payment.transactionId) {
      ctx.addIssue({
        code: "custom",
        message: "Enter the Transaction ID from your payment.",
        path: ["payment", "transactionId"],
      });
    }
  });

export type OrderInput = z.infer<typeof orderInputSchema>;

export const trackOrderInputSchema = z.object({
  orderNumber: z.string().trim().min(1, "Enter your order number."),
  phone: phoneSchema,
});

export type TrackOrderInput = z.infer<typeof trackOrderInputSchema>;
