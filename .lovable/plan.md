

# Replace All Abbreviations with Full Role Names

## Rule
No abbreviations (GC, TC, FC, SP, SUP) displayed anywhere in the app UI. Always show full names: "General Contractor", "Trade Contractor", "Field Crew", "Supplier".

## Files to Change

| # | File | What |
|---|------|------|
| 1 | `src/components/ui/role-badge.tsx` | Change `shortLabel` from `effectiveOrgType` to `ORG_TYPE_LABELS[effectiveOrgType]` (full name). Widen size classes to fit longer text. |
| 2 | `src/components/project/TeamMembersCard.tsx` | Replace `roleAbbrev` map values with full names, widen the label column |
| 3 | `src/components/project/ProjectOverviewTeamCard.tsx` | Same — replace `roleAbbrev` with full names |
| 4 | `src/components/project/ProjectTeamSection.tsx` | Same — replace `roleAbbreviations` with full names |
| 5 | `src/components/project/SupplierOperationalSummary.tsx` | Same — replace `roleAbbrev` with full names |
| 6 | `src/components/project/GCProjectOverviewContent.tsx` | Replace `roleAbbrev` with full names |
| 7 | `src/components/project/OverviewContractsSection.tsx` | Remove `roleAbbrev` function, use full role names directly |
| 8 | `src/components/landing/RolesSection.tsx` | Change icon values from `'GC'`/`'TC'`/`'FC'`/`'SP'` to full names |
| 9 | `src/components/change-orders/COTeamCard.tsx` | Replace abbreviation-based `roleCode` display with full org type labels |
| 10 | `src/constants/defaultRoleRules.ts` | Change table header labels from `gc`/`tc`/`fc`/`supplier` display to full names in `PlatformRoles.tsx` |
| 11 | `src/pages/platform/PlatformRoles.tsx` | Update `ROLE_LABELS` map to show full names instead of "GC"/"TC"/"FC" |

Internal code values (database `type` column, TypeScript union types like `'GC' | 'TC'`) remain unchanged — only the **displayed text** changes.

