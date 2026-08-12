import { cache } from "react";

import { deliveryFees as fallbackDeliveryFees } from "@/config/delivery";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/config/store";
import { connectToDatabase } from "@/lib/db";
import { StoreSettingsModel } from "@/models/StoreSettings";

/**
 * Data-access layer for the Phase 10 `StoreSettings` singleton. Reads are
 * wrapped in React's `cache()` so a single request only ever queries once
 * even if both checkout and its `OrderSummary` sub-tree call this. Writes
 * go through `updateStoreSettings` only — every caller (Server Actions)
 * is responsible for its own `requireAdmin()` check first; this file has
 * no authorization logic of its own, matching `src/services/orders.ts`/
 * `addresses.ts`'s existing split.
 */

export interface StoreSettings {
  storeName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  insideDhakaDeliveryFee: number;
  outsideDhakaDeliveryFee: number;
  lowStockThreshold: number;
  updatedAt: string;
}

interface StoreSettingsLeanDoc {
  storeName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  insideDhakaDeliveryFee: number;
  outsideDhakaDeliveryFee: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

function toStoreSettings(doc: StoreSettingsLeanDoc): StoreSettings {
  return {
    storeName: doc.storeName,
    supportEmail: doc.supportEmail,
    supportPhone: doc.supportPhone,
    insideDhakaDeliveryFee: doc.insideDhakaDeliveryFee,
    outsideDhakaDeliveryFee: doc.outsideDhakaDeliveryFee,
    lowStockThreshold: doc.lowStockThreshold,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Upserts the singleton into existence (with fallback defaults) on first call — no separate seed step needed. */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  await connectToDatabase();
  const doc = await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: "store" },
    {
      $setOnInsert: {
        singletonKey: "store",
        storeName: "Renvura",
        supportEmail: null,
        supportPhone: null,
        insideDhakaDeliveryFee: fallbackDeliveryFees.insideDhaka,
        outsideDhakaDeliveryFee: fallbackDeliveryFees.outsideDhaka,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean<StoreSettingsLeanDoc>();
  return toStoreSettings(doc);
});

/** Convenience accessor for the one thing `calculateDeliveryFee` needs — avoids every caller destructuring the full settings object. */
export async function getDeliveryFees(): Promise<{ insideDhaka: number; outsideDhaka: number }> {
  const settings = await getStoreSettings();
  return { insideDhaka: settings.insideDhakaDeliveryFee, outsideDhaka: settings.outsideDhakaDeliveryFee };
}

export interface StoreSettingsInput {
  storeName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  insideDhakaDeliveryFee: number;
  outsideDhakaDeliveryFee: number;
  lowStockThreshold: number;
}

export async function updateStoreSettings(input: StoreSettingsInput): Promise<StoreSettings> {
  await connectToDatabase();
  const doc = await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: "store" },
    { $set: input },
    { upsert: true, returnDocument: "after" },
  ).lean<StoreSettingsLeanDoc>();
  return toStoreSettings(doc);
}
