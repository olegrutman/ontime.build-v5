

# Unify Design System: One Font Stack, One Spacing System, Every Page

## The Problem

The app currently has **three conflicting font configurations** pulling in different directions:

- **Body text**: Some pages use DM Sans (from CSS), others inherit system fonts, some use no explicit font
- **Headings**: Some use `font-heading` class (Barlow Condensed), others use `style={DT.heading}` inline styles, others use plain `font-bold` with no heading font at all
- **Monospace/numbers**: Tailwind config says Space Mono, but 24 files use inline `style={{ fontFamily: "'IBM Plex Mono', monospace" }}` — neither is applied consistently
- **Card radii**: Mixed `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` across different pages
- **Spacing**: Each page picks its own padding and gap values
- **Wizards**: `WizardProgress` component, `CreateRFIDialog`, `ProjectScopeWizard`, `ContractScopeWizard`, `ProjectDetailsWizard`, and `CreateProjectNew` all have different step indicator styles, footer layouts, and spacing

## The Standard (what everything should match)

Based on the Dashboard and Project Overview — the most polished pages — the canonical design is:

| Element | Standard |
|---------|----------|
| Body font | **DM Sans** |
| Heading font | **Barlow Condensed** (bold/black, uppercase for section labels) |
| Mono/numbers | **IBM Plex Mono** (financial figures, PO numbers, codes) |
| Card radius | **rounded-2xl** everywhere |
| Card border | `border border-border/60 shadow-sm` |
| Section labels | `text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium` |
| Page padding | `px-4 lg:px-5 py-4` |
| Grid gaps | `gap-3` between cards, `gap-2` inside cards |
| Button height | `min-h-[44px]` (touch target) |

## Plan — 4 phases, every file listed

### Phase 1: Fix the font foundation (3 files)

**Problem**: Three places define fonts and they disagree.

1. **`index.html`** — Update Google Fonts import to load DM Sans + Barlow Condensed + IBM Plex Mono (drop the duplicate Barlow Condensed link, add DM Sans)
2. **`index.css`** — Consolidate the `@import` Google Fonts URL to match. Set `body` to DM Sans, headings to Barlow Condensed. Update CSS custom properties `--font-mono` to IBM Plex Mono
3. **`tailwind.config.ts`** — Change `font-mono` from Space Mono to IBM Plex Mono. Keep `font-sans` as DM Sans, `font-heading` as Barlow Condensed. Remove Lora/serif (unused)

After this, `font-mono` in Tailwind classes will render IBM Plex Mono everywhere, eliminating the need for inline `fontFamily` styles.

### Phase 2: Remove all inline font styles (24+ files)

Replace every `style={{ fontFamily: "'IBM Plex Mono', monospace" }}` with `className="font-mono"`. Replace every `style={DT.heading}` with `className="font-heading"`.

**Files to update** (all inline `fontFamily` references):

| File | What changes |
|------|-------------|
| `design-tokens.ts` | Remove `mono` and `heading` style objects; keep class-name tokens only |
| `ui/kpi-card.tsx` | `style={...IBM Plex}` → `className="font-mono"` |
| `dashboard/DashboardMaterialsHealth.tsx` | Same swap |
| `dashboard/DashboardRecentDocs.tsx` | Same swap (2 instances) |
| `dashboard/supplier/SupplierActionQueue.tsx` | Same swap |
| `dashboard/DashboardBudgetCard.tsx` | Ensure `font-heading` class |
| `project/COImpactCard.tsx` | Same swap |
| `project/MaterialsCommandCenter.tsx` | Same swap (2 instances) |
| `project/CompactAlertBar.tsx` | Verify classes |
| `app-shell/BottomSheet.tsx` | Same swap |
| `demo-v2/ProjectCard.tsx` | Same swap (2 instances) |
| `change-orders/COListPage.tsx` | `style={...Barlow}` → `className="font-heading"` |
| `PurchaseOrders.tsx` | Same swap (2 instances) |
| `framing-scope/` sections (multiple) | `style={DT.heading}` → `className="font-heading"` |
| `project-setup/ProjectInfoCard.tsx` | Same swap |
| All other files found in the search | Same pattern |

### Phase 3: Unify card radius and spacing (every page)

Standardize all cards to `rounded-2xl` and consistent spacing.

| Page/Component | Current | Change to |
|---|---|---|
| `ProjectHome.tsx` setup banner | `rounded-3xl` | `rounded-2xl` |
| `ProjectDetailsWizard.tsx` type cards | `rounded-xl` | `rounded-2xl` |
| `ProjectDetailsWizard.tsx` toggle buttons | `rounded-lg` | `rounded-xl` |
| `Auth.tsx` alert boxes | `rounded-lg` | `rounded-2xl` |
| `AdminSuppliers.tsx` supplier cards | `rounded-lg` | `rounded-2xl` |
| `Settings.tsx` | Uses default Card (no explicit radius) | Ensure Card component uses `rounded-2xl` |
| `EstimateApprovals.tsx` | `rounded-lg` | `rounded-2xl` |
| `SupplierProjectEstimates.tsx` | `rounded-lg` | `rounded-2xl` |
| `PurchaseOrders.tsx` | Mixed | `rounded-2xl` |
| `Financials.tsx` | Inherits from Card | Verify `rounded-2xl` |
| `RFIs.tsx` | Verify | `rounded-2xl` |
| `CODetail.tsx` | Verify | `rounded-2xl` |
| `MaterialOrders.tsx` | Verify | `rounded-2xl` |
| `OrgTeam.tsx` | Verify | `rounded-2xl` |
| `PartnerDirectory.tsx` | Verify | `rounded-2xl` |
| `Profile.tsx` | Verify | `rounded-2xl` |
| `Reminders.tsx` | Verify | `rounded-2xl` |
| `EditProject.tsx` / `EditProjectScope.tsx` | Verify | `rounded-2xl` |
| `OrderApprovals.tsx` | Verify | `rounded-2xl` |
| `ui/card.tsx` (base component) | Update default className to `rounded-2xl` so all pages inherit it |
| `design-tokens.ts` | Change `cardWrapper` from `rounded-lg` to `rounded-2xl` |

### Phase 4: Unify all wizards (6 wizards)

Every wizard should use the same shell: `WizardProgress` at top, consistent step content area padding, and a standard sticky footer.

| Wizard | Current issues | Standardize to |
|---|---|---|
| `WizardProgress` (shared component) | Works but needs font-heading on step labels | Add `font-heading` to step number circles, step labels |
| `ProjectScopeWizard.tsx` | Custom sticky banner + footer | Use shared `WizardProgress`, `px-4 py-4` content, standard footer with `min-h-[44px]` buttons |
| `ProjectDetailsWizard.tsx` (889 lines) | No `WizardProgress` component, custom step UI | Integrate `WizardProgress`, standardize card radius and fonts |
| `ContractScopeWizard.tsx` | Uses `WizardProgress` but custom layout | Standardize padding and footer |
| `CreateProjectNew.tsx` | Custom step indicator, `WizardSummaryPanel` | Integrate `WizardProgress`, keep summary panel |
| `CreateRFIDialog.tsx` | Uses `WizardProgress` inside dialog — good | Verify font consistency |
| Change Order wizard (`COWizardDialog.tsx`) | Verify | Standardize fonts and spacing |

## Files NOT changing
- Business logic, data fetching, routing
- Mobile bottom nav
- Color palette and theme variables
- Component behavior

## Summary of scope

- **~30+ component files** getting inline font styles replaced with Tailwind classes
- **~20 page files** getting card radius and spacing standardized
- **6 wizard files** getting unified step indicators and layouts
- **3 config files** getting font stack consolidated
- Total: ~50 files touched, zero logic changes

