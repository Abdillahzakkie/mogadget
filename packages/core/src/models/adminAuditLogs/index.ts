import mongoose, { type Model } from "mongoose";
import type { IAdminAuditLog, IAuditCreateInput } from "./types";

const AuditSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    action: { type: String, required: true },
    targetType: String,
    targetId: String,
    responseCode: Number,
    durationMs: Number,
    body: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "admin_audit_logs" },
);
export const AdminAuditLog: Model<IAdminAuditLog> =
  (mongoose.models.AdminAuditLog as Model<IAdminAuditLog>) ||
  mongoose.model<IAdminAuditLog>("AdminAuditLog", AuditSchema);

export async function createAuditLogDB(input: IAuditCreateInput): Promise<void> {
  try {
    await AdminAuditLog.create([input]);
  } catch {
    /* audit is best-effort */
  }
}
export async function listAuditLogsDB({
  limit = 100,
}: {
  limit?: number;
} = {}): Promise<IAdminAuditLog[]> {
  try {
    return await AdminAuditLog.find().sort({ createdAt: -1 }).limit(limit).lean<IAdminAuditLog[]>();
  } catch {
    return [];
  }
}
export default AdminAuditLog;
export * from "./types";
