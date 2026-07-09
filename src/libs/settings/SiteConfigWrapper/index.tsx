"use client";

import { useEffect, useState } from "react";
import { useSiteConfigAdmin } from "@/hooks/Settings/useSiteConfig";
import { settingsApi } from "@/lib/settingsApi";
import type { ISiteConfig } from "@/server/models/siteConfig/types";
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
  Textarea,
  Toggle,
  ToggleHint,
  ToggleText,
} from "../styled";

export default function SiteConfigWrapper() {
  const { config, isLoading, error, mutate } = useSiteConfigAdmin();
  const [form, setForm] = useState<ISiteConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Hydrate the editable form once the config loads.
  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  if (error) return <Err>Could not load site config.</Err>;
  if (isLoading || !form) return <Muted>Loading…</Muted>;

  const set = <K extends keyof ISiteConfig>(key: K, value: ISiteConfig[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const setContact = (k: keyof ISiteConfig["contact"], v: string) =>
    setForm((f) => (f ? { ...f, contact: { ...f.contact, [k]: v } } : f));
  const setSeo = (k: keyof ISiteConfig["seo"], v: string) =>
    setForm((f) => (f ? { ...f, seo: { ...f.seo, [k]: v } } : f));
  const setToggle = (k: keyof ISiteConfig["toggles"], v: boolean) =>
    setForm((f) => (f ? { ...f, toggles: { ...f.toggles, [k]: v } } : f));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setSaved(false);
    setSaveErr(null);
    try {
      const next = await settingsApi.updateSiteConfig({
        businessName: form.businessName,
        tagline: form.tagline,
        contact: form.contact,
        seo: {
          defaultTitle: form.seo.defaultTitle,
          defaultDescription: form.seo.defaultDescription,
        },
        toggles: form.toggles,
      });
      await mutate(next, { revalidate: false });
      setSaved(true);
    } catch {
      setSaveErr("Save failed. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <SectionTitle>Site config</SectionTitle>
      <SectionLead>
        Contact channels, business identity, SEO defaults, and site toggles.
      </SectionLead>

      <Card>
        <CardTitle>Business identity</CardTitle>
        <CardHint>Shown across the storefront and in social/link previews.</CardHint>
        <Row>
          <Field>
            <FieldLabel>Business name</FieldLabel>
            <Input
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Tagline</FieldLabel>
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
        </Row>
      </Card>

      <Card>
        <CardTitle>Contact channels</CardTitle>
        <CardHint>WhatsApp must be digits only, country code first (e.g. 2348060248044).</CardHint>
        <Row>
          <Field>
            <FieldLabel>WhatsApp number</FieldLabel>
            <Input
              value={form.contact.whatsapp}
              inputMode="numeric"
              onChange={(e) => setContact("whatsapp", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Instagram handle</FieldLabel>
            <Input
              value={form.contact.instagram}
              onChange={(e) => setContact("instagram", e.target.value)}
            />
          </Field>
        </Row>
        <Field>
          <FieldLabel>Facebook</FieldLabel>
          <Input
            value={form.contact.facebook}
            onChange={(e) => setContact("facebook", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Address</FieldLabel>
          <Input
            value={form.contact.address}
            onChange={(e) => setContact("address", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Opening hours</FieldLabel>
          <Input value={form.contact.hours} onChange={(e) => setContact("hours", e.target.value)} />
        </Field>
      </Card>

      <Card>
        <CardTitle>SEO defaults</CardTitle>
        <CardHint>Used as the default title/description for public pages.</CardHint>
        <Field>
          <FieldLabel>Default title</FieldLabel>
          <Input
            value={form.seo.defaultTitle}
            onChange={(e) => setSeo("defaultTitle", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Default description</FieldLabel>
          <Textarea
            value={form.seo.defaultDescription}
            onChange={(e) => setSeo("defaultDescription", e.target.value)}
          />
        </Field>
      </Card>

      <Card>
        <CardTitle>Toggles</CardTitle>
        <Toggle>
          <div>
            <ToggleText>Maintenance mode</ToggleText>
            <ToggleHint>Show a maintenance screen on the public site. Admin stays open.</ToggleHint>
          </div>
          <input
            type="checkbox"
            checked={form.toggles.maintenanceMode}
            onChange={(e) => setToggle("maintenanceMode", e.target.checked)}
          />
        </Toggle>
        <Toggle>
          <div>
            <ToggleText>Show sold listings</ToggleText>
            <ToggleHint>Keep SOLD pre-owned units visible (greyed out) as social proof.</ToggleHint>
          </div>
          <input
            type="checkbox"
            checked={form.toggles.showSoldListings}
            onChange={(e) => setToggle("showSoldListings", e.target.checked)}
          />
        </Toggle>
      </Card>

      <Actions>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {saved && <Ok>Saved.</Ok>}
        {saveErr && <Err>{saveErr}</Err>}
      </Actions>
    </form>
  );
}
