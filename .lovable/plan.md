
# Mobile-First Redesign: Unified Look Across All Pages

Make every page feel like the Dashboard -- compact, card-based, mobile-friendly, with a light gray background and collapsible sections.

## 1. Global Background Color

**File: `src/index.css`**
- Change `--background` from pure white (`0 0% 100%`) to light gray (`220 14% 96%`) in the light theme
- Keep `--card` as white so cards pop against the gray background

## 2. Constrain Content Width (Mobile-First on Desktop)

**File: `src/components/layout/AppLayout.tsx`**
- Wrap `{children}` in a container with `max-w-lg mx-auto` (or `max-w-xl`) so all pages render in a narrow, phone-like column even on desktop
- This gives every page the same mobile feel regardless of viewport

## 3. Work Order Cards: Remove Full Descriptions

**Files:**
- `src/components/project/WorkOrdersTab.tsx` -- remove `line-clamp-2` description from list-view cards; show only title, status badge, and work-type tags
- `src/pages/ChangeOrders.tsx` -- same treatment for the standalone Work Orders page cards
- `src/components/WorkItemCard.tsx` -- remove the `{item.description}` paragraph

## 4. Collapsible Sections on Every Page

Replace static section headings with collapsible groups using `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` (already installed via Radix).

Pages to update:

| Page | Sections to make collapsible |
|------|------------------------------|
| **Profile** (`src/pages/Profile.tsx`) | Personal Info, Organization, Pricing Defaults, Notifications, Security |
| **OrgTeam** (`src/pages/OrgTeam.tsx`) | Members, Invite New Member, Pending Invitations |
| **AdminSuppliers** (`src/pages/AdminSuppliers.tsx`) | Supplier list, Catalog panel |
| **PurchaseOrders** (`src/pages/PurchaseOrders.tsx`) | Orders list, PO Details |
| **PartnerDirectory** (`src/pages/PartnerDirectory.tsx`) | Organization groups, People groups |
| **ProjectHome overview** (`src/pages/ProjectHome.tsx`) | Team, Contracts, Scope cards in Zone B |
| **EstimateApprovals** (`src/pages/EstimateApprovals.tsx`) | Estimates list, Detail panel |
| **SupplierInventory** (`src/pages/SupplierInventory.tsx`) | Catalog items section |
| **SupplierProjectEstimates** (`src/pages/SupplierProjectEstimates.tsx`) | Estimates list, Detail |

Each collapsible section will have a chevron icon that rotates on open/close, consistent with the sidebar pattern already in `AppSidebar.tsx`.

## 5. Single-Column Stacked Layout

Convert pages that currently use side-by-side grids (`lg:grid-cols-3`, `lg:grid-cols-[1fr_360px]`) into a single stacked column within the narrow container:

- **Dashboard** (`src/pages/Dashboard.tsx`) -- stack Zone B (Financial card, Reminders) below Zone A
- **ProjectHome overview** -- stack Zone B below Zone A
- **PurchaseOrders** -- stack PO list above PO details (no side-by-side)
- **AdminSuppliers** -- stack suppliers list above catalog
- **ChangeOrderDetailPage** -- stack sidebar panels below main content
- **WorkItemPage** -- stack sidebar below main content

## 6. Consistent Page Padding and Spacing

Standardize all pages to use:
```
p-4 space-y-4 pb-20
```
(matching the Dashboard pattern, with bottom padding for the Sasha floating bubble)

## 7. Pages That Use Raw SidebarProvider (Not AppLayout)

Several pages bypass `AppLayout` and manually set up `SidebarProvider` + `AppSidebar`:
- `ProjectHome.tsx`
- `SupplierInventory.tsx`
- `SupplierProjectEstimates.tsx`
- `ChangeOrderDetailPage.tsx`
- `WorkItemPage.tsx`

These will be refactored to either use `AppLayout` or apply the same `max-w-lg mx-auto` + light-gray background wrapper for consistency.

## Technical Details

- No new dependencies needed -- all components (`Collapsible`, `Card`, etc.) already exist
- The `max-w-lg` constraint (roughly 512px) simulates a mobile viewport; can be adjusted to `max-w-md` (448px) or `max-w-xl` (576px) based on preference
- Dark mode `--background` will also be slightly adjusted to maintain contrast with cards
- All existing functionality (forms, dialogs, data fetching) remains unchanged -- this is purely a layout/visual pass
- Approximately 15-18 files will be modified
