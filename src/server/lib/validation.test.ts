import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseOrThrow, validateBody } from "./validation";

const schema = z.object({ channel: z.enum(["whatsapp", "instagram"]) });
const req = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });
const rawReq = (body: string) => new Request("http://x", { method: "POST", body });

describe("validateBody", () => {
  it("returns typed data on valid input", async () => {
    expect(await validateBody(req({ channel: "whatsapp" }), schema)).toEqual({
      channel: "whatsapp",
    });
  });
  it("throws on invalid input", async () => {
    await expect(validateBody(req({ channel: "sms" }), schema)).rejects.toMatchObject({
      code: 400,
    });
  });
  it("throws ErrInvalidJson on non-JSON body", async () => {
    await expect(validateBody(rawReq("not json{"), schema)).rejects.toMatchObject({
      code: 400,
      message: "Invalid JSON body",
    });
  });
  it("unwraps a { patch } envelope when opts.patch is set", async () => {
    const out = await validateBody(req({ patch: { channel: "instagram" } }), schema, {
      patch: true,
    });
    expect(out).toEqual({ channel: "instagram" });
  });
});

describe("parseOrThrow", () => {
  it("returns parsed data or throws on mismatch", () => {
    expect(parseOrThrow(schema, { channel: "whatsapp" })).toEqual({ channel: "whatsapp" });
    expect(() => parseOrThrow(schema, { channel: "sms" })).toThrowError();
  });
});
