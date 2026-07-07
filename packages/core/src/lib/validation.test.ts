import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody } from "./validation";

const schema = z.object({ channel: z.enum(["whatsapp", "instagram"]) });
const req = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

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
});
