import type { ZodSchema } from "zod";
import { ErrInvalidFields, ErrInvalidJson } from "../constants/errors";

export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>,
  opts?: { patch?: boolean },
): Promise<T> {
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
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw ErrInvalidFields;
  return parsed.data;
}
