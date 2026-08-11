import { z } from "zod";

import { checkBangladeshLocationRelationship } from "@/lib/bangladesh-address-validation";
import { normalizeBdPhone } from "@/utils/phone";

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

function optionalTrimmed(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const addressInputSchema = z
  .object({
    label: z.string().trim().min(1, "Enter a label (e.g. Home, Office).").max(50, "Label is too long."),
    recipientName: z.string().trim().min(2, "Enter the recipient's name.").max(100, "Name is too long."),
    phone: phoneSchema,
    division: z.string().trim().min(1, "Select a division."),
    district: z.string().trim().min(1, "Select a district."),
    upazila: z.string().trim().min(1, "Select an upazila/thana."),
    addressLine: z.string().trim().min(2, "Enter your address (area/road/house).").max(200, "Address is too long."),
    landmark: optionalTrimmed(200),
    notes: optionalTrimmed(500),
    isDefault: z.boolean(),
  })
  .superRefine(checkBangladeshLocationRelationship);

export type AddressFormInput = z.infer<typeof addressInputSchema>;

export const addressIdSchema = z.string().trim().min(1, "Missing address id.");
