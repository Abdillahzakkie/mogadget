"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { routes } from "@/constants/routes";
import { adminApi } from "@/lib/adminApi";
import {
  Card,
  ErrorNote,
  FieldLabel,
  SubmitButton,
  SubTitle,
  TextInput,
  Wordmark,
  WordmarkAccent,
  Wrap,
} from "./styled";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? routes.admin;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(username, password);
      router.replace(next);
      router.refresh();
    } catch {
      setError("Invalid username or password.");
      setBusy(false);
    }
  }

  return (
    <Card onSubmit={onSubmit}>
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
