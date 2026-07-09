import { queryAuditLogsDB } from "../../models/adminAuditLogs";
import type { IAdminAuditLog } from "../../models/adminAuditLogs/types";
import { getUserByIdDB } from "../../models/users";

export interface IAuditLogWithUser extends IAdminAuditLog {
  username: string;
}

export interface IQueryAuditLogsResult {
  items: IAuditLogWithUser[];
  total: number;
  page: number;
  limit: number;
}

export default async function queryAuditLogs(q: {
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}): Promise<IQueryAuditLogsResult> {
  const page = q.page && q.page > 0 ? q.page : 1;
  const limit = Math.min(q.limit && q.limit > 0 ? q.limit : 50, 200);
  const { items, total } = await queryAuditLogsDB({ ...q, page, limit });

  const uniqueIds = Array.from(
    new Set(items.map((i) => i.userId).filter((id): id is string => Boolean(id))),
  );
  const nameById = new Map<string, string>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      const user = await getUserByIdDB({ id });
      if (user) nameById.set(id, user.username);
    }),
  );

  const resolved: IAuditLogWithUser[] = items.map((item) => ({
    ...item,
    username: (item.userId && nameById.get(item.userId)) || "system",
  }));

  return { items: resolved, total, page, limit };
}
