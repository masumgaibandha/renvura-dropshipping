"use server";

import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  clearOtherDefaults,
  deleteAddressDoc,
  getAddressesForUser,
  getAddressForUser,
  insertAddress,
  setAddressAsDefault,
  updateAddressDoc,
} from "@/services/addresses";
import type { Address } from "@/types/address";
import { addressIdSchema, addressInputSchema } from "./address-schema";

/**
 * Saved-address Server Actions. Every one derives the owning user from the
 * authenticated session (`getCurrentUser()`) — there is no `userId`
 * parameter anywhere in these signatures for a client to supply or tamper
 * with. Update/delete/set-default all re-fetch the address scoped to
 * `{ id, userId }` first; a mismatch (wrong owner, or a made-up id) is
 * treated identically to "not found" so a caller can't distinguish
 * "doesn't exist" from "belongs to someone else."
 */

export type AddressResult = { ok: true; address: Address } | { ok: false; error: string; fieldErrors?: Record<string, string> };
export type DeleteAddressResult = { ok: true } | { ok: false; error: string };

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createAddress(rawInput: unknown): Promise<AddressResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to save an address." };
  }
  if (!checkRateLimit(`address:${user.id}`, RATE_LIMIT)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = addressInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const existing = await getAddressesForUser(user.id);
  const shouldBeDefault = parsed.data.isDefault || existing.length === 0;
  if (shouldBeDefault) {
    await clearOtherDefaults(user.id);
  }

  const address = await insertAddress(user.id, { ...parsed.data, isDefault: shouldBeDefault });
  return { ok: true, address };
}

export async function updateAddress(rawAddressId: unknown, rawInput: unknown): Promise<AddressResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to update an address." };
  }
  if (!checkRateLimit(`address:${user.id}`, RATE_LIMIT)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const idParsed = addressIdSchema.safeParse(rawAddressId);
  if (!idParsed.success) {
    return { ok: false, error: "Address not found." };
  }

  const existing = await getAddressForUser(idParsed.data, user.id);
  if (!existing) {
    return { ok: false, error: "Address not found." };
  }

  const parsed = addressInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  if (parsed.data.isDefault) {
    await clearOtherDefaults(user.id, idParsed.data);
  }

  const updated = await updateAddressDoc(idParsed.data, user.id, parsed.data);
  if (!updated) {
    return { ok: false, error: "Address not found." };
  }
  return { ok: true, address: updated };
}

export async function deleteAddress(rawAddressId: unknown): Promise<DeleteAddressResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to delete an address." };
  }
  if (!checkRateLimit(`address:${user.id}`, RATE_LIMIT)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const idParsed = addressIdSchema.safeParse(rawAddressId);
  if (!idParsed.success) {
    return { ok: false, error: "Address not found." };
  }

  const deleted = await deleteAddressDoc(idParsed.data, user.id);
  if (!deleted) {
    return { ok: false, error: "Address not found." };
  }
  return { ok: true };
}

export async function setDefaultAddress(rawAddressId: unknown): Promise<AddressResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to update an address." };
  }
  if (!checkRateLimit(`address:${user.id}`, RATE_LIMIT)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const idParsed = addressIdSchema.safeParse(rawAddressId);
  if (!idParsed.success) {
    return { ok: false, error: "Address not found." };
  }

  const existing = await getAddressForUser(idParsed.data, user.id);
  if (!existing) {
    return { ok: false, error: "Address not found." };
  }

  await clearOtherDefaults(user.id, idParsed.data);
  const updated = await setAddressAsDefault(idParsed.data, user.id);
  if (!updated) {
    return { ok: false, error: "Address not found." };
  }
  return { ok: true, address: updated };
}
