/**
 * Duplicate detection (Phase 18). Two tiers, deliberately kept separate:
 *
 * - Exact duplicates (same supplier provider+productId, same sourceUrl, or same slug) are handled
 *   by `importer.ts`'s `findExistingProduct()` against the live database — that check stays
 *   authoritative and untouched by this module.
 * - Potential duplicates (different SelfShop productId, but plausibly the *same physical item*) are
 *   reported here as a normalized-title/model-number similarity heuristic — for a human to review,
 *   never to auto-merge. This module is pure/DB-free so it can compare a batch's own titles against
 *   each other, or against a caller-supplied list of existing catalog titles (e.g. read once,
 *   read-only, by a CLI wrapper) without this module itself needing database access.
 */

export interface TitledProduct {
  slug: string;
  title: string;
}

export interface PotentialDuplicate {
  a: TitledProduct;
  b: TitledProduct;
  similarity: number;
  sharedTokens: string[];
}

const STOPWORDS = new Set([
  "the", "a", "an", "for", "with", "and", "or", "of", "true", "wireless", "portable",
  "rechargeable", "mini", "smart", "premium", "high", "speed", "digital", "display",
  "design", "quality", "new", "original", "genuine", "usb", "led", "mah", "size",
]);

/** Extracts lowercase alphanumeric tokens, dropping generic marketing stopwords — keeps distinctive words and model numbers (e.g. "x699", "vd-pb058"). */
export function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** A token that looks like a model/SKU number — mixed letters+digits, or digits with a unit suffix (e.g. "10000mah", "x699", "vd-pb058"). These are strong duplicate signals on their own. */
function isModelLikeToken(token: string): boolean {
  return /[a-z]/.test(token) && /\d/.test(token);
}

/**
 * Overlap coefficient (intersection / smaller set size), not Jaccard — deliberately chosen because
 * the real-world comparison is almost always a short, canonical existing catalog title (e.g.
 * "X699 Turbo Fan") against a long, verbose new supplier title (e.g. "X699 High Speed Portable
 * Rechargeable Turbo Fan Digital Display USB Handheld Mini Fan"). Jaccard punishes that size
 * mismatch even when the shorter title's tokens are entirely contained in the longer one; overlap
 * coefficient measures exactly "is the shorter title's content a subset of the longer one's."
 */
function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((x) => b.has(x));
  const smaller = Math.min(a.size, b.size);
  if (smaller === 0) return 0;
  return intersection.length / smaller;
}

/** Threshold above which two titles are reported as a potential duplicate. High enough that two same-brand-different-model products (e.g. two power banks from the same brand with different model numbers) don't collide, but low enough to catch a short canonical title fully contained in a longer supplier title. */
const SIMILARITY_THRESHOLD = 0.75;

/**
 * Compares every product against every other (within `candidates`, and optionally against
 * `existingCatalog`) and returns pairs whose normalized token sets overlap enough to warrant human
 * review. A shared model-like token (e.g. both titles contain "x699") alone is enough to flag a
 * pair, even below the general similarity threshold — a shared model number is a strong signal
 * even when the rest of the marketing copy differs.
 */
export function findPotentialDuplicates(candidates: TitledProduct[], existingCatalog: TitledProduct[] = []): PotentialDuplicate[] {
  const all = [...candidates, ...existingCatalog];
  const results: PotentialDuplicate[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < all.length; j++) {
      const a = candidates[i];
      const b = all[j];
      if (a.slug === b.slug) continue;
      // Avoid reporting the same within-`candidates` pair twice (a,b) and (b,a).
      if (j < candidates.length && j <= i) continue;

      const tokensA = new Set(tokenize(a.title));
      const tokensB = new Set(tokenize(b.title));
      const shared = [...tokensA].filter((t) => tokensB.has(t));
      const sharedModelTokens = shared.filter(isModelLikeToken);
      const similarity = overlapCoefficient(tokensA, tokensB);

      if (similarity >= SIMILARITY_THRESHOLD || sharedModelTokens.length > 0) {
        results.push({ a, b, similarity: Math.round(similarity * 100) / 100, sharedTokens: shared });
      }
    }
  }

  return results;
}
