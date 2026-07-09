import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { consumeChallenge, stashChallenge } from "../../lib/webauthnChallenge";
import {
  createCredentialDB,
  getCredentialByCredentialIdDB,
  WebauthnCredential,
} from "../../models/webauthnCredentials";

// Mock the WebAuthn library so we fully control what "the authenticator" returned — verified
// true/false plus the registrationInfo/authenticationInfo payloads — without needing a real device.
vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import authenticationOptions from "./authenticationOptions";
import deletePasskey from "./deletePasskey";
import listPasskeys from "./listPasskeys";
import registrationOptions from "./registrationOptions";
import renamePasskey from "./renamePasskey";
import verifyAuthentication from "./verifyAuthentication";
import verifyRegistration from "./verifyRegistration";

// All test users share the `pktest` prefix so teardown can scope its deleteMany safely.
const USER_A = "pktest-user-a";
const USER_B = "pktest-user-b";
// biome-ignore lint/suspicious/noExplicitAny: opaque WebAuthn ceremony payloads in tests.
const anyResponse = (id: string): any => ({ id, rawId: id, type: "public-key", response: {} });

describe("passkeys service", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
    // Ensure the unique index on credentialId is built before the duplicate-insert test runs.
    await WebauthnCredential.init();
  });

  afterAll(async () => {
    await WebauthnCredential.deleteMany({ userId: /^pktest/ });
    await redis.del(`webauthn:reg:${USER_A}`, `webauthn:reg:${USER_B}`, "webauthn:auth:login");
    await redis.quit();
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await WebauthnCredential.deleteMany({ userId: /^pktest/ });
    await redis.del(`webauthn:reg:${USER_A}`, `webauthn:reg:${USER_B}`, "webauthn:auth:login");
  });

  it("registrationOptions returns options and stashes the challenge under the user's reg scope", async () => {
    vi.mocked(generateRegistrationOptions).mockResolvedValue({
      challenge: "reg-challenge-1",
      // biome-ignore lint/suspicious/noExplicitAny: partial options are enough for this test.
    } as any);

    const options = await registrationOptions({ userId: USER_A, username: "admin" });
    expect(options.challenge).toBe("reg-challenge-1");
    // The challenge is now retrievable (and consumed) from Redis under scope "reg".
    expect(await consumeChallenge("reg", USER_A)).toBe("reg-challenge-1");
  });

  it("verifyRegistration stores the credential when the library verifies it", async () => {
    await stashChallenge("reg", USER_A, "reg-challenge-2");
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-stored-1",
          publicKey: new Uint8Array([1, 2, 3, 4]),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: true,
      },
      // biome-ignore lint/suspicious/noExplicitAny: partial verification result.
    } as any);

    const result = await verifyRegistration({
      userId: USER_A,
      response: anyResponse("cred-stored-1"),
      nickname: "My Laptop",
    });
    expect(result.verified).toBe(true);

    const stored = await getCredentialByCredentialIdDB({ credentialId: "cred-stored-1" });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(USER_A);
    expect(stored?.nickname).toBe("My Laptop");
    expect(stored?.deviceType).toBe("singleDevice");
    expect(stored?.backedUp).toBe(true);
    // Public key is persisted base64url-encoded, not raw bytes.
    expect(stored?.publicKey).toBe(Buffer.from([1, 2, 3, 4]).toString("base64url"));
  });

  it("verifyRegistration rejects (stores nothing) when the library says verified:false", async () => {
    await stashChallenge("reg", USER_A, "reg-challenge-3");
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
      // biome-ignore lint/suspicious/noExplicitAny: partial verification result.
    } as any);

    const result = await verifyRegistration({
      userId: USER_A,
      response: anyResponse("cred-nope"),
    });
    expect(result.verified).toBe(false);
    expect(await getCredentialByCredentialIdDB({ credentialId: "cred-nope" })).toBeNull();
  });

  it("verifyRegistration rejects when no challenge was stashed (expired/replayed)", async () => {
    const result = await verifyRegistration({
      userId: USER_A,
      response: anyResponse("cred-x"),
    });
    expect(result.verified).toBe(false);
    expect(verifyRegistrationResponse).not.toHaveBeenCalled();
  });

  it("rejects a duplicate credentialId via the unique index", async () => {
    const first = await createCredentialDB({
      userId: USER_A,
      credentialId: "cred-dup",
      publicKey: "AAECAw",
      counter: 0,
      nickname: "First",
    });
    expect(first).not.toBeNull();
    const second = await createCredentialDB({
      userId: USER_A,
      credentialId: "cred-dup",
      publicKey: "BBECAw",
      counter: 0,
      nickname: "Second",
    });
    expect(second).toBeNull();
  });

  it("authenticationOptions offers stored credentials and stashes the login challenge", async () => {
    await createCredentialDB({
      userId: USER_A,
      credentialId: "cred-auth-opt",
      publicKey: "AAEC",
      counter: 0,
      transports: ["internal"],
      nickname: "Key",
    });
    vi.mocked(generateAuthenticationOptions).mockResolvedValue({
      challenge: "auth-challenge-1",
      // biome-ignore lint/suspicious/noExplicitAny: partial options.
    } as any);

    const options = await authenticationOptions();
    expect(options.challenge).toBe("auth-challenge-1");
    // Library was handed the stored credential in allowCredentials.
    const passed = vi.mocked(generateAuthenticationOptions).mock.calls[0]?.[0];
    expect(passed?.allowCredentials?.[0]?.id).toBe("cred-auth-opt");
    expect(await consumeChallenge("auth", "login")).toBe("auth-challenge-1");
  });

  it("verifyAuthentication looks up the credential, bumps the counter, and returns the userId", async () => {
    await createCredentialDB({
      userId: USER_A,
      credentialId: "cred-login-1",
      publicKey: Buffer.from([9, 8, 7]).toString("base64url"),
      counter: 3,
      transports: ["internal"],
      nickname: "Login Key",
    });
    await stashChallenge("auth", "login", "auth-challenge-2");
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 7, credentialID: "cred-login-1" },
      // biome-ignore lint/suspicious/noExplicitAny: partial verification result.
    } as any);

    const result = await verifyAuthentication({ response: anyResponse("cred-login-1") });
    expect(result).toEqual({ verified: true, userId: USER_A });

    const stored = await getCredentialByCredentialIdDB({ credentialId: "cred-login-1" });
    expect(stored?.counter).toBe(7);
    expect(stored?.lastUsedAt).toBeTruthy();
    // The stored public key was decoded from base64url back into bytes for the library.
    const credentialArg = vi.mocked(verifyAuthenticationResponse).mock.calls[0]?.[0]?.credential;
    expect(Buffer.from(credentialArg?.publicKey as Uint8Array)).toEqual(Buffer.from([9, 8, 7]));
  });

  it("verifyAuthentication returns not-verified for an unknown credential", async () => {
    await stashChallenge("auth", "login", "auth-challenge-3");
    const result = await verifyAuthentication({ response: anyResponse("cred-unknown") });
    expect(result.verified).toBe(false);
    expect(result.userId).toBeUndefined();
    // Never reached the library because the credential wasn't found.
    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it("verifyAuthentication returns not-verified when the library rejects the signature", async () => {
    await createCredentialDB({
      userId: USER_A,
      credentialId: "cred-login-bad",
      publicKey: "AAEC",
      counter: 0,
      nickname: "Bad",
    });
    await stashChallenge("auth", "login", "auth-challenge-4");
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: false,
      authenticationInfo: { newCounter: 0 },
      // biome-ignore lint/suspicious/noExplicitAny: partial verification result.
    } as any);

    const result = await verifyAuthentication({ response: anyResponse("cred-login-bad") });
    expect(result.verified).toBe(false);
  });

  it("list/rename/delete are scoped by userId — a user can't touch another's credential", async () => {
    const cred = await createCredentialDB({
      userId: USER_A,
      credentialId: "cred-owned",
      publicKey: "AAEC",
      counter: 0,
      nickname: "Owned",
    });
    const id = String(cred?._id);

    // USER_A sees exactly their credential as a DTO with no key material.
    const listed = await listPasskeys({ userId: USER_A });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(id);
    expect(listed[0]?.nickname).toBe("Owned");
    expect(listed[0]).not.toHaveProperty("publicKey");

    // USER_B sees nothing.
    expect(await listPasskeys({ userId: USER_B })).toHaveLength(0);

    // USER_B cannot rename or delete USER_A's credential.
    expect(await renamePasskey({ id, userId: USER_B, nickname: "Hijacked" })).toBeNull();
    expect(await deletePasskey({ id, userId: USER_B })).toBe(false);

    // The owner can rename and then delete it.
    const renamed = await renamePasskey({ id, userId: USER_A, nickname: "Renamed" });
    expect(renamed?.nickname).toBe("Renamed");
    expect(await deletePasskey({ id, userId: USER_A })).toBe(true);
    expect(await listPasskeys({ userId: USER_A })).toHaveLength(0);
  });
});
