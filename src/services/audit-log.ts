import { connectToDatabase } from "@/lib/db";
import { AdminAuditLogModel } from "@/models/AdminAuditLog";

/**
 * One helper, called from every mutating admin Server Action
 * (`src/actions/admin/*`) right after a write succeeds. `before`/`after`
 * should be small, hand-picked field snapshots (e.g. `{ orderStatus }`,
 * `{ sellingPrice, stock }`) — never a full Mongo document, and never
 * anything resembling a secret/token.
 */
export interface RecordAuditLogInput {
  adminUserId: string;
  action: string;
  entityType: "order" | "payment" | "product" | "category" | "inventory" | "homepage" | "settings";
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  await connectToDatabase();
  await AdminAuditLogModel.create({
    adminUserId: input.adminUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}
