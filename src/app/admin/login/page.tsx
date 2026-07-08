"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { routes } from "../../../constants/routes";
import { adminApi } from "../../../lib/adminApi";

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
    <form onSubmit={onSubmit} style={card}>
      <div style={{ font: "700 26px var(--font-display)", marginBottom: 4 }}>
        Mo<span style={{ color: "var(--brand)" }}>Gadget</span>
      </div>
      <div style={{ color: "var(--sold)", fontSize: 13, marginBottom: 20 }}>Admin sign in</div>

      <label style={label}>Username</label>
      <input
        style={input}
        value={username}
        autoComplete="username"
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <label style={label}>Password</label>
      <input
        style={input}
        type="password"
        value={password}
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</div>}

      <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.6 : 1 }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main style={wrap}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

const wrap = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
};
const card = {
  width: "100%",
  maxWidth: 360,
  background: "#fff",
  border: "1px solid rgba(20,21,24,.10)",
  borderRadius: 16,
  padding: 28,
  display: "flex",
  flexDirection: "column" as const,
};
const label = {
  font: "500 12px var(--font-body)",
  color: "rgba(20,21,24,.6)",
  margin: "12px 0 6px",
};
const input = {
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(20,21,24,.18)",
  padding: "0 12px",
  fontSize: 15,
  fontFamily: "var(--font-body)",
  background: "var(--paper)",
};
const button = {
  marginTop: 22,
  height: 44,
  borderRadius: 10,
  border: "none",
  background: "var(--brand)",
  color: "#fff",
  font: "600 15px var(--font-body)",
  cursor: "pointer",
};
