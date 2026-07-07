# CONTEXT.md — MoGadget Website Architecture

Single-owner gadget catalog site. No marketplace, no third-party sellers, no cart/checkout.
Owner (admin) manages 100% of listings. Customers browse → click WhatsApp/Instagram → chat to order.

---

## 1. What the site is

A retail catalog website for **MoGadget**, a gadget shop based in Lagos, Nigeria, selling both
**brand new** and **pre-owned** electronics. It is **not** a marketplace — there is exactly
one seller (the owner), and only the owner can create, edit, or remove listings.

## 2. Who it serves

- **Customers**: anywhere in Nigeria. Delivery is nationwide, not Lagos-only.
- **Admin (owner)**: the single person who manages the entire catalog. No staff accounts,
  no multi-vendor support, no plans for either — keep the auth model deliberately simple
  (one admin login, not a role/permission system).

## 3. Core principle: this is a catalog, not a checkout

There is **no cart, no online payment gateway, no customer accounts**. The entire commercial
transaction happens off-site, in a chat. The website's only job is to:

1. Show products clearly and attractively (photos, price, condition).
2. Get the visitor into a WhatsApp or Instagram DM as frictionlessly as possible.

Anything that pulls scope toward "add to cart," "checkout," or "create an account" is
**explicitly out of scope** and should be resisted even if it feels like an obvious add-on later.

---

## 4. Product categories

- **Phones:** iPhone, Samsung, Google Pixel, Xiaomi
- **Laptops:** MacBook, HP, Dell, MSI, Asus, Alienware
- **Audio:** AirPods, AirPods Pro, AirPods Max, earbuds
- **Wearables:** smartwatches (Apple Watch, Pixel Watch)
- **Gaming consoles:** PlayStation, Xbox
- **Other:** powerbanks, Starlink, other gadget accessories

## 5. Product condition & grading taxonomy (new)

This is the single most important structural addition. New items and pre-owned items
behave differently and must be modeled differently:

| Type | Restockable? | Unit model |
|---|---|---|
| **New** | Yes | Many units of the same SKU, quantity-based |
| **Pre-owned** | No | Each unit is unique (1 physical item = 1 listing) |

**Condition grades (applies to `condition` field on every product):**

| Grade | Label | Meaning |
|---|---|---|
| `NEW` | Brand New | Sealed / factory new, full manufacturer warranty period applies on top of MoGadget's 1-month warranty |
| `UK_USED` | UK Used | Imported pre-owned unit, UK market origin, tested & inspected |
| `US_USED` | US Used | Imported pre-owned unit, US market origin, tested & inspected |
| `NG_USED` | Nigerian Used ("Naija Tokunbo") | Locally pre-owned unit, tested & inspected |

**Cosmetic grade (applies only when condition is not `NEW`):**

| Grade | Meaning |
|---|---|
| `A` | Excellent — little to no visible wear, screen/body near-perfect |
| `B` | Good — light signs of use (minor scuffs), fully functional |
| `C` | Fair — noticeable cosmetic wear, fully functional, priced accordingly |

Every pre-owned listing shows **condition + cosmetic grade** together, e.g.
"UK Used · Grade A" — this is what builds buyer trust and is the #1 thing customers
ask about before messaging.

## 6. Listing lifecycle

- **New items**: `IN_STOCK` / `OUT_OF_STOCK` (quantity-based; can be restocked, listing persists).
- **Pre-owned items**: `AVAILABLE` / `SOLD` (unique unit; once sold, listing flips to `SOLD`
  and stays visible — greyed out, badge shown — rather than being deleted. This avoids dead
  links when a listing has been shared on Instagram/WhatsApp, and doubles as social proof
  of past sales).

## 7. Pricing

Every product shows a **set price** on-site (no "message for price"). Currency: **Nigerian
Naira (₦)** — confirm formatting preference with owner (e.g. `₦450,000` vs `N450,000`),
but do not treat any other currency as in scope.

## 8. How customers order (primary flow)

1. Visitor lands on site → browses catalog (optionally filters by category, brand,
   condition, or price range).
2. Visitor opens a product page → sees photos, price, condition/grade, warranty note.
3. Visitor taps **"Chat on WhatsApp"** or **"DM on Instagram"**.
4. WhatsApp button opens a deep link with a **prefilled message** identifying the exact
   product (see §12), so the visitor doesn't have to type it manually.
5. Transaction, negotiation, and payment happen entirely inside the chat — off-platform.

No step in this flow touches a cart, checkout, or account system.

## 9. Warranty

1-month warranty on both new and pre-owned items. Shown once, prominently, at the
product-page level (not per-listing copy-paste text).

## 10. Delivery

- Free delivery within Lagos.
- Paid delivery for orders outside Lagos (exact fee handled in chat, not calculated on-site).

## 11. Payment methods

Cash and bank transfer — communicated in chat, not processed on-site.

## 12. WhatsApp deep-link (new — key UX mechanism)

Each product's "Chat on WhatsApp" button should link to:

```
https://wa.me/2348060248044?text=Hi%2C%20I%27m%20interested%20in%20the%20[Product%20Name]%20(%E2%82%A6[Price])%20listed%20on%20MoGadget
```

This pre-fills the visitor's message with the product name and price, removing all
friction between "interested" and "messaging." This is cheap to build and has an
outsized impact on conversion for a chat-to-sell model — treat it as a must-have, not
a nice-to-have.

## 13. Admin panel (new — single admin only)

A minimal, protected `/admin` section, accessible only to the owner:

- Single login (owner's credentials — no roles/permissions system, no invite flow).
- Create / edit / delete product listings.
- Upload multiple photos per listing (see §14).
- Set: category, brand, condition grade, cosmetic grade, price, stock/sold status,
  short description.
- Toggle a listing between visible / hidden (e.g. temporarily pull a sold-out new item
  without deleting its data).
- No approval workflows, no multi-user permissions — deliberately kept as simple as
  possible since there is exactly one operator.

## 14. Photos

Multiple images per listing are **required**, not optional — especially for pre-owned
items, where buyers need to see actual cosmetic condition (scratches, dents, screen
condition) before committing to a chat. Minimum recommendation: 3–5 photos per pre-owned
unit; 1–3 for new items (can reuse stock/manufacturer photos).

## 15. Browse, search & filter (new)

To keep the catalog usable as it grows:

- Filter by category (Phones, Laptops, Audio, Wearables, Consoles, Other)
- Filter by brand (within category)
- Filter by condition (New / UK Used / US Used / NG Used)
- Filter by price range
- Simple keyword search (e.g. "iPhone 13")

## 16. Analytics (new — lightweight)

Track WhatsApp/Instagram click-throughs per product (simple event count, no PII needed).
Gives the owner visibility into which listings actually drive interest — useful for
pricing and restock decisions. No customer accounts or personal data collection involved.

## 17. Physical store

**Address:** His Grace Plaza, 14 Francis Oremeji Street, Computer Village, Ikeja, Lagos State, Nigeria.

**Hours:** Monday to Saturday, ~9am–6pm.

Shown on a Contact/Visit Us page with a map embed (optional) — reassures buyers this is
a real, physical business, which matters a lot for pre-owned electronics trust.

## 18. Contact details

- WhatsApp / Phone: +2348060248044
- Instagram: [@Mo_gadgets](https://instagram.com/Mo_gadgets)
- Facebook: Mo Gadgets

## 19. Explicitly out of scope for v1

- Shopping cart / online checkout
- Online payment gateway (Paystack, Flutterwave, etc.)
- Customer accounts / login / order history
- Multi-vendor / marketplace features of any kind
- Multi-admin roles or staff permission tiers
- Reviews/ratings system (unless requested later)

---

## 20. Suggested data model (high-level)

```
Product
├── id
├── name
├── category        (Phones | Laptops | Audio | Wearables | Consoles | Other)
├── brand
├── condition        (NEW | UK_USED | US_USED | NG_USED)
├── cosmetic_grade    (A | B | C | null for NEW)
├── price             (₦, integer, no decimals)
├── description
├── images[]           (min 1, recommended 3–5 for pre-owned)
├── status             (IN_STOCK | OUT_OF_STOCK | AVAILABLE | SOLD)
├── stock_type          (RESTOCKABLE | UNIQUE_UNIT)
├── quantity            (only relevant if RESTOCKABLE)
├── created_at
├── updated_at
└── whatsapp_click_count   (analytics)

Admin
├── id
├── username
└── password_hash        (single record — one admin only)
```

## 21. Suggested tech approach (lightweight, matches single-admin scale)

- **Frontend:** Next.js (App Router) — SSR/SSG for fast product pages, good SEO if organic
  search becomes a goal later.
- **Backend/DB:** A simple managed Postgres (e.g. Supabase) is more than sufficient —
  this is a low-write, low-traffic single-tenant catalog, not a high-concurrency system.
- **Auth:** One admin account, simple session-based login — no need for a full
  role/permission framework given single-admin scope.
- **Image storage:** Object storage (S3/Supabase Storage) with a CDN in front for
  fast image loads on mobile (most Nigerian traffic will be mobile-first).
- **Analytics:** A simple `whatsapp_click_count` increment on button click is enough —
  no need for a full analytics platform for v1.

---

## 22. Open item to confirm with owner

- Preferred ₦ formatting style (e.g. `₦450,000` vs `N450,000`) — everything else in
  this document reflects information already confirmed directly by the owner.
