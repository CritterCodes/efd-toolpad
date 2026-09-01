# Casting Vendor API — Carrera Casting via DigiFabster

**Status:** Research complete, build not started
**Date:** 2026-07-26
**Scope:** Programmatic submission of casting orders to Carrera Casting from EFD Admin

---

## TL;DR

Carrera Casting runs its ordering on **DigiFabster**, which has a fully documented public REST API
including a **customer-facing** path. EFD can authenticate with its existing Carrera storefront
account and drive upload → quote → order programmatically. No cooperation or API key from Carrera
is required.

The `quick-order-form` on carreracasting.com is a dead end — see below — and should not be built on.

---

## 1. Dead end: the ShareFile quick-order form

Investigated first; documented so nobody re-treads it.

`https://carreracasting.com/quick-order-form/` contains **no `<form>` element**. It embeds an iframe:

```
https://carreracasting.sharefile.com/remoteupload/52c8d9a8-3b4c-4d39-9bd5-eb6466ac899e
```

A Citrix ShareFile "request files" drop. Fields: Email, First Name, Last Name, Company,
"Casting Order Details?" (free text), plus a file dropzone. Submission is XHR to ShareFile's
upload-specification endpoint, which returns a short-lived signed `ChunkUri` that receives the bytes.

**Why not to use it:**

- **No receipt.** No order ID comes back. Nothing to write onto a Work Order, no way to reconcile
  "did Carrera receive PO-1234." Breaks the WO-as-ledger model.
- **Revocable + undocumented.** The GUID can be rotated at any time; ShareFile changes internal
  endpoints freely. Silent breakage on outbound vendor orders is the worst possible failure mode.
- **It's robo-filling a human's inbox**, not an integration. Those fields are free text a Carrera
  employee reads.
- ToS: scripting an anonymous upload endpoint isn't something Carrera agreed to.

The only email published on the site is **Expert@CarreraCasting.com** (footer `mailto:`),
plus (212) 869-8762, 64 West 48th St, New York NY 10036.

---

## 2. The real seam: DigiFabster

Current manual workflow: Jacob orders at
`https://app.digifabster.com/carrera-casting/widget/order`, signed in as `jacobaengel55@gmail.com`.

That URL yields the tenant identifier: **`company_name` = `carrera-casting`**.

### API base URL

```
https://digifabster.com/v2/
```

Not `app.digifabster.com` — that host only serves the SPA. Confirmed by extracting
`VITE_DF_API_BASE_URL:"https://digifabster.com"` from the widget bundle
(`app.digifabster.com/assets/index-By_lxV7N.js`).

### Documentation

- OpenAPI 2.0.0 spec (Redoc, ~320 endpoints): https://digifabster.com/docs/api.html
- Webhooks: https://digifabster.com/docs/webhook.html
- Marketing/API overview: https://digifabster.com/products/custom-workflow/

DigiFabster's own framing: *"an API-centric platform created so that most of operations with data
could be performed via API"*, explicitly listing "Custom widget for CAD files analyzing and
quotation" as a supported use case.

---

## 3. Authentication

Three token types. Tokens **expire after 7 days**. Passed as `Authorization: Token <token>`.

| Endpoint | Body | Use |
|---|---|---|
| `POST /v2/obtain_anonymous_auth_token/` | `{company_name}` | Anonymous — catalog reads, guest quoting |
| `POST /v2/obtain_auth_token/` | `{company_name, email, password, security_hash?}` | **Our path** — acts as the EFD account |
| `POST /v2/obtain_s2s_token/` | — | Server-to-server / root level (tenant-owner scope) |

Related: `/v2/2fa/setup/`, `/v2/2fa/verify/`, `/v2/obtain-magic-link/`,
`/v2/auth/create_session/`, `/v2/password/recovery/request/`.

### ⚠ Credential constraint

Auth is **password-based** — no OAuth, no scoped app key, no revocable per-app token.
The EFD account password must live in the secret store and be replayed on every token refresh.

- Store as env var (e.g. `DIGIFABSTER_PASSWORD`), never committed, never in the DB.
- Refresh token on `401`, cache for <7 days.
- If 2FA is enabled on the account, the flow routes through `/v2/2fa/verify/` instead.

---

## 4. Verified facts

All verified live on 2026-07-26 using an **anonymous** token. No EFD credentials were used and
no order was created.

```bash
curl -s -X POST 'https://digifabster.com/v2/obtain_anonymous_auth_token/' \
  -H 'Content-Type: application/json' \
  -d '{"company_name":"carrera-casting"}'
# → HTTP 200 {"token":"..."}
```

Confirmed:

- ✅ Tenant `carrera-casting` resolves; anonymous token issued
- ✅ Full material catalog readable with that token alone
- ✅ **Carrera has auto-quoting configured** — `/v2/price/material/`,
  `/v2/batch_price/material/`, `/v2/price/post_production/` are live.
  This means **instant prices, not an RFQ queue**.
- ✅ `/v2/company/` returns `403 You do not have permission` on an anonymous token (admin-scoped, expected)

---

## 5. Carrera's catalog — 5 technologies, 17 materials

Everything below is machine-readable from `GET /v2/technologies/`.
All materials: `accept_drawing = "not_accept"` (no 2D drawings).

### GOLDS — tech_id 2 — lead 3 days — lead_time uuid `15c37813-73f3-4fd3-aefa-7c48dcff1253`

| material_id | Title | Layer | Labor fee | postprod uuid |
|---|---|---|---|---|
| 23302 | 5KT Gold | 25 µm | $11.50 | `de09ffd7-cb63-4ec4-a8bc-52310fbf6730` |
| 23308 | 10KT Gold | 25.0 mu | $11.50 | `4bb3d860-9a1f-4024-91e8-8234b0248f27` |
| 23312 | 14KT Gold | 16.0 mu | $11.50 | `5d5c76b0-6cdd-4459-8280-13d96df6b82d` |
| 47632 | 18KT Gold | 16.0 mu | $11.50 | `f3bb1b45-3380-41bb-b74e-c90c6d168069` |
| 50894 | 19KT Gold | 16 µm | $11.50 | `5d1cdddd-8c08-401e-ad83-abc14eef55e0` |
| 50895 | 20KT Gold | 16.0 mu | $11.50 | `cbbcad29-c9fd-4750-8197-9f9a80ffb4b6` |
| 50911 | 22KT Gold | 16 µm | $11.50 | `80fdbbf5-1409-4743-8264-82e280466604` |
| 50912 | 24KT Gold | 16.0 mu | $11.50 | `4c19abab-edf6-43ed-941f-78b0c45b6712` |

### PLATINUMS — tech_id 8 — lead 3 days — lead_time uuid `0fbe40a4-bf0d-4f00-9b69-108be012d262`

Build envelope **140mm cube** (smaller than the rest).

| material_id | Title | Layer | Labor fee | postprod uuid |
|---|---|---|---|---|
| 23112 | PT Ruthenium | 100.0 mu | $15.50 | `98b354c6-c463-4ec6-9e2f-d91040ed1800` |
| 23401 | PT Cobalt | 100.0 mu | $15.50 | `34ebb12b-f172-4950-96d3-394c0b2920b5` |
| 23403 | PT Iridium | 100.0 mu | $15.50 | `ab84dbd3-2364-47c2-ad5c-27447d45eeae` |
| 23404 | PT Spring | 16.0 mu | $14.00 | `b6b2a159-a8d2-4dda-9066-4183e203f4b7` |

### PALLADIUM — tech_id 6 — lead 3 days — lead_time uuid `511ee10b-3114-4a9c-9810-6738fab0645a`

| material_id | Title | Layer | Labor fee | postprod uuid |
|---|---|---|---|---|
| 50926 | PALLADIUM | 25.0 mu | $11.50 | `41c6c08e-e341-4cac-850b-fb5bcefadc83` |
| 53228 | 14KT WH PD | 24.0 mu | $11.50 | `96b1b31b-e725-4f7c-9ed7-23f51b966efc` |
| 53243 | 18KT WH PD | 24.0 mu | $11.50 | `f02a6744-ee74-448c-853c-0bff30ee09d3` |

### SILVER — tech_id 1 — lead 4 days — lead_time uuid `1878e71b-8885-47a7-8b8b-ad572fc6f383`

| material_id | Title | Layer | Labor fee | postprod uuid |
|---|---|---|---|---|
| 23111 | Sterling Silver | High Quality | $11.50 | `abc872af-ca8f-4d6f-9ac7-6549fb9da020` |
| 23193 | G-Metal | 100.0 mu | $11.50 | `84b42442-8b74-4650-84d2-372408c581e4` |

### BRASS — tech_id 4 — lead 5 days — lead_time uuid `263fa251-b983-4c9c-8234-377247bd2b3b`

| material_id | Title | Layer | Labor fee | postprod uuid |
|---|---|---|---|---|
| 23113 | Brass / Bronze / WH Alloy | High Quality | $11.50 | `06aed792-7451-4220-a04e-113e292d79b9` |

### Catalog gotchas

- **`min_wall_thickness` is not trustworthy.** Values are 0.0 / 0.01 / 0.05 / 0.09 mm — clearly
  placeholders, not real DFM limits. Do **not** surface these to artisans as a wall-thickness gate.
  Use EFD's own CAD standards (see `cad-design-standards-sop.md`).
- **Build envelope**: 152.4mm cube (6") for everything except platinum at 140mm.
- The labor fee is a **required post-production line item**, not optional. Carrera's own note:
  *"this fee is for the Printing & Casting labor. You must include this with the metal price above
  for complete estimate."* So quote total = metal price + post-production labor.
- `spec_sheet_url` on each material points back to carreracasting.com service pages.
- Metal prices are dynamic (Carrera publishes London Fix AM on their site header). The price
  endpoints are the source of truth, not any cached number.

---

## 6. Order flow — endpoint map

| Step | Endpoint |
|---|---|
| Auth | `POST /v2/obtain_auth_token/` |
| Create upload job | `POST /v2/upload_job/` |
| Upload CAD | `POST /v2/upload_models/`, `POST /v2/upload_file/` |
| Poll analysis | `GET /v2/model_status/`, `GET /v2/full_model_status/` |
| Model CRUD | `/v2/models/`, `/v2/models/{id}/` |
| Orient / scale | `POST /v2/models/{id}/rotate/`, `/v2/models/{id}/scale/` |
| DFM | `POST /v2/wall_thickness/`, `POST /v2/models/{model_id}/ask_for_check/`, `/v2/price/dfm_features/` |
| Material discovery | `GET /v2/technologies/`, `GET /v2/suitable_materials/`, `/v2/preselection/` |
| Pricing | `POST /v2/price/material/`, `/v2/batch_price/material/`, `/v2/price/post_production/` |
| Create order | `POST /v2/orders/`, `/v2/orders/{id}/initial/` |
| **Submit order** | `POST /v2/orders/{id}/submit_initial_order/` |
| Promo code | `POST /v2/orders/{id}/apply_promocode/` |
| Attachments | `/v2/orders/{order_id}/attachments/` |
| **Repeat prior order** | `POST /v2/orders/{order_id}/repeat/` |
| Read own orders | `GET /v2/orders/`, `/v2/orders/{id}/` |
| Account | `/v2/clients/me/`, `/v2/clients/` |
| Shipping rates | `/v2/retrieve_delivery_rates/` |
| Questionnaire | `/v2/app/order-questionnaire/`, `/v2/app/settings/` |

Note the API has two families: bare `/v2/orders/...` (customer's own) and `/v2/users/orders/...`
(shop back-office view). **We only use the former.**

`/v2/orders/{order_id}/repeat/` is the high-value one for EFD — recasting a design already ordered
becomes a single call.

---

## 7. Open questions (unverified)

1. **Does the EFD account self-checkout, or does Carrera gate orders manually?**
   Determines whether `submit_initial_order` completes or parks the order for approval.
2. **Is 2FA enabled** on `jacobaengel55@gmail.com`? Changes the auth flow.
3. **Actual shape of the order payload** — the docs list endpoints; exact required fields for
   `orders/` + `initial/` + `submit_initial_order/` need one authenticated dry run to pin down.
4. **Webhooks** — can a *customer* subscribe to status changes on their own orders, or is that
   tenant-only? If tenant-only, EFD must poll `/v2/orders/{id}/` for status.
5. **Payment** — `/v2/payments/paypal_complete_order/` exists. Whether EFD's account is
   invoice-on-terms or pay-at-checkout determines if submission triggers a charge.
6. **Rate limits** — undocumented.

---

## 8. Risks & constraints

- 🔴 **Orders are real money and legally binding.** `submit_initial_order` must sit behind an
  explicit human confirmation in the UI. It must **never** fire automatically off a WO status
  transition. Everything upstream of submit (upload, analyze, quote) is free and reversible —
  build all of that first.
- 🟠 **Password in the secret store** (see §3). No way around it with the current API.
- 🟠 **7-day token expiry** — needs refresh-on-401 handling.
- 🟡 **Tell Carrera anyway.** Not for permission — it's their documented public API and our own
  account — but so machine-generated orders don't read as anomalous traffic, and so there's a
  human relationship if something goes wrong mid-order.
- 🟡 **Vendor lock is low.** DigiFabster is white-labeled by many job shops. If this is built as a
  generic adapter with `company_name` + credentials as config, any other DigiFabster-hosted casting
  house becomes a config swap — which makes multi-sourcing and vendor fallback cheap. Worth
  designing for from day one rather than hardcoding Carrera.

---

## 9. Recommended build plan

### Phase 1 — read-only adapter (no money at risk)
- Auth + token cache/refresh
- `GET /v2/technologies/` → catalog sync into EFD
- Map DigiFabster `material_id` → EFD `metalKey` / karat
- Surface lead times + labor fees
- **No order endpoints wired at all**

Deliverable: EFD knows Carrera's live casting catalog. Useful immediately even if nothing else ships.

### Phase 2 — quoting
- Upload an STL from a Design/Piece, poll analysis
- Call `/v2/price/material/` + `/v2/price/post_production/`
- Return a real vendor cost, still no order

Deliverable: live casting cost feeds the Design pricing recipe as vendor cost.

### Phase 3 — ordering, gated
- `orders/` → `initial/` → confirm dialog → `submit_initial_order/`
- Persist the returned order ID as a `vendorSubmission` on the Work Order
  (timestamp, payload, files, vendor order ID, response)
- Poll order status back onto the WO
- `repeat/` for recasts

---

## 10. EFD integration notes

- **Work Order is the anchor.** Whatever transport, record a `vendorSubmission` on the WO so the
  ledger stays the source of truth — never fire-and-forget. This is precisely what the ShareFile
  route could not provide and why it was rejected.
- **Pricing.** Per the design-pricing model, retail is a calculated recipe and never stored.
  Carrera's quote is a **vendor cost input** to that recipe (casting step), not a stored price.
- **Material mapping** is the real design work: DigiFabster's flat `material_id` list
  (17 entries, e.g. `23312 = 14KT Gold`) needs to map onto EFD's composed `metalKey` + karat.
  Note Carrera splits white-gold-by-palladium into its own technology (14KT WH PD / 18KT WH PD),
  which EFD models as a finish/alloy variant — the mapping is not 1:1.
- **Related docs:** `PRODUCTION_PIPELINE_VISION.md`, `cad-design-standards-sop.md`,
  `METAL_PRICING_SYSTEM.md`, `sprints.md`.

---

## Appendix — reproduce the research

```bash
# 1. anonymous token
TOKEN=$(curl -s -X POST 'https://digifabster.com/v2/obtain_anonymous_auth_token/' \
  -H 'Content-Type: application/json' \
  -d '{"company_name":"carrera-casting"}' | jq -r .token)

# 2. full catalog
curl -s 'https://digifabster.com/v2/technologies/' -H "Authorization: Token $TOKEN" | jq .

# 3. find the API base URL in the widget bundle (if it ever moves)
curl -s 'https://app.digifabster.com/assets/index-By_lxV7N.js' \
  | grep -oE 'VITE_DF_API_BASE_URL:"[^"]*"'
```

Interactive docs: https://digifabster.com/docs/api.html (Redoc; JS-rendered, needs a browser)
