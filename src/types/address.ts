/**
 * Saved delivery address domain model. `id` is the Mongo ObjectId as a
 * string — unlike `Order`, there's no natural customer-facing identifier
 * to use instead (no "address number"), so the Mongo id itself is the
 * reference the client uses for edit/delete/set-default.
 */
export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  landmark?: string | null;
  notes?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
