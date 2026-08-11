/**
 * The 8 official Bangladesh divisions — real, stable public administrative
 * fact (not invented business data), so safe to hardcode unlike a price or
 * policy. District/Upazila/Thana are deliberately left as free-text inputs
 * on the checkout form rather than a hardcoded 64-district/~495-upazila
 * mapping, since a mapping that large can't be fully verified here and an
 * incomplete/wrong one would be worse than a clean text field.
 */
export const bangladeshDivisions = [
  "Barishal",
  "Chattogram",
  "Dhaka",
  "Khulna",
  "Mymensingh",
  "Rajshahi",
  "Rangpur",
  "Sylhet",
] as const;

export type BangladeshDivision = (typeof bangladeshDivisions)[number];

export function isKnownDivision(value: string): value is BangladeshDivision {
  return (bangladeshDivisions as readonly string[]).includes(value);
}
