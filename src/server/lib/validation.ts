import type { infer as ZodInfer, ZodTypeAny } from "zod";
import { ErrInvalidFields, ErrInvalidJson } from "../constants/errors";

export async function validateBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
  opts?: { patch?: boolean },
): Promise<ZodInfer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw ErrInvalidJson;
  }
  if (opts?.patch && raw && typeof raw === "object" && "patch" in (raw as object)) {
    raw = (raw as { patch: unknown }).patch;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw ErrInvalidFields;
  return parsed.data;
}
export function parseOrThrow<S extends ZodTypeAny>(schema: S, data: unknown): ZodInfer<S> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw ErrInvalidFields;
  return parsed.data;
}
