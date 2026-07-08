import { AsyncLocalStorage } from "node:async_hooks";
import type { ISessionPayload } from "./session";

export interface IQueuedCookie {
  name: string;
  value: string;
  maxAge: number;
}
export interface IRequestContext {
  session: ISessionPayload | null;
  requestId: string;
  cookies: IQueuedCookie[];
  // Resolved once by the HTTP adapter (socket address + TRUST_PROXY policy) so downstream
  // middleware never has to re-derive it from spoofable headers.
  clientIp?: string;
}
const als = new AsyncLocalStorage<IRequestContext>();

export function runWithRequestContext<T>(ctx: IRequestContext, fn: () => Promise<T>): Promise<T> {
  return als.run(ctx, fn);
}
export function getSessionUser(): ISessionPayload | null {
  return als.getStore()?.session ?? null;
}
export function getRequestId(): string {
  return als.getStore()?.requestId ?? "-";
}
export function getClientIp(): string | null {
  return als.getStore()?.clientIp ?? null;
}
export function issueSessionCookie(name: string, value: string, maxAge: number): void {
  als.getStore()?.cookies.push({ name, value, maxAge });
}
export function revokeSessionCookie(name: string): void {
  als.getStore()?.cookies.push({ name, value: "", maxAge: 0 });
}
export function getQueuedCookies(): IQueuedCookie[] {
  return als.getStore()?.cookies ?? [];
}
