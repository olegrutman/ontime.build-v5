# POS Adapters: BisTrack, Spruce, SupplyPro — what it really takes

## TL;DR

You don't have to integrate with three platforms. You have to integrate with **one shape of data** (PO, ack, ASN, invoice, item master) plus **two transports** (EDI X12 over file/SFTP and modern REST). All three vendors converge on those.

- **Epicor BisTrack** — modern REST API (OAuth, JSON), separately licensed by the dealer. Best path is the BisTrack API; EDI 850/856/810 also supported.
- **ECi Spruce** — has a REST API ("Spruce API") but most field deployments still run on **EDI X12** (850 PO, 855 ack, 856 ASN, 810 invoice, 832 price catalog). Vendor partners like Saberis broker most third-party flows.
- **Hyphen SupplyPro / BuildPro** — public REST API exists (saw the docs: BuildPro Integration APIs, BRIX APIs, Wallet API). Geared at production homebuilders, not yards. SupplyPro Connect is the bridge to a yard's ERP.

So "even an export-only adapter would unlock real adoption" is the right framing — and **export-only via EDI files is ~80% of the win for ~20% of the effort**, because every yard already knows how to ingest a PO PDF, an 850, or a CSV from a vendor.

## What "export-only" means in practice

For each PO the GC/TC sends through your app, the **supplier** can:
1. Open the PO in the app and click **Export → BisTrack / Spruce / SupplyPro**, or
2. Receive the PO automatically in their POS inbox (push), or
3. Have your app drop a file into an SFTP folder their POS watches nightly.

The supplier's POS then creates the sales order on their side. **No two-way sync, no inventory pull, no price book pull.** That's it. Round-trip (ASN, invoice) is Phase 2.

## Three delivery modes, ranked by how fast a real yard will adopt

| Mode | Friction for yard | Friction for you |
|------|-------------------|------------------|
| **A. Email PDF + CSV attachment** to a yard inbox (`orders@yardname.com`) | Zero — they already do this | Zero — you have `send-po` already |
| **B. SFTP drop of an X12 850 file** in a folder their POS polls | Medium — yard IT sets up folder + mapping once | Medium — write an X12 850 generator |
| **C. Direct API push** (BisTrack REST, Spruce API, SupplyPro Connect) | Low — once mapped, fully automated | High — per-vendor auth, schemas, sandbox, certification |

A real lumber-yard rollout looks like: ship A on day one, B for the yards big enough to care (top 20%), C only for the 2-3 anchor accounts that justify the engineering quarter.

---

## Phased build plan

### Phase 0 — "Adapter-ready" foundation (1 sprint)

Without this, every later phase is more painful.

- New table `external_po_exports`: `po_id`, `target_system` (`BISTRACK | SPRUCE | SUPPLYPRO | EMAIL_PDF | EDI_850 | CUSTOM`), `status` (`QUEUED | SENT | ACK | FAILED`), `payload_url` (storage), `external_ref`, `last_error`, timestamps.
- New table `supplier_integrations`: per `supplier.id` → `target_system`, `transport` (`EMAIL | SFTP | API`), encrypted creds JSONB, `vendor_code_map` JSONB (their internal customer ID for this GC).
- A normalizer (`buildPoExportPayload(po_id)`) that pulls a PO + lines + GC + supplier + tax + delivery info into a single canonical JSON. **Every adapter consumes this**, so adding a new POS later is just one more renderer.
- New page `/supplier/integrations` to manage these per supplier.
- Notification type `PO_EXPORT_FAILED` so the supplier sees retries instead of silence.

### Phase 1 — Email/PDF + CSV adapter (Mode A) — **ship this first**

Trivially the highest ROI.

- Extend the existing `send-po` edge function with an "Also send to yard inbox" address per supplier.
- Generate a paired **`po-<number>.csv`** alongside the PDF — column set matches what BisTrack/Spruce/SupplyPro all accept on import: `vendor_sku, description, qty, uom, unit_price, line_total, ship_date, ship_to, customer_po, notes`.
- Effort: **S** (1-2 days). Hits ~60% of yards immediately because every yard's order desk already lives in email.

### Phase 2 — EDI X12 generator (Mode B) — the real unlock

- Add an X12 generator (Deno, no SDK needed; X12 is just `*` and `~` delimited segments). Start with **850 (Purchase Order)** only — that's "export-only" by definition.
- New edge function `export-po-edi850` that takes a PO id, builds the 850, writes it to Supabase Storage (`edi-outbox/<supplier>/<po>.edi`), and either:
  - emails it as an attachment, or
  - pushes via SFTP if the supplier configured one (use `npm:ssh2-sftp-client`).
- Required X12 segments for an 850: ISA / GS / ST / BEG / REF / DTM / N1 (ship-to, bill-to) / PO1 (line items) / CTT / SE / GE / IEA. Roughly 80 lines of code per renderer.
- BisTrack and Spruce both publish their **EDI mapping spec** (which qualifiers they expect for ship-to, UOM codes, etc.). One spec covers most yards on each platform.
- Add 832 (price catalog) **inbound** later if you want to pre-price POs from the yard's catalog — that's the real two-way upgrade.
- Effort: **M** (1 sprint for 850 + SFTP). Adds another ~25% of yards.

### Phase 3 — Vendor-specific REST adapters (Mode C)

Only build the one(s) where you have an anchor customer asking for it.

#### 3a. Hyphen SupplyPro Connect (easiest, public docs)
- Public REST API at `developer-docs.hyphensolutions.com`. Bearer-token auth.
- Map our PO → `BuildPro Integration` order endpoint; map our delivery → `BRIX` schedule endpoint; map our invoice → `Wallet` payment endpoint (later).
- Hyphen is a homebuilder-side platform, so this only matters if the GC is one of the production builders that uses BuildPro. When it does, **the dealer adoption is automatic** because the dealer already has a SupplyPro account.
- Effort: **M** (1-2 sprints).

#### 3b. Epicor BisTrack API
- REST + JSON, OAuth 2.0. Requires the dealer to have the **BisTrack API license** (separately sold by Epicor — confirm with the customer before starting).
- Endpoints needed for export-only: customer lookup, sales-order create, line-item add. ~6 calls.
- Need an Epicor sandbox tenant — typically requires the dealer to grant access; can take 2-4 weeks of partner paperwork.
- Effort: **L** (1 quarter end-to-end including cert).

#### 3c. ECi Spruce API
- REST API exists but is gated; ECi often routes integrators through partners (Saberis is the dominant one — most yards already pay them for vendor catalog ingestion).
- **Realistic shortcut:** instead of integrating with Spruce directly, **drop the EDI 850 file in the format Saberis already accepts**, and let the yard's existing Saberis subscription do the last mile into Spruce. Same for BisTrack.
- Effort: **L** direct, **S** via Saberis hand-off.

### Phase 4 — Round-trip (acks + ASN + invoice)

Only after suppliers have lived on Phase 1-2 for a while and ask for it.

- **855 PO Acknowledgement** inbound → flips your PO from `SUBMITTED` to `ACCEPTED` automatically.
- **856 ASN** inbound → creates `po_shipments` rows (the table from the supplier-roadmap Phase 2.3) with `qty_shipped`, BOL, scheduled delivery date.
- **810 Invoice** inbound → creates an `invoices` row in `DRAFT`, GC reviews and approves.
- Effort: **L**, but each segment is the same X12 work pattern as the 850.

---

## Engineering & ops realities to plan for

- **No "build once for all three"** — there's a normalizer in the middle, but each platform has its own UOM table, customer-ID format, and required-field quirks. Budget ~3 weeks per direct REST integration after the first one.
- **Each direct API integration needs a sandbox tenant from the vendor.** Budget 2-6 weeks of vendor paperwork; you cannot move faster than this.
- **Certification.** Hyphen and Epicor require partner-program enrollment if you want to be listed in their marketplace. Listing is what actually drives yard adoption — the engineering is half the battle, the marketplace listing is the other half.
- **EDI errors are silent.** You need a per-supplier dashboard for transmission status, retries, and parse errors. The `external_po_exports` table above is the substrate; the UI is half a day on top of it.
- **Customer-code mapping is the boring part that breaks everything.** "Apex Builders" in your app is `APEX01` in their POS. Build the `vendor_code_map` JSONB on `supplier_integrations` from day one and let the supplier edit it inline when an export fails.
- **Pricing field is the political part.** If your PO export sends a `unit_price`, the yard's POS will overwrite their own price book — most yards refuse this. Make `include_prices` an opt-in toggle per supplier integration; default OFF for EDI/API exports, ON only for the email/PDF path.

## Recommendation

1. **Ship Phase 1 (email + CSV) this week.** That alone closes the "supplier silently re-keys our PO into their POS" complaint for 60% of yards.
2. **Ship Phase 2 (EDI 850 export over SFTP/email) next quarter** — that closes another ~25%.
3. **Defer Phase 3 until you have a named anchor account** asking for direct SupplyPro/BisTrack push. When that customer shows up, do **SupplyPro first** (cheapest API, public docs, fastest cert).
4. **Skip direct Spruce integration entirely** for v1 — partner with Saberis or ship Spruce's expected EDI 850. The math doesn't justify the cert work yet.
5. **Don't promise round-trip until Phase 4.** The single biggest support burden for ERP integrations is broken acks; it's easier to add them on demand than to support them everywhere.

Net: realistically 1 sprint to delight 60% of yards, 1 quarter to delight 85%, and a full FY of vendor paperwork to delight the remaining 15% who specifically want native API push.