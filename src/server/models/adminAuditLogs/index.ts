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
export async function queryAuditLogsDB(q: {
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}): Promise<{ items: IAdminAuditLog[]; total: number }> {
  try {
    const filter: Record<string, unknown> = {};
    if (q.action) filter.action = q.action;
    if (q.userId) filter.userId = q.userId;
    if (q.from || q.to) {
      const createdAt: Record<string, Date> = {};
      if (q.from) createdAt.$gte = q.from;
      if (q.to) createdAt.$lte = q.to;
      filter.createdAt = createdAt;
    }
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = Math.min(q.limit && q.limit > 0 ? q.limit : 50, 200);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IAdminAuditLog[]>(),
      AdminAuditLog.countDocuments(filter),
    ]);
    return { items, total };
  } catch {
    return { items: [], total: 0 };
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
