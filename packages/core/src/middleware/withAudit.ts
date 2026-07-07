import type { THandler } from "../lib/handler";
import { getSessionUser } from "../lib/requestContext";
import { createAuditLogDB } from "../models/adminAuditLogs";

export interface IAuditOptions {
  action: string;
  targetType?: string;
  captureBody?: boolean;
}
function wrap(handler: THandler, options: IAuditOptions): THandler {
  return async (req) => {
    const start = process.hrtime.bigint();
    let body: unknown;
    if (options.captureBody) {
      try {
        body = await req.clone().json();
      } catch {
        body = undefined;
      }
    }
    const res = await handler(req);
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const session = getSessionUser();
    void createAuditLogDB({
      userId: session?.sub ?? null,
      action: options.action,
      targetType: options.targetType,
      responseCode: res.status,
      durationMs,
      body,
    });
    return res;
  };
}
export const auditAdmin = wrap;
export const auditUser = wrap;
