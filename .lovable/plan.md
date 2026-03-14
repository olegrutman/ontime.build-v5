

# Dead Code Cleanup Plan

## Audit Results

All items below have **zero active imports** outside their own folder/file. Confirmed via codebase-wide search.

## Deletions

### Entire Folders (delete recursively)

| Folder | Reason |
|---|---|
| `src/components/po-wizard/` | Replaced by `po-wizard-v2`. No external imports. |
| `src/components/project-wizard/` | Replaced by `project-wizard-new`. Only imported by `CreateProject.tsx` (old, see below). |
| `src/components/change-work/` | Zero imports anywhere. Replaced by `change-order-detail` + `change-order-wizard`. |

### Entire Pages

| File | Reason |
|---|---|
| `src/pages/CreateProject.tsx` | Not routed in `App.tsx` (replaced by `CreateProjectNew`). Only consumer of `project-wizard/`. |

### Types File

| File | Reason |
|---|---|
| `src/types/poWizard.ts` | Only imported inside `po-wizard/` (being deleted). |

### Individual Files in `change-order-wizard/`

The `ChangeOrderWizardDialog.tsx` renders everything inline — does NOT import the step files.

| File | Active Imports | Delete? |
|---|---|---|
| `LocationStep.tsx` | None (only in `index.ts`) | Yes |
| `TitleStep.tsx` | None | Yes |
| `DescriptionStep.tsx` | None | Yes |
| `WorkTypeStep.tsx` | None | Yes |
| `MaterialsStep.tsx` | None | Yes |
| `EquipmentStep.tsx` | None | Yes |

### Individual Files in `change-order-detail/`

| File | Active Imports | Delete? |
|---|---|---|
| `ChangeOrderHeader.tsx` | None (only in `index.ts`) | Yes |
| `ChangeOrderScopePanel.tsx` | None (only in `index.ts`) | Yes |

### Individual Files in `dashboard/`

| File | Active Imports | Delete? |
|---|---|---|
| `NeedsAttentionPanel.tsx` | None (only in `index.ts`) | Yes |
| `FinancialSnapshotTile.tsx` | None (only in `index.ts`) | Yes |
| `DashboardProjectsTable.tsx` | None (only in `index.ts`) | Yes |

## Barrel File Updates

### `src/components/change-order-wizard/index.ts`
Remove all 6 step exports. Keep only `ChangeOrderWizardDialog`.

### `src/components/change-order-detail/index.ts`
Remove `ChangeOrderHeader` and `ChangeOrderScopePanel` exports.

### `src/components/dashboard/index.ts`
Remove `FinancialSnapshotTile`, `NeedsAttentionPanel`, and `DashboardProjectsTable` exports.

## What Does NOT Change
- No routing changes (old `CreateProject` was already not routed)
- No component modifications — only deletions
- All active code (`po-wizard-v2`, `project-wizard-new`, `change-order-wizard/ChangeOrderWizardDialog`, etc.) untouched

