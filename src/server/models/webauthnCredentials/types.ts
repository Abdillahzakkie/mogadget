// A stored WebAuthn/passkey credential. Public-key material and counter are the anti-replay
// state the verifier needs; `credentialId` (base64url) is the stable lookup key browsers echo
// back at authentication time. There is a single admin owner, but every row is still scoped by
// `userId` so management operations (rename/delete) can never cross accounts.
export interface IWebauthnCredential {
  _id: string;
  userId: string;
  // The authenticator's credential ID, base64url-encoded. Unique across the collection.
  credentialId: string;
  // COSE public key, base64url-encoded.
  publicKey: string;
  // Signature counter reported by the authenticator; monotonically increases per use.
  counter: number;
  transports: string[];
  // "singleDevice" | "multiDevice" as reported by the library at registration time.
  deviceType?: string;
  backedUp?: boolean;
  // User-facing label ("MacBook Touch ID", "YubiKey 5", …).
  nickname: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface IWebauthnCredentialCreateInput {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  nickname: string;
}

// The safe shape returned to clients — never includes `publicKey` or the raw `credentialId`.
export interface IWebauthnCredentialDto {
  id: string;
  nickname: string;
  createdAt: Date;
  lastUsedAt?: Date;
  deviceType?: string;
}
