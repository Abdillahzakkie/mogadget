"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { routes } from "@/constants/routes";
import { adminApi } from "@/lib/adminApi";
import { loginWithPasskey } from "@/lib/securityApi";
import {
  Card,
  Divider,
  ErrorNote,
  FieldLabel,
  PasskeyButton,
  SubmitButton,
  SubTitle,
  TextInput,
  Wordmark,
  WordmarkAccent,
  Wrap,
} from "./styled";

type Stage = "password" | "totp";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? routes.admin;

  const [stage, setStage] = useState<Stage>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function finish() {
    router.replace(next);
    router.refresh();
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.login(username, password);
      if (res.mfaRequired) {
        setStage("totp");
        setBusy(false);
      } else {
        finish();
      }
    } catch {
      setError("Invalid username or password.");
      setBusy(false);
    }
  }

  async function onTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.loginTotp(code);
      finish();
    } catch {
      setError("Invalid code. Try again or use a recovery code.");
      setBusy(false);
    }
  }

  async function onPasskey() {
    setBusy(true);
    setError(null);
    try {
      await loginWithPasskey();
      finish();
    } catch {
      setError("Passkey sign-in was cancelled or failed.");
      setBusy(false);
    }
  }

  if (stage === "totp") {
    return (
      <Card onSubmit={onTotpSubmit}>
        <Wordmark>
          Mo<WordmarkAccent>Gadget</WordmarkAccent>
        </Wordmark>
        <SubTitle>Two-factor authentication</SubTitle>
        <FieldLabel>Enter the code from your authenticator (or a recovery code)</FieldLabel>
        <TextInput
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        <SubmitButton type="submit" disabled={busy} $busy={busy}>
          {busy ? "Verifying…" : "Verify"}
        </SubmitButton>
      </Card>
    );
  }

  return (
    <Card onSubmit={onPasswordSubmit}>
      <Wordmark>
        Mo<WordmarkAccent>Gadget</WordmarkAccent>
      </Wordmark>
      <SubTitle>Admin sign in</SubTitle>

      <FieldLabel>Username</FieldLabel>
      <TextInput
        value={username}
        autoComplete="username"
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <FieldLabel>Password</FieldLabel>
      <TextInput
        type="password"
        value={password}
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <SubmitButton type="submit" disabled={busy} $busy={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </SubmitButton>

      <Divider>or</Divider>
      <PasskeyButton type="button" onClick={onPasskey} disabled={busy}>
        🔑 Sign in with a passkey
      </PasskeyButton>
    </Card>
  );
}

export default function LoginWrapper() {
  return (
    <Wrap>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </Wrap>
  );
}
