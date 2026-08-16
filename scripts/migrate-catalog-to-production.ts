import { CategoryModel } from "../src/models/Category";
import { InventoryMovementModel } from "../src/models/InventoryMovement";
import { OrderModel } from "../src/models/Order";
import { ProductModel } from "../src/models/Product";
import { connectProduction, connectSandbox } from "./lib/migration-db";

/**
 * Phase 22 — reusable, idempotent `renvura_sandbox` → production `renvura` catalog migration.
 *
 * Safety model:
 * - Dry-run by default. Real writes require the explicit `--apply` flag.
 * - Source/destination databases are asserted by `connectSandbox()`/`connectProduction()`
 *   (`scripts/lib/migration-db.ts`) — the script throws immediately if either resolves to the
 *   wrong database, before any query runs.
 * - Never touches `Order`, `User`/`Session`/`Account` (Better Auth), `InventoryMovement`, or
 *   `AdminAuditLog` collections — only ever opens `Product` and `Category` models on the
 *   production connection for writes. `Order`/`InventoryMovement` are opened READ-ONLY, solely to
 *   determine which products have real activity (see "operational field protection" below).
 * - Products are matched primarily by `slug` (the same value already used as the app-wide
 *   `Product.id` — see `src/services/products.ts`'s `toProduct()` — and what `Order.items[].
 *   productId`/`InventoryMovement.productId` already reference), with `supplier.provider` +
 *   `supplier.productId` as a secondary cross-check. A slug match and a supplier-id match that
 *   disagree (point at different production documents, or one exists without the other) is
 *   classified `POSSIBLE_CONFLICT` and is never auto-resolved.
 * - A matched product update only ever `$set`s catalog-owned fields (see `CATALOG_FIELD_PATHS`)
 *   and preserves the production document's own `_id`. Operational fields (`inventory.stock`,
 *   `inventory.unit`, `inventory.status`) are excluded from the update entirely whenever that
 *   product has any real `Order` or `InventoryMovement` activity in production — never blindly
 *   reset from sandbox. `--apply` refuses to run at all while any `POSSIBLE_CONFLICT` exists.
 * - Category migration is create-only: a sandbox category slug missing in production is created;
 *   an existing production category is never modified, matching the brief's "preserve existing
 *   production categories" requirement exactly.
 *
 * Usage:
 *   npx tsx scripts/migrate-catalog-to-production.ts            # dry run, zero writes
 *   npx tsx scripts/migrate-catalog-to-production.ts --apply     # real migration
 */

const APPLY = process.argv.includes("--apply");

/** Dot-paths considered catalog data — eligible to sync onto an existing, matched production product. Never includes `inventory.stock`/`inventory.unit`/`inventory.status` — see the module doc comment. */
const CATALOG_FIELD_PATHS = [
  "title",
  "shortDescription",
  "description",
  "category",
  "subcategory",
  "brand",
  "model",
  "sku",
  "pricing",
  "bulkPricing",
  "media",
  "inventory.shippingWeightGrams",
  "variants",
  "features",
  "specifications",
  "seo",
  "status",
  "tags",
  "featured",
  "source",
  "supplier",
] as const;

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

interface FieldDiff {
  path: string;
  sandboxValue: unknown;
  productionValue: unknown;
}

function diffCatalogFields(sandboxDoc: Record<string, unknown>, productionDoc: Record<string, unknown>): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const path of CATALOG_FIELD_PATHS) {
    const sandboxValue = getPath(sandboxDoc, path);
    const productionValue = getPath(productionDoc, path);
    if (!valuesEqual(sandboxValue, productionValue)) {
      diffs.push({ path, sandboxValue, productionValue });
    }
  }
  return diffs;
}

interface LeanProduct {
  _id: unknown;
  slug: string;
  supplier?: { provider?: string; productId?: string } | null;
  [key: string]: unknown;
}

interface LeanCategory {
  _id: unknown;
  slug: string;
  name: string;
  description: string | null;
  parentSlug: string | null;
  isActive: boolean;
  displayOrder: number;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (real production writes)" : "DRY RUN (zero writes)"}`);

  const sandbox = await connectSandbox();
  const production = await connectProduction();
  console.log(`Sandbox DB confirmed: ${sandbox.databaseName}`);
  console.log(`Production DB confirmed: ${production.databaseName}`);

  const SandboxProduct = sandbox.connection.model("Product", ProductModel.schema);
  const SandboxCategory = sandbox.connection.model("Category", CategoryModel.schema);
  const ProductionProduct = production.connection.model("Product", ProductModel.schema);
  const ProductionCategory = production.connection.model("Category", CategoryModel.schema);
  // Read-only — never written to. Used only to detect real activity for operational-field protection.
  const ProductionOrder = production.connection.model("Order", OrderModel.schema);
  const ProductionInventoryMovement = production.connection.model("InventoryMovement", InventoryMovementModel.schema);

  const [sandboxCategories, productionCategories, sandboxProducts, productionProducts] = (await Promise.all([
    SandboxCategory.find({}).lean(),
    ProductionCategory.find({}).lean(),
    SandboxProduct.find({}).lean(),
    ProductionProduct.find({}).lean(),
  ])) as unknown as [LeanCategory[], LeanCategory[], LeanProduct[], LeanProduct[]];

  const productionOrders = (await ProductionOrder.find({}, { "items.productId": 1 }).lean()) as unknown as { items?: { productId?: string }[] }[];
  const productIdsWithOrders = new Set<string>();
  for (const order of productionOrders) {
    for (const item of order.items ?? []) {
      if (item.productId) productIdsWithOrders.add(item.productId);
    }
  }
  const productionMovements = (await ProductionInventoryMovement.find({}, { productId: 1 }).lean()) as unknown as { productId?: string }[];
  const productIdsWithMovements = new Set<string>();
  for (const movement of productionMovements) {
    if (movement.productId) productIdsWithMovements.add(movement.productId);
  }

  // ---- Category comparison (create-only) ----
  const prodCategoryBySlug = new Map(productionCategories.map((c) => [c.slug, c]));
  const categoriesToCreate = sandboxCategories.filter((c) => !prodCategoryBySlug.has(c.slug));
  const categoriesUnchanged = sandboxCategories.filter((c) => prodCategoryBySlug.has(c.slug));
  const sandboxCategorySlugs = new Set(sandboxCategories.map((c) => c.slug));
  const productionOnlyCategories = productionCategories.filter((c) => !sandboxCategorySlugs.has(c.slug));

  // ---- Product comparison ----
  const prodProductBySlug = new Map(productionProducts.map((p) => [p.slug, p]));
  const prodProductBySupplierKey = new Map<string, LeanProduct>();
  for (const p of productionProducts) {
    if (p.supplier?.provider && p.supplier?.productId) {
      prodProductBySupplierKey.set(`${p.supplier.provider}:${p.supplier.productId}`, p);
    }
  }

  const same: string[] = [];
  const newInSandbox: LeanProduct[] = [];
  const changed: { slug: string; productionId: unknown; diffs: FieldDiff[]; hasActivity: boolean }[] = [];
  const possibleConflict: { slug: string; reason: string }[] = [];

  for (const sp of sandboxProducts) {
    const supplierKey = sp.supplier?.provider && sp.supplier?.productId ? `${sp.supplier.provider}:${sp.supplier.productId}` : null;
    const bySlug = prodProductBySlug.get(sp.slug) ?? null;
    const bySupplier = supplierKey ? (prodProductBySupplierKey.get(supplierKey) ?? null) : null;

    if (bySlug && bySupplier && String(bySlug._id) !== String(bySupplier._id)) {
      possibleConflict.push({ slug: sp.slug, reason: `slug matches production _id ${String(bySlug._id)} but supplier id matches a different production _id ${String(bySupplier._id)}` });
      continue;
    }
    if (!bySlug && bySupplier) {
      possibleConflict.push({ slug: sp.slug, reason: `no production product with this slug, but supplier id already exists on production product with slug "${bySupplier.slug}"` });
      continue;
    }

    if (!bySlug) {
      newInSandbox.push(sp);
      continue;
    }

    const diffs = diffCatalogFields(sp as unknown as Record<string, unknown>, bySlug as unknown as Record<string, unknown>);
    if (diffs.length === 0) {
      same.push(sp.slug);
    } else {
      const hasActivity = productIdsWithOrders.has(sp.slug) || productIdsWithMovements.has(sp.slug);
      changed.push({ slug: sp.slug, productionId: bySlug._id, diffs, hasActivity });
    }
  }

  const sandboxSlugs = new Set(sandboxProducts.map((p) => p.slug));
  const productionOnlyProducts = productionProducts.filter((p) => !sandboxSlugs.has(p.slug));

  // ---- Report ----
  console.log("\n=== CATEGORY COMPARISON ===");
  console.log(`SAME (already exist in production, will not be modified): ${categoriesUnchanged.length}`);
  console.log(`NEW_IN_SANDBOX (will be created): ${categoriesToCreate.length}`, categoriesToCreate.map((c) => c.slug));
  console.log(`PRODUCTION_ONLY (untouched): ${productionOnlyCategories.length}`, productionOnlyCategories.map((c) => c.slug));

  console.log("\n=== PRODUCT COMPARISON ===");
  console.log(`SAME: ${same.length}`);
  console.log(`NEW_IN_SANDBOX (will be created): ${newInSandbox.length}`);
  console.log(`CHANGED (will be updated, catalog fields only): ${changed.length}`);
  const changedWithActivity = changed.filter((c) => c.hasActivity);
  console.log(`  of which have real order/inventory-movement activity in production (operational fields protected): ${changedWithActivity.length}`);
  console.log(`POSSIBLE_CONFLICT (will NOT be applied, needs manual review): ${possibleConflict.length}`);
  for (const c of possibleConflict) console.log(`  - ${c.slug}: ${c.reason}`);
  console.log(`PRODUCTION_ONLY (untouched): ${productionOnlyProducts.length}`, productionOnlyProducts.map((p) => p.slug));

  console.log("\n=== CHANGED DETAIL ===");
  for (const c of changed) {
    console.log(`- ${c.slug} (activity: ${c.hasActivity}): ${c.diffs.map((d) => d.path).join(", ")}`);
  }

  if (!APPLY) {
    console.log("\nDRY RUN complete — zero writes performed.");
    await sandbox.connection.close();
    await production.connection.close();
    return;
  }

  if (possibleConflict.length > 0) {
    console.error(`\nRefusing to apply: ${possibleConflict.length} POSSIBLE_CONFLICT record(s) require manual review first. No writes performed.`);
    await sandbox.connection.close();
    await production.connection.close();
    process.exit(1);
  }

  console.log("\n=== APPLYING ===");

  let categoriesCreated = 0;
  for (const c of categoriesToCreate) {
    await ProductionCategory.create({
      slug: c.slug,
      name: c.name,
      description: c.description,
      parentSlug: c.parentSlug,
      isActive: c.isActive,
      displayOrder: c.displayOrder,
    });
    categoriesCreated += 1;
  }
  console.log(`Categories created: ${categoriesCreated}`);

  let productsCreated = 0;
  for (const sp of newInSandbox) {
    // Deliberately drop the sandbox document's own _id/createdAt/updatedAt/__v — production must
    // assign its own _id and timestamps for a genuinely new document, never inherit sandbox's.
    const rest = { ...(sp as Record<string, unknown>) };
    delete rest._id;
    delete rest.createdAt;
    delete rest.updatedAt;
    delete rest.__v;
    await ProductionProduct.create(rest);
    productsCreated += 1;
  }
  console.log(`Products created: ${productsCreated}`);

  let productsUpdated = 0;
  for (const c of changed) {
    const setObj: Record<string, unknown> = {};
    for (const diff of c.diffs) {
      setObj[diff.path] = diff.sandboxValue;
    }
    await ProductionProduct.updateOne({ _id: c.productionId }, { $set: setObj });
    productsUpdated += 1;
  }
  console.log(`Products updated: ${productsUpdated}`);

  console.log("\nAPPLY complete.");
  await sandbox.connection.close();
  await production.connection.close();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
