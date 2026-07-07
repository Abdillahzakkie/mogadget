# MoGadget — Product & Implementation Document

**Version:** 1.0 · **Date:** July 2026 · **Status:** Draft for owner review
**Source of truth:** `MOGADGET.md` (owner-confirmed context document)

---

## 1. Executive Summary

MoGadget is a single-owner gadget catalog website for a Lagos-based retailer selling new and pre-owned electronics (phones, laptops, audio, wearables, consoles, accessories) with nationwide delivery across Nigeria. The site is **not** an e-commerce store: there is no cart, no checkout, no payment gateway, and no customer accounts. Its sole job is to present products with clarity and trust signals (photos, price, condition + cosmetic grade, warranty), and to convert visitor interest into a WhatsApp or Instagram chat where the owner completes the sale.

The system has exactly two user-facing surfaces:

1. **Public catalog** — browse, filter, search, view product, tap "Chat on WhatsApp" (with a prefilled deep-link message) or "DM on Instagram".
2. **Admin panel** — a single-login `/admin` area where the owner manages listings, photos, stock/sold status, and views per-product click analytics.

## 2. Goals and Non-Goals

### 2.1 Goals (v1)

- G1. Present every product with photos, price in ₦, condition grade, cosmetic grade (pre-owned), and warranty note.
- G2. Minimize friction from "interested" to "messaging": one tap opens WhatsApp with a prefilled, product-identifying message.
- G3. Keep the catalog usable at scale: category, brand, condition, and price-range filters plus keyword search.
- G4. Give the owner a dead-simple admin panel: create/edit/delete/hide listings, upload multiple photos, flip stock/sold status.
- G5. Track WhatsApp/Instagram click-throughs per product (event counts only, no PII).
- G6. Fast on mobile over Nigerian network conditions — the majority of traffic is assumed mobile-first.
- G7. Preserve shared links: sold pre-owned listings remain visible (greyed, badged "SOLD") instead of 404ing.

### 2.2 Non-Goals (explicitly out of scope for v1)

- Shopping cart, online checkout, payment gateways (Paystack, Flutterwave, etc.)
- Customer accounts, login, order history
- Multi-vendor / marketplace features
- Multi-admin roles, staff permissions, invite flows
- Reviews and ratings
- On-site delivery fee calculation (handled in chat)
- Any currency other than Nigerian Naira

Scope discipline is a design principle here, not just a budget constraint: every out-of-scope item above pulls the product toward "web shop," which contradicts the chat-to-sell model. Resist them even when they feel like obvious add-ons.

## 3. Users

### 3.1 Customer (anonymous visitor)

Anyone in Nigeria browsing on a phone. They care most about: real photos of the actual unit (for pre-owned), honest condition grading, a firm price, proof the business is real (physical store, warranty), and getting into a chat in one tap. They never authenticate.

### 3.2 Admin (the owner)

One person, one login. Manages the whole catalog from a phone or laptop. Needs speed over configurability: add a listing with photos in under two minutes, flip a unit to SOLD in one tap, see which listings drive WhatsApp clicks.

## 4. Information Architecture & Sitemap

```
/                       Home — hero, featured products, category tiles, trust strip
/products               Catalog — grid + filters (category, brand, condition, price) + search
/products/[slug]        Product detail — gallery, price, condition, warranty, CTA buttons
/contact                Visit Us — store address, map embed, hours, WhatsApp/IG/Facebook links
/admin/login            Admin login (single account)
/admin                  Dashboard — listing table, quick status toggles, click counts
/admin/products/new     Create listing
/admin/products/[id]    Edit listing
```

URL conventions:

- Product slugs are human-readable and stable: `iphone-13-128gb-uk-used-a3F9` (name + short ID suffix to guarantee uniqueness). Slugs never change after creation, because they are shared on WhatsApp/Instagram.
- Filters live in query params so filtered views are shareable: `/products?category=phones&condition=UK_USED&max=500000`.

## 5. Functional Specification — Public Site

### 5.1 Home page

- Hero: brand statement + primary CTA ("Browse gadgets") + secondary CTA ("Chat on WhatsApp" — generic deep link, no product prefill).
- Category tiles: Phones, Laptops, Audio, Wearables, Consoles, Other.
- Featured/latest products strip (admin-curated later; v1 = most recently added, in stock/available first).
- Trust strip: "1-Month Warranty on Everything · Physical Store in Computer Village, Ikeja · Nationwide Delivery · Free Delivery in Lagos".

### 5.2 Catalog page (`/products`)

- Responsive product grid; card shows: primary photo, name, price (₦, formatted), condition badge (and cosmetic grade badge if pre-owned), and status overlay if SOLD/OUT_OF_STOCK.
- Filters (combinable, reflected in URL):
  - Category (single select)
  - Brand (multi-select, options scoped to selected category)
  - Condition (New / UK Used / US Used / NG Used)
  - Price range (min/max in ₦)
- Keyword search: matches product name + brand + description (Postgres `ILIKE`/full-text; v1 does not need fuzzy search).
- Default sort: newest first, with SOLD/OUT_OF_STOCK items sorted to the end. Optional sorts: price low→high, high→low.
- Sold pre-owned items appear greyed out with a SOLD badge — they are social proof, not clutter, but must never rank above available items.
- Hidden listings (admin toggle) never appear anywhere on the public site, including direct URL access (return 404).

### 5.3 Product detail page (`/products/[slug]`)

- Photo gallery: swipeable on mobile, thumbnails on desktop. Minimum 1 image; UI is designed around 3–5.
- Name, brand, category breadcrumb.
- Price: large, unmissable, formatted per owner's preference (see §14 Open Items).
- Condition block: badge combination, e.g. **"UK Used · Grade A"**, with a one-line plain-language explanation of what the grade means (pulled from a static grade glossary, not typed per listing). For NEW items: "Brand New — sealed, full manufacturer warranty applies."
- Warranty note, shown once and prominently: "1-month MoGadget warranty" (plus manufacturer warranty mention for NEW).
- Description (owner-written, short).
- Status handling:
  - `SOLD`: page stays live; gallery desaturated or overlaid with a SOLD ribbon; CTAs replaced with "This unit has been sold — browse similar" linking to the catalog filtered by the same category/brand.
  - `OUT_OF_STOCK`: CTAs replaced with "Out of stock — ask about restock on WhatsApp" (deep link with a restock-inquiry prefill).
- Primary CTA: **Chat on WhatsApp** (sticky on mobile — always visible at bottom of viewport).
- Secondary CTA: **DM on Instagram** (links to the profile; Instagram does not support prefilled DMs).
- "Similar products" strip: same category, available items only.

### 5.4 Contact / Visit Us page

- Store address: His Grace Plaza, 14 Francis Oremeji Street, Computer Village, Ikeja, Lagos.
- Hours: Monday–Saturday, ~9am–6pm.
- Optional map embed (static map image preferred over a live embed for page-weight reasons; link out to Google Maps).
- Contact channels: WhatsApp (+234 806 024 8044), Instagram @Mo_gadgets, Facebook (Mo Gadgets).

### 5.5 WhatsApp deep-link (must-have mechanism)

Every product CTA builds:

```
https://wa.me/2348060248044?text=<URL-encoded message>
```

Message template:

```
Hi, I'm interested in the {Product Name} (₦{Price}) listed on MoGadget
```

Implementation rules:

- Encode with `encodeURIComponent` on the full message — never hand-assemble percent-escapes.
- Include the formatted price at click time (so the message matches what the visitor saw, even if price changes later).
- Optionally append the product URL to the message so the owner sees exactly which unit (recommended — pre-owned units of the same model can differ):
  `... on MoGadget — {siteUrl}/products/{slug}`
- The click fires the analytics increment (see §10) *before* navigation, using `navigator.sendBeacon` so the redirect is never delayed or lost.

```ts
// components/WhatsAppButton.tsx (client component)
"use client";

const WA_NUMBER = "2348060248044";

export function WhatsAppButton({ product }: { product: ProductCTA }) {
  const message =
    `Hi, I'm interested in the ${product.name} ` +
    `(${formatNaira(product.price)}) listed on MoGadget — ` +
    `${SITE_URL}/products/${product.slug}`;
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  const handleClick = () => {
    navigator.sendBeacon(`/api/products/${product.id}/click`,
      JSON.stringify({ channel: "whatsapp" }));
  };

  return (
    <a href={href} onClick={handleClick} target="_blank" rel="noopener"
       className="cta cta--whatsapp">
      Chat on WhatsApp
    </a>
  );
}
```

## 6. Functional Specification — Admin Panel

### 6.1 Authentication

- Single admin record. Username + password (hashed with bcrypt/argon2). Session cookie (httpOnly, Secure, SameSite=Lax), server-validated on every `/admin` route and every mutating API route.
- Rate-limit login attempts (e.g. 5 per 15 minutes per IP). No password reset flow in v1 — owner resets via database/console if ever needed (documented in the runbook).
- No roles, no invites, no user management UI. This is deliberate.

### 6.2 Dashboard (`/admin`)

- Table of all listings: thumbnail, name, category, condition, price, status, visibility, WhatsApp clicks, updated date.
- Inline quick actions: toggle visible/hidden; flip AVAILABLE→SOLD (pre-owned) or IN_STOCK↔OUT_OF_STOCK (new); edit; delete (confirm dialog; deleting is discouraged for sold pre-owned items — hiding or leaving as SOLD is preferred).
- Simple sort by clicks to surface the listings driving the most interest.

### 6.3 Create / Edit listing

Form fields, in order:

1. **Stock type** (radio): "New (restockable)" or "Pre-owned (unique unit)" — this choice drives which status and grade fields appear. Locked after creation (changing it mid-life corrupts the lifecycle; if the owner made a mistake, delete and recreate).
2. Name (required)
3. Category (select) → Brand (select, scoped to category, with free-text "Other")
4. Condition:
   - If New: fixed to `NEW`, cosmetic grade hidden/null.
   - If Pre-owned: `UK_USED` / `US_USED` / `NG_USED` + cosmetic grade `A`/`B`/`C` (both required).
5. Price (₦ integer, no decimals; input formats with thousands separators as the owner types).
6. Quantity (only for New/restockable; ≥ 0; hitting 0 flips status to OUT_OF_STOCK automatically, restocking above 0 flips back).
7. Description (short text, optional but encouraged).
8. Photos: multi-upload, drag-to-reorder, first image = primary. Validation: min 1 to publish; UI nudges "3–5 photos recommended" when stock type is pre-owned. Client-side compress/resize before upload (max edge ~2000px) to keep uploads fast on mobile data.
9. Visibility toggle (visible/hidden), default visible.

Server-side validation mirrors every client rule (the client is a convenience, the server is the authority):

- `condition = NEW` ⟺ `cosmetic_grade IS NULL` ⟺ `stock_type = RESTOCKABLE`
- `stock_type = UNIQUE_UNIT` ⟹ status ∈ {AVAILABLE, SOLD}, quantity is NULL
- `stock_type = RESTOCKABLE` ⟹ status ∈ {IN_STOCK, OUT_OF_STOCK}, quantity ≥ 0
- price > 0, integer

### 6.4 Listing lifecycle (state machines)

```
New / RESTOCKABLE:        IN_STOCK  <──────>  OUT_OF_STOCK
                          (quantity > 0)      (quantity = 0)
                          Listing persists across restocks.

Pre-owned / UNIQUE_UNIT:  AVAILABLE  ──────>  SOLD   (one-way in normal use)
                          SOLD listing stays public: greyed out + badge.
                          Un-marking SOLD is allowed in admin (mistake recovery)
                          but logged as an edge case, not a normal flow.
```

## 7. System Architecture

A deliberately small, layered architecture. One Next.js application serves both the public catalog and the admin panel; Supabase provides Postgres, object storage, and nothing else we don't need.

```
┌────────────────────────────────────────────────────────────────┐
│                         Visitor (mobile-first)                 │
└──────────────┬─────────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼─────────────────────────────────────────────────┐
│                    CDN / Edge (Vercel or similar)              │
│   • Static assets, cached SSG/ISR pages, image optimization    │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│                     Next.js App (App Router)                   │
│                                                                │
│  Presentation layer                                            │
│   • Public pages: / , /products, /products/[slug], /contact    │
│   • Admin pages: /admin/** (session-gated via middleware)      │
│                                                                │
│  Application layer                                             │
│   • Server Components for reads (catalog, product detail)      │
│   • Server Actions / route handlers for writes (admin CRUD)    │
│   • /api/products/[id]/click  (public, rate-limited beacon)    │
│                                                                │
│  Domain layer (plain TypeScript, no framework imports)         │
│   • Product entity + lifecycle rules (state machines in §6.4)  │
│   • Grade taxonomy, price formatting, slug generation          │
│                                                                │
│  Data layer                                                    │
│   • Repository module wrapping the Supabase client             │
│   • All SQL/queries live here; UI never talks to DB directly   │
└──────┬──────────────────────────────┬──────────────────────────┘
       │                              │
┌──────▼──────────┐          ┌────────▼───────────────────────────┐
│ Supabase        │          │ Supabase Storage (+ CDN)           │
│ Postgres        │          │ product-images bucket              │
│ products, admin │          │ public-read, admin-write           │
└─────────────────┘          └────────────────────────────────────┘
```

Key architectural decisions:

- **AD-1 — One app, two surfaces.** Public site and admin share a codebase and deployment. At single-admin scale, a separate admin app adds operational cost with no benefit.
- **AD-2 — Reads are static-first.** Product pages are rendered with ISR (incremental static regeneration) and revalidated on-demand whenever the admin mutates a listing (`revalidatePath('/products')`, `revalidateTag('product:{id}')`). Visitors get CDN-cached pages; the owner's edits appear within seconds.
- **AD-3 — Domain rules live in one place.** The condition/grade/status invariants (§6.3) are enforced in the domain layer *and* as Postgres CHECK constraints. Neither the admin UI nor a bug can persist an invalid product.
- **AD-4 — The only public write is the click counter.** Everything else that mutates data sits behind the admin session. This shrinks the attack surface to one endpoint, which is rate-limited and accepts nothing but a product id + channel enum.
- **AD-5 — No client-side data fetching for the catalog.** Filters are URL params rendered on the server. This keeps pages fast on low-end devices, shareable, and SEO-friendly.

## 8. Data Model (Postgres)

```sql
create type category_t   as enum ('PHONES','LAPTOPS','AUDIO','WEARABLES','CONSOLES','OTHER');
create type condition_t  as enum ('NEW','UK_USED','US_USED','NG_USED');
create type grade_t      as enum ('A','B','C');
create type status_t     as enum ('IN_STOCK','OUT_OF_STOCK','AVAILABLE','SOLD');
create type stock_type_t as enum ('RESTOCKABLE','UNIQUE_UNIT');

create table products (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  category              category_t not null,
  brand                 text not null,
  condition             condition_t not null,
  cosmetic_grade        grade_t,           -- null iff condition = NEW
  price_ngn             integer not null check (price_ngn > 0),
  description           text,
  stock_type            stock_type_t not null,
  status                status_t not null,
  quantity              integer,           -- only for RESTOCKABLE
  is_visible            boolean not null default true,
  whatsapp_click_count  integer not null default 0,
  instagram_click_count integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint grade_matches_condition check (
    (condition = 'NEW' and cosmetic_grade is null)
    or (condition <> 'NEW' and cosmetic_grade is not null)
  ),
  constraint status_matches_stock_type check (
    (stock_type = 'RESTOCKABLE' and status in ('IN_STOCK','OUT_OF_STOCK')
       and quantity is not null and quantity >= 0)
    or (stock_type = 'UNIQUE_UNIT' and status in ('AVAILABLE','SOLD')
       and quantity is null)
  ),
  constraint new_is_restockable check (
    (condition = 'NEW' and stock_type = 'RESTOCKABLE')
    or (condition <> 'NEW' and stock_type = 'UNIQUE_UNIT')
  )
);

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  storage_path text not null,
  sort_order  smallint not null default 0
);

create table admin_account (
  id            smallint primary key default 1 check (id = 1),  -- hard single row
  username      text not null,
  password_hash text not null
);

create index idx_products_catalog
  on products (is_visible, category, condition, price_ngn);
create index idx_products_search
  on products using gin (to_tsvector('simple', name || ' ' || brand || ' ' || coalesce(description,'')));
```

Notes:

- `check (id = 1)` on `admin_account` makes "exactly one admin" a database guarantee, not a convention.
- Click counters are simple integer columns per the lightweight-analytics requirement; if per-day trends are ever wanted, add an append-only `click_events(product_id, channel, created_at)` table later without touching the counters.
- The three CHECK constraints encode the entire taxonomy from §5 of the context doc; an invalid combination (e.g. a NEW item with grade B, or a pre-owned item with a quantity) cannot exist.

## 9. API Surface

Admin mutations are Next.js Server Actions (co-located with forms, session-checked). The explicit HTTP endpoints are minimal:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/products/:id/click` | none (rate-limited) | Increment whatsapp/instagram click count. Body: `{"channel":"whatsapp"|"instagram"}` |
| POST | `/api/admin/login` | credentials | Verify password hash, set session cookie |
| POST | `/api/admin/logout` | session | Clear session |

Server Actions (admin session required): `createProduct`, `updateProduct`, `deleteProduct`, `setStatus`, `setVisibility`, `reorderImages`, `uploadImage` (returns signed upload URL for Supabase Storage; client uploads directly, then registers the path).

The click endpoint:

```ts
// app/api/products/[id]/click/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { channel } = await req.json().catch(() => ({}));
  if (channel !== "whatsapp" && channel !== "instagram") {
    return new Response(null, { status: 400 });
  }
  if (!(await rateLimit(req))) return new Response(null, { status: 429 });

  await repo.incrementClick(params.id, channel); // UPDATE ... SET x = x + 1
  return new Response(null, { status: 204 });
}
```

## 10. Analytics

- Scope: per-product click counts for WhatsApp and Instagram CTAs. Nothing else. No cookies, no fingerprinting, no PII — this is a stated product requirement, and it also means no consent banner is needed.
- Fired via `sendBeacon` on CTA click (survives immediate navigation to wa.me).
- Rate limiting (per-IP token bucket, generous limits) keeps a bored visitor or bot from inflating counts; perfect accuracy is not required — the numbers guide restock/pricing intuition, they are not billing data.
- Displayed in the admin dashboard as a sortable column; that is the entire v1 analytics feature.

## 11. Design Guidelines

### 11.1 Design intent

The visual identity has one job: make a pre-owned electronics purchase from a stranger's website feel safe. Everything below serves that — honest photography given more space than decoration, grading presented like a spec sheet rather than marketing, and the physical store treated as a design element, not a footer afterthought. The aesthetic reference point is Computer Village itself: dense, energetic, dealt in the open — cleaned up, not sanitized into a generic Shopify look.

### 11.2 Color

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#141518` | Primary text, dark surfaces |
| `--paper` | `#FAFAF7` | Page background (warm off-white, kind to product photos) |
| `--brand` | `#0B7A3E` | Brand green — headers, links, primary accents (echoes both the Naira and WhatsApp's territory without cloning WhatsApp's exact green) |
| `--whatsapp` | `#25D366` | Reserved exclusively for the WhatsApp CTA — never used elsewhere, so the button is always instantly recognizable |
| `--amber` | `#D98E04` | Pre-owned condition badges, warm highlights |
| `--sold` | `#8A8F98` | SOLD state — desaturation, badges |

Rules: product photos supply the color; the UI stays quiet around them. `--whatsapp` appears exactly once per screen. Error/danger states (admin delete) use a standard red (`#C4372F`) that never appears on the public site.

### 11.3 Typography

- **Display / headings:** a confident grotesque with personality (e.g. *Space Grotesk*) — used for the wordmark, page titles, and prices. Prices are typographic events: the largest text on a product page after the name.
- **Body / UI:** a highly legible workhorse (e.g. *Inter*), 16px base, 1.5 line height. Nigerian traffic skews mobile; never below 14px for functional text.
- **Numerals:** tabular figures for prices everywhere (`font-variant-numeric: tabular-nums`) so ₦ amounts align in grids and the admin table.
- Naira sign: always the real `₦` glyph in UI (both candidate fonts support it); the owner's formatting preference (§14) only affects thousands-separator style, not the symbol.

### 11.4 Condition & grade badge system

This is the signature UI component — the thing customers scan for before anything else.

```
┌──────────────────────────┐   ┌─────────────────┐   ┌──────────────────────┐
│ BRAND NEW                │   │ UK USED · A     │   │ NAIJA USED · C       │
│ solid --brand, white txt │   │ --amber outline │   │ --amber outline      │
└──────────────────────────┘   └─────────────────┘   └──────────────────────┘
```

- NEW: solid green pill. Pre-owned: amber-outlined pill, always showing origin + grade together ("UK Used · Grade A") — never one without the other.
- Each badge on the product page has a tap/hover glossary line: A = "Excellent — little to no visible wear", B = "Good — light signs of use, fully functional", C = "Fair — visible wear, fully functional, priced accordingly". Same wording everywhere, sourced from one constants file.
- SOLD: grey diagonal ribbon across the card/gallery corner + card desaturated via CSS filter. OUT OF STOCK: grey pill, no desaturation (the product photo is still representative since it's restockable).

### 11.5 Layout & components

- **Product card:** photo (4:3, `object-fit: cover`), name (2-line clamp), badge row, price. Entire card is the tap target.
- **Catalog grid:** 2 columns on mobile, 3–4 on desktop. Filters collapse into a bottom-sheet on mobile with an "Apply" button (avoid re-rendering on every toggle over slow connections).
- **Product page, mobile:** gallery first (edge-to-edge swipe), then name → badges → price → warranty line → description → similar items. The WhatsApp CTA is a **sticky bottom bar** — visible in every scroll position, `--whatsapp` green, full width, with the Instagram link as a quiet secondary beside/below it.
- **Trust strip:** warranty + physical store + delivery, repeated on home and product pages as a compact single-line (mobile: horizontally scrollable) band.
- **Admin:** utilitarian, table-first, zero decoration. Same type system, denser spacing. Optimized to work one-handed on the owner's phone.

### 11.6 Imagery guidelines (for the owner)

- Pre-owned: 3–5 photos of the *actual unit* — front, back, screen on, any wear close-ups. Honest wear photos raise conversion for graded listings; hiding flaws creates chat friction later.
- New: 1–3 photos; manufacturer/stock photos acceptable.
- Consistent background where possible (plain surface); the upload flow compresses client-side so phone photos are fine.

### 11.7 Accessibility & performance floor

- All interactive elements ≥ 44px tap targets; visible keyboard focus; badge colors meet WCAG AA against their backgrounds; SOLD state never communicated by color alone (always the text ribbon).
- `prefers-reduced-motion` respected (gallery snap without animation).
- Budget: product page ≤ ~150KB JS, LCP image served responsive via `next/image` (AVIF/WebP), lazy-load below the fold. Target: usable on a mid-range Android over 3G.

## 12. Security

- Admin session: httpOnly + Secure + SameSite=Lax cookie; server-side session validation in Next.js middleware for `/admin/**` and in every Server Action (defense in depth — middleware alone is not sufficient).
- Password: argon2id (or bcrypt cost ≥ 12). Login rate-limited. Generic error message on failure.
- Supabase access: the browser never receives a Supabase key with write access. Public reads go through server rendering; image uploads use short-lived signed URLs minted by an authenticated Server Action. If Supabase RLS is enabled, policies are: `products`/`product_images` public `select` where visible, all writes service-role only.
- Input validation with a schema library (e.g. zod) at every boundary; DB CHECK constraints as the last line.
- Standard headers: CSP (self + Supabase storage + maps domain if embedded), X-Content-Type-Options, Referrer-Policy.
- The click endpoint accepts only `{channel}` against a whitelist and a UUID route param — nothing user-authored is stored from the public internet.

## 13. Implementation Plan

**Milestone 1 — Foundation (week 1):** repo setup, schema + constraints migrated, seed script, domain layer (taxonomy, formatting, slug, state machines) with unit tests.

**Milestone 2 — Admin panel (week 2):** login/session, dashboard table, create/edit form with photo upload + reorder, status/visibility toggles. *Admin ships before the public site* so the owner can start entering the real catalog immediately.

**Milestone 3 — Public catalog (weeks 3–4):** home, catalog grid + filters + search, product page with gallery, WhatsApp deep link + click beacon, contact page, SOLD/OOS states, ISR revalidation wiring.

**Milestone 4 — Polish & launch (week 5):** design pass per §11, performance audit on a real mid-range Android, SEO (per-product meta + OpenGraph images so WhatsApp link previews show the product photo and price — this materially helps a chat-to-sell business), analytics column in admin, deploy, owner walkthrough.

Definition of done for v1 launch:

- Owner can create a pre-owned listing with 4 photos from their phone in under 2 minutes.
- Visitor on mobile can go from landing to an open WhatsApp chat with a prefilled product message in ≤ 3 taps.
- A shared product link for a sold unit still resolves and shows SOLD.
- Invalid taxonomy combinations are rejected by both the form and the database.
- WhatsApp link previews (OpenGraph) render photo + name + price.

## 14. Open Items to Confirm with Owner

1. **₦ formatting** — `₦450,000` vs `N450,000` (context doc flags this as the single unconfirmed item). Recommendation: `₦450,000` on-site; in the WhatsApp prefill, either encodes fine (`₦` = `%E2%82%A6`).
2. Whether to append the product URL to the WhatsApp prefill (recommended in §5.5) — one-line confirmation.
3. Featured products on home: newest-first (v1 proposal) vs. an admin "feature" toggle (small addition if wanted).

---

*End of document. All requirements trace to the owner-confirmed `MOGADGET.md`; sections 7–13 are the proposed implementation of those requirements and are open to revision — in particular, to be re-aligned with the Adverta system's patterns once its reference documentation is provided.*
