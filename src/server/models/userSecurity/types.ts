export interface IUserSecurity {
  _id: string;
  userId: string; // unique — one security record per user
  // AES-256-GCM encrypted TOTP shared secret. Present once setup has begun; used for verification.
  totpSecret?: string;
  totpEnabled: boolean;
  // bcrypt-hashed, single-use recovery codes. A code is pulled from the array when consumed.
  recoveryCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Client-safe status (never exposes the secret or the hashed codes).
export interface ISecurityStatusDto {
  totpEnabled: boolean;
  recoveryCodesRemaining: number;
}
