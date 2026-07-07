import type { IResponseData } from "@mogadget/contracts/types";
import { ErrInternal, isSentinel } from "../constants/errors";
import { getLogger } from "./logger";

export interface IEnvelope<T = unknown> {
  status: number;
  body: IResponseData<T>;
  headers?: Record<string, string>;
}
export function ok<T>(data: T, message = "OK"): IEnvelope<T> {
  return { status: 200, body: { code: 200, message, data } };
}
export function created<T>(data: T, message = "Created"): IEnvelope<T> {
  return { status: 201, body: { code: 201, message, data } };
}
export function fail(code: number, message: string): IEnvelope<null> {
  return { status: code, body: { code, message, data: null } };
}
export function handleError(err: unknown): IEnvelope<null> {
  if (isSentinel(err)) return fail(err.code, err.message);
  getLogger().error({ err }, "unhandled handler error");
  return fail(ErrInternal.code, ErrInternal.message);
}
