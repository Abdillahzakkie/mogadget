"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/Settings/useProfile";
import { settingsApi } from "@/lib/settingsApi";
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
  Row,
  SectionLead,
  SectionTitle,
} from "../styled";

export default function ProfileWrapper() {
  const { profile, isLoading, error, mutate } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("");
  const [username, setUsername] = useState("");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");

  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setEmail(profile.email);
      setTimezone(profile.preferences.timezone ?? "");
      setUsername(profile.username);
    }
  }, [profile]);

  if (error) return <Err>Could not load your profile.</Err>;
  if (isLoading || !profile) return <Muted>Loading…</Muted>;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy("profile");
    setNote(null);
    try {
      const updated = await settingsApi.updateProfile({
        displayName,
        email,
        preferences: { timezone },
      });
      await mutate(updated, { revalidate: false });
      setNote({ kind: "ok", text: "Profile saved." });
    } catch {
      setNote({ kind: "err", text: "Could not save profile." });
    } finally {
      setBusy(null);
    }
  }

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    setBusy("username");
    setNote(null);
    try {
      const updated = await settingsApi.changeUsername(username);
      await mutate(updated, { revalidate: false });
      setNote({ kind: "ok", text: "Username updated." });
    } catch {
      setNote({ kind: "err", text: "That username is taken or invalid." });
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setNote(null);
    try {
      await settingsApi.changePassword(cur, next);
      setCur("");
      setNext("");
      setNote({ kind: "ok", text: "Password changed." });
    } catch {
      setNote({ kind: "err", text: "Check your current password (min 8 chars, must differ)." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <SectionTitle>Profile</SectionTitle>
      <SectionLead>Your account details and sign-in credentials.</SectionLead>

      {note && (note.kind === "ok" ? <Ok>{note.text}</Ok> : <Err>{note.text}</Err>)}

      <form onSubmit={saveProfile}>
        <Card>
          <CardTitle>Account details</CardTitle>
          <CardHint>Email is stored for reference only — it isn't used for sign-in.</CardHint>
          <Row>
            <Field>
              <FieldLabel>Display name</FieldLabel>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </Field>
          </Row>
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Input
              value={timezone}
              placeholder="Africa/Lagos"
              onChange={(e) => setTimezone(e.target.value)}
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={busy === "profile"}>
              {busy === "profile" ? "Saving…" : "Save profile"}
            </Button>
          </Actions>
        </Card>
      </form>

      <form onSubmit={saveUsername}>
        <Card>
          <CardTitle>Username</CardTitle>
          <CardHint>You sign in with this. It must be unique.</CardHint>
          <Field>
            <FieldLabel>Username</FieldLabel>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Actions>
            <Button type="submit" $variant="ghost" disabled={busy === "username"}>
              {busy === "username" ? "Updating…" : "Update username"}
            </Button>
          </Actions>
        </Card>
      </form>

      <form onSubmit={savePassword}>
        <Card>
          <CardTitle>Change password</CardTitle>
          <CardHint>Enter your current password, then a new one (at least 8 characters).</CardHint>
          <Row>
            <Field>
              <FieldLabel>Current password</FieldLabel>
              <Input
                type="password"
                value={cur}
                autoComplete="current-password"
                onChange={(e) => setCur(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>New password</FieldLabel>
              <Input
                type="password"
                value={next}
                autoComplete="new-password"
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
          </Row>
          <Actions>
            <Button type="submit" $variant="ghost" disabled={busy === "password"}>
              {busy === "password" ? "Changing…" : "Change password"}
            </Button>
          </Actions>
        </Card>
      </form>
    </>
  );
}
