export interface ISentinel {
  readonly code: number;
  readonly message: string;
  readonly __sentinel: true;
}
const s = (code: number, message: string): ISentinel => ({ code, message, __sentinel: true });

export const ErrInvalidJson = s(400, "Invalid JSON body");
export const ErrInvalidFields = s(400, "Invalid or missing fields");
export const ErrUnauthenticated = s(401, "Authentication required");
export const ErrUnauthorized = s(403, "Not permitted");
export const ErrNotFound = s(404, "Not found");
export const ErrConflict = s(409, "Conflict");
export const ErrRateLimited = s(429, "Too many requests");
export const ErrInternal = s(500, "Internal error");

export function isSentinel(e: unknown): e is ISentinel {
  return typeof e === "object" && e !== null && (e as ISentinel).__sentinel === true;
}
