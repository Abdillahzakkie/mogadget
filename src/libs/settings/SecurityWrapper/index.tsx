"use client";

import Image from "next/image";
import { useState } from "react";
import { usePasskeys, useSecurityStatus } from "@/hooks/Settings/useSecurity";
import { securityApi } from "@/lib/securityApi";
import {
  Actions,
  Button,
  Card,
  CardHint,
  CardTitle,
  Err,
  Field,
  FieldLabel,
  Input,
  Muted,
  Ok,
  SectionLead,
  SectionTitle,
  Table,
  TableScroll,
} from "../styled";

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <Card>
      <CardTitle>Save your recovery codes</CardTitle>
      <CardHint>
        Each code works once. Store them somewhere safe — they're the only way in if you lose your
        authenticator. They won't be shown again.
      </CardHint>
      <pre
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 14,
          lineHeight: 1.9,
          columns: 2,
        }}
      >
        {codes.join("\n")}
      </pre>
    </Card>
  );
}

function TotpSection() {
  const { status, isLoading, mutate } = useSecurityStatus();
  const [setup, setSetup] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || !status) return <Muted>Loading…</Muted>;

  async function beginSetup() {
    setBusy(true);
    setNote(null);
    try {
      const s = await securityApi.setupTotp();
      setSetup({ qrDataUrl: s.qrDataUrl, secret: s.secret });
    } catch {
      setNote({ kind: "err", text: "Could not start setup." });
    } finally {
      setBusy(false);
    }
  }
  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      const { recoveryCodes } = await securityApi.enableTotp(code);
      setCodes(recoveryCodes);
      setSetup(null);
      setCode("");
      await mutate();
      setNote({ kind: "ok", text: "Two-factor authentication is on." });
    } catch {
      setNote({ kind: "err", text: "That code didn't match. Try again." });
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setNote(null);
    try {
      await securityApi.disableTotp(code);
      setCode("");
      setCodes(null);
      await mutate();
      setNote({ kind: "ok", text: "Two-factor authentication is off." });
    } catch {
      setNote({ kind: "err", text: "A valid code is required to disable 2FA." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Two-factor authentication (TOTP)</CardTitle>
      <CardHint>
        {status.totpEnabled
          ? `Enabled · ${status.recoveryCodesRemaining} recovery codes left.`
          : "Add a second step at sign-in using an authenticator app."}
      </CardHint>

      {note && (note.kind === "ok" ? <Ok>{note.text}</Ok> : <Err>{note.text}</Err>)}
      {codes && <RecoveryCodes codes={codes} />}

      {!status.totpEnabled && !setup && (
        <Actions>
          <Button type="button" onClick={beginSetup} disabled={busy}>
            {busy ? "Starting…" : "Enable 2FA"}
          </Button>
        </Actions>
      )}

      {!status.totpEnabled && setup && (
        <div>
          <CardHint>
            Scan this with Google Authenticator / Authy, then enter the 6-digit code.
          </CardHint>
          <Image
            src={setup.qrDataUrl}
            alt="TOTP QR code"
            width={180}
            height={180}
            unoptimized
            style={{ borderRadius: 8 }}
          />
          <Muted>
            Or enter the key manually: <code>{setup.secret}</code>
          </Muted>
          <Field>
            <FieldLabel>6-digit code</FieldLabel>
            <Input
              value={code}
              inputMode="numeric"
              onChange={(e) => setCode(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </Field>
          <Actions>
            <Button type="button" onClick={enable} disabled={busy || code.length < 6}>
              {busy ? "Verifying…" : "Confirm & enable"}
            </Button>
          </Actions>
        </div>
      )}

      {status.totpEnabled && (
        <div>
          <Field>
            <FieldLabel>Enter a code to disable</FieldLabel>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ maxWidth: 200 }}
              placeholder="TOTP or recovery code"
            />
          </Field>
          <Actions>
            <Button type="button" $variant="danger" onClick={disable} disabled={busy || !code}>
              Disable 2FA
            </Button>
            <Button
              type="button"
              $variant="ghost"
              disabled={busy || !code}
              onClick={async () => {
                setBusy(true);
                setNote(null);
                try {
                  const { recoveryCodes } = await securityApi.regenerateRecoveryCodes(code);
                  setCodes(recoveryCodes);
                  setCode("");
                  await mutate();
                } catch {
                  setNote({ kind: "err", text: "That code didn't match." });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Regenerate recovery codes
            </Button>
          </Actions>
        </div>
      )}
    </Card>
  );
}

function PasskeysSection() {
  const { passkeys, isLoading, mutate } = usePasskeys();
  const [nickname, setNickname] = useState("");
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setBusy(true);
    setNote(null);
    try {
      await securityApi.registerPasskey(nickname || "My passkey");
      setNickname("");
      await mutate();
      setNote({ kind: "ok", text: "Passkey added." });
    } catch {
      setNote({ kind: "err", text: "Passkey registration was cancelled or failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Passkeys</CardTitle>
      <CardHint>
        Sign in without a password using your device's biometrics or security key.
      </CardHint>
      {note && (note.kind === "ok" ? <Ok>{note.text}</Ok> : <Err>{note.text}</Err>)}

      {!isLoading && passkeys.length > 0 && (
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Added</th>
                <th>Last used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {passkeys.map((p) => (
                <tr key={p.id}>
                  <td>{p.nickname}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.lastUsedAt ? new Date(p.lastUsedAt).toLocaleDateString() : "—"}</td>
                  <td>
                    <Button
                      type="button"
                      $variant="ghost"
                      onClick={async () => {
                        await securityApi.deletePasskey(p.id);
                        await mutate();
                      }}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}

      <Field>
        <FieldLabel>Passkey name</FieldLabel>
        <Input
          value={nickname}
          placeholder="e.g. MacBook Touch ID"
          onChange={(e) => setNickname(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </Field>
      <Actions>
        <Button type="button" onClick={register} disabled={busy}>
          {busy ? "Waiting for device…" : "Add a passkey"}
        </Button>
      </Actions>
    </Card>
  );
}

export default function SecurityWrapper() {
  return (
    <>
      <SectionTitle>Security</SectionTitle>
      <SectionLead>Protect your account with passkeys and two-factor authentication.</SectionLead>
      <TotpSection />
      <PasskeysSection />
    </>
  );
}
