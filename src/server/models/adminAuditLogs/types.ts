export interface IAdminAuditLog {
  _id: string;
  userId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  responseCode: number;
  durationMs: number;
  body?: unknown;
  createdAt: Date;
}
export interface IAuditCreateInput {
  userId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  responseCode: number;
  durationMs: number;
  body?: unknown;
}
