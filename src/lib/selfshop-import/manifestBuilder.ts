import { classifySelfShopProduct } from "./classify";
import { findPotentialDuplicates, type TitledProduct } from "./duplicates";
import type { ClassificationResult, SelfShopImportManifestEntry, SelfShopRawProduct } from "./types";

/**
 * Bulk manifest builder (Phase 18) — the reusable logic behind
 * `scripts/build-selfshop-manifest.ts`. Pure and DB-free: `existingCatalogTitles` is an optional,
 * caller-supplied list (a CLI wrapper may read it once, read-only, from Mongo) so this module never
 * needs database access itself. Classifies every product independently and continues through
 * per-product failures — one broken entry never aborts the batch (see this phase's "generate an
 * exception report instead of stopping the batch" requirement).
 */

export interface BuildManifestResult {
  qualified: SelfShopImportManifestEntry[];
  exceptions: ClassificationResult[];
  potentialDuplicates: ReturnType<typeof findPotentialDuplicates>;
  exactDuplicatesWithinBatch: { productId: string; slugs: string[] }[];
  summary: {
    totalInput: number;
    byStatus: Record<string, number>;
    processingErrors: { sourceUrl: string; productId: string | null; error: string }[];
  };
}

export function buildSelfShopManifest(rawProducts: SelfShopRawProduct[], existingCatalogTitles: TitledProduct[] = []): BuildManifestResult {
  const qualified: SelfShopImportManifestEntry[] = [];
  const exceptions: ClassificationResult[] = [];
  const byStatus: Record<string, number> = {};
  const processingErrors: BuildManifestResult["summary"]["processingErrors"] = [];

  const seenProductIds = new Map<string, string[]>(); // productId -> slugs seen so far, for within-batch exact-duplicate detection

  for (const raw of rawProducts) {
    let result: ClassificationResult;
    try {
      result = classifySelfShopProduct(raw);
    } catch (error) {
      // A single malformed input entry must never abort the whole batch.
      processingErrors.push({ sourceUrl: raw?.sourceUrl ?? "unknown", productId: raw?.productId ?? null, error: error instanceof Error ? error.message : String(error) });
      continue;
    }

    byStatus[result.status] = (byStatus[result.status] ?? 0) + 1;

    if (result.status === "IMPORTABLE" || result.status === "IMPORTABLE_WITH_WARNINGS") {
      const entry = result.manifestEntry as SelfShopImportManifestEntry;
      qualified.push(entry);
      const slugs = seenProductIds.get(raw.productId) ?? [];
      slugs.push(entry.renvura.slug);
      seenProductIds.set(raw.productId, slugs);
    } else {
      exceptions.push(result);
    }
  }

  const exactDuplicatesWithinBatch = [...seenProductIds.entries()].filter(([, slugs]) => slugs.length > 1).map(([productId, slugs]) => ({ productId, slugs }));

  const candidateTitles: TitledProduct[] = qualified.map((e) => ({ slug: e.renvura.slug, title: e.supplierData.title }));
  const potentialDuplicates = findPotentialDuplicates(candidateTitles, existingCatalogTitles);

  return {
    qualified,
    exceptions,
    potentialDuplicates,
    exactDuplicatesWithinBatch,
    summary: {
      totalInput: rawProducts.length,
      byStatus,
      processingErrors,
    },
  };
}
