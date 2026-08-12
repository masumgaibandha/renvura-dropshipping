import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Lightweight audit trail for high-value admin mutations (Phase 10) —
 * order status changes, payment verification, product price/stock edits.
 * Append-only: nothing in `src/actions/admin/*` ever updates or deletes a
 * log entry. `before`/`after` are deliberately narrow, hand-picked field
 * snapshots (e.g. `{ orderStatus: "confirmed" }`), never a full document
 * dump — see each call site for what's actually recorded. Never stores
 * secrets/tokens.
 */
const adminAuditLogSchema = new Schema(
  {
    adminUserId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditLogSchema.index({ createdAt: -1 });

export type AdminAuditLogDocument = InferSchemaType<typeof adminAuditLogSchema>;

export const AdminAuditLogModel: Model<AdminAuditLogDocument> =
  models.AdminAuditLog ?? model<AdminAuditLogDocument>("AdminAuditLog", adminAuditLogSchema);
