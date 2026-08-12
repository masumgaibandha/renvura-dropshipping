/**
 * Fallback defaults for `StoreSettings` (Phase 10) — only used the very
 * first time `getStoreSettings()` runs, before any document exists yet, so
 * the store has sane values with zero manual setup. Once the singleton
 * document exists, these are never consulted again; edit real values
 * through `/admin/settings/delivery`, not by changing this file.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
