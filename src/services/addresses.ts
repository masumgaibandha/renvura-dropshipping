import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { AddressModel } from "@/models/Address";
import type { Address } from "@/types/address";

/**
 * Address data-access layer — mirrors `src/services/orders.ts`'s role.
 * Every function that touches the DB calls `connectToDatabase()` itself.
 * `userId` is a required parameter on every ownership-sensitive read/write
 * here; callers (`src/actions/addresses.ts`) always derive it from the
 * authenticated session, never from client input.
 */

interface AddressLeanDoc {
  _id: Types.ObjectId;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  landmark: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toAddress(doc: AddressLeanDoc): Address {
  return {
    id: doc._id.toString(),
    label: doc.label,
    recipientName: doc.recipientName,
    phone: doc.phone,
    division: doc.division,
    district: doc.district,
    upazila: doc.upazila,
    addressLine: doc.addressLine,
    landmark: doc.landmark,
    notes: doc.notes,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function getAddressesForUser(userId: string): Promise<Address[]> {
  await connectToDatabase();
  const docs = await AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean<AddressLeanDoc[]>();
  return docs.map(toAddress);
}

/** Ownership-scoped read — returns `null` for a nonexistent id, a malformed id, or an id that belongs to a different user. */
export async function getAddressForUser(id: string, userId: string): Promise<Address | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  await connectToDatabase();
  const doc = await AddressModel.findOne({ _id: id, userId }).lean<AddressLeanDoc>();
  return doc ? toAddress(doc) : null;
}

export interface AddressInput {
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  landmark?: string;
  notes?: string;
  isDefault: boolean;
}

export async function insertAddress(userId: string, input: AddressInput): Promise<Address> {
  await connectToDatabase();
  const doc = await AddressModel.create({
    userId,
    label: input.label,
    recipientName: input.recipientName,
    phone: input.phone,
    division: input.division,
    district: input.district,
    upazila: input.upazila,
    addressLine: input.addressLine,
    landmark: input.landmark ?? null,
    notes: input.notes ?? null,
    isDefault: input.isDefault,
  });
  return toAddress(doc.toObject() as AddressLeanDoc);
}

export async function updateAddressDoc(id: string, userId: string, input: AddressInput): Promise<Address | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  await connectToDatabase();
  const doc = await AddressModel.findOneAndUpdate(
    { _id: id, userId },
    {
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      division: input.division,
      district: input.district,
      upazila: input.upazila,
      addressLine: input.addressLine,
      landmark: input.landmark ?? null,
      notes: input.notes ?? null,
      isDefault: input.isDefault,
    },
    { returnDocument: "after" },
  ).lean<AddressLeanDoc>();
  return doc ? toAddress(doc) : null;
}

/** Returns `true` only if an address matching both `id` and `userId` was actually deleted. */
export async function deleteAddressDoc(id: string, userId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) {
    return false;
  }
  await connectToDatabase();
  const result = await AddressModel.deleteOne({ _id: id, userId });
  return result.deletedCount > 0;
}

/** Unsets `isDefault` on every other address for this user — call before setting a new default. */
export async function clearOtherDefaults(userId: string, exceptId?: string): Promise<void> {
  await connectToDatabase();
  const filter = exceptId ? { userId, isDefault: true, _id: { $ne: exceptId } } : { userId, isDefault: true };
  await AddressModel.updateMany(filter, { isDefault: false });
}

/** Marks one address as the default without needing the caller to resupply every other field. */
export async function setAddressAsDefault(id: string, userId: string): Promise<Address | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  await connectToDatabase();
  const doc = await AddressModel.findOneAndUpdate({ _id: id, userId }, { isDefault: true }, { returnDocument: "after" }).lean<AddressLeanDoc>();
  return doc ? toAddress(doc) : null;
}
