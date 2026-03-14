

# PO Wizard V2 — UI/UX Redesign

## Overview
Reskin all 3 screens (Header, Items, Review) and the ProductPicker sub-screens to match the uploaded HTML mockup's design language: selection trail breadcrumbs, amber progress bar, question-screen pattern for the catalog picker, pill-style filters, navy/amber color accents, and the Barlow Condensed + DM Sans typography. No changes to state management, data flow, API calls, or business logic.

---

## What Changes (Visual Only)

### 1. POWizardV2.tsx — Shell & Container
- Replace Dialog/Sheet `className` to remove padding, set `gap-0 overflow-hidden`
- Add a **selection trail** bar (`trail`) between the header and content showing filled breadcrumb chips (supplier name, pack name, item count) that update as the user progresses
- Add a thin **amber progress bar** (2px height, amber fill) below the trail, width driven by current screen (header=12%, items=50%, review=95%)
- Wrap screen content in a `wz-body` region with smooth `rise` entry animation (opacity+translateY, 220ms)

### 2. HeaderScreen.tsx — Redesign
- Replace step counter with the mockup's `q-header` pattern: uppercase faint label ("STEP 1 OF 3"), large Barlow Condensed title, muted subtitle
- Replace Card-based form fields with cleaner form groups (`form-g` pattern): label above, border input below, 6px radius
- Delivery Window: swap 3 full-width buttons for **pill toggles** (horizontal row, navy active state)
- Notes: swap Textarea card for simpler bordered textarea with placeholder
- Footer: replace full-width "Next" with right-aligned `btn-navy` ("Continue →") + left-aligned ghost "Cancel"

### 3. ItemsScreen.tsx — Redesign
- Replace step header with `q-header` pattern
- Pack source banner: use navy background with amber text for pack name, "Change Pack" as ghost button
- Item cards: tighten to single-row layout — name left, qty stepper inline, line total right-aligned. Remove full Card wrapper; use border-bottom separator style (matching `.li` rows in mockup)
- Inline qty steppers: small square buttons with `−`/`+`, narrow input centered, unit label pill
- "Add Another Item" CTA: dashed border card with icon, matching `.catalog-cta` style
- Totals summary: navy background bar at bottom showing subtotal in amber (matching `.qty-line-total`)
- Footer: "← Back" ghost left, "Review Order →" navy right

### 4. ReviewScreen.tsx — Redesign
- Replace stacked cards with mockup's `rev-block` pattern: section headers with "Edit ↗" links, key-value rows
- Items table: proper `<table>` with SKU, Item, Unit, Qty, Total columns. Pack group headers as amber row separators
- Totals: navy bar with amber total value (Barlow Condensed 900 weight)
- Footer: "← Back" ghost, "Send Draft" ghost, "📤 Submit PO" amber button

### 5. ProductPicker.tsx — Sub-screens
- **Source selection** (`source` step): keep two large buttons but style as `.ans` answer cards with icon, title, subtitle, arrow
- **CategoryGrid**: replace 2-col grid buttons with `.ans` answer cards (vertical list with icon, name, subtitle, item count, chevron)
- **SecondaryCategoryList**: same `.ans` card treatment
- **StepByStepFilter**: apply `q-screen` pattern — `q-header` with breadcrumb + "Step X of Y", filter options as `.pill` buttons (wrap layout) for short values or `.ans` cards for longer values
- **ProductList**: style product rows as `.ans` cards with SKU subtitle and chevron
- **QuantityPanel**: apply the mockup's `qty-screen` layout — product summary card at top, "From Your Estimate" budget block (est/ord/remaining with progress bar), big centered qty input with `−`/`+` steppers, navy line-total bar, and "Add Another" / "Done" dual buttons

### 6. Shared Styling (Tailwind classes + custom CSS)
Add a small CSS block (or Tailwind `@layer`) for:
- `font-family: 'Barlow Condensed'` on wizard headings and KPI values (already loaded in the project)
- Amber progress bar animation (`transition: width 0.35s ease`)
- Screen entry animation (`@keyframes rise`)
- Answer card hover state (`translateX(3px)`, amber border)
- Pill selected state (amber bg, navy text)
- Trail chip styles (navy filled, muted unfilled)

---

## Files to Modify

| File | Summary |
|---|---|
| `src/components/po-wizard-v2/POWizardV2.tsx` | Add trail bar + progress bar, animation wrapper |
| `src/components/po-wizard-v2/HeaderScreen.tsx` | Restyle to q-header + form-g + pill toggles |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Inline item rows, navy totals bar, dashed CTA |
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Table layout, rev-block sections, amber totals |
| `src/components/po-wizard-v2/ProductPicker.tsx` | Answer card source selection, header styling |
| `src/components/po-wizard-v2/CategoryGrid.tsx` | Vertical answer card list instead of 2-col grid |
| `src/components/po-wizard-v2/SecondaryCategoryList.tsx` | Answer card styling |
| `src/components/po-wizard-v2/StepByStepFilter.tsx` | q-screen pattern, pill buttons for values |
| `src/components/po-wizard-v2/ProductList.tsx` | Answer card product rows |
| `src/components/po-wizard-v2/QuantityPanel.tsx` | Big qty input, estimate budget block, navy total bar |
| `src/index.css` (or new CSS file) | Keyframes, trail/pill/ans custom utilities |

## What Does NOT Change
- All props, callbacks, state variables, and data types remain identical
- Screen navigation logic (`screen` state, `setScreen` calls) untouched
- All Supabase queries, data fetching, and mutations untouched
- ProductPicker step flow (`PickerStep` type and transitions) untouched
- Form data shape (`POWizardV2Data`, `POWizardV2LineItem`) untouched
- Mobile Sheet vs Desktop Dialog detection untouched
- Edit mode, pack load/clear, unmatched item editor logic untouched

