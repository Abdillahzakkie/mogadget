import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "../constants/fetcher";

export interface ISecurityStatus {
  totpEnabled: boolean;
  recoveryCodesRemaining: number;
}
export interface IPasskey {
  id: string;
  nickname: string;
  createdAt: string;
  lastUsedAt?: string;
  deviceType?: string;
}

export const securityApi = {
  getStatus: (): Promise<ISecurityStatus> =>
    api.get("/admin/security/status").then((r) => r.data.data),

  // ── TOTP ──────────────────────────────────────────────────────────────────
  setupTotp: (): Promise<{ otpauthUrl: string; qrDataUrl: string; secret: string }> =>
    api.post("/admin/security/totp/setup").then((r) => r.data.data),
  enableTotp: (code: string): Promise<{ recoveryCodes: string[] }> =>
    api.post("/admin/security/totp/enable", { code }).then((r) => r.data.data),
  disableTotp: (code: string): Promise<{ ok: boolean }> =>
    api.post("/admin/security/totp/disable", { code }).then((r) => r.data.data),
  regenerateRecoveryCodes: (code: string): Promise<{ recoveryCodes: string[] }> =>
    api.post("/admin/security/totp/recovery-codes", { code }).then((r) => r.data.data),

  // ── Passkeys (management) ───────────────────────────────────────────────────
  listPasskeys: (): Promise<IPasskey[]> =>
    api.get("/admin/security/passkeys").then((r) => r.data.data),
  registerPasskey: async (nickname: string): Promise<{ verified: boolean }> => {
    const { data: opts } = await api.post("/admin/security/passkeys/options");
    const attResp = await startRegistration({ optionsJSON: opts.data });
    const { data } = await api.post("/admin/security/passkeys", { response: attResp, nickname });
    return data.data;
  },
  renamePasskey: (id: string, nickname: string): Promise<IPasskey> =>
    api.patch(`/admin/security/passkeys/${id}`, { nickname }).then((r) => r.data.data),
  deletePasskey: (id: string): Promise<{ deleted: boolean }> =>
    api.delete(`/admin/security/passkeys/${id}`).then((r) => r.data.data),
};

// ── Passkey login (pre-auth, used by the login page) ──────────────────────────
export async function loginWithPasskey(): Promise<{ username: string }> {
  const { data: opts } = await api.post("/admin/login/passkey/options");
  const asseResp = await startAuthentication({ optionsJSON: opts.data });
  const { data } = await api.post("/admin/login/passkey", { response: asseResp });
  return data.data;
}

// ── Passkey as a second factor (after password, gated on the pending-2FA cookie) ──────────────
export async function verify2faWithPasskey(): Promise<{ username: string }> {
  const { data: opts } = await api.post("/admin/login/passkey/2fa/options");
  const asseResp = await startAuthentication({ optionsJSON: opts.data });
  const { data } = await api.post("/admin/login/passkey/2fa", { response: asseResp });
  return data.data;
}
