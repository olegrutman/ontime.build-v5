

# Use Company Names Instead of Role Labels Throughout the App

## What This Means

Right now you see labels like "Trade Contractor → General Contractor" or "FC" or "Field Crew" everywhere — SOV headers, contract cards, scope split, invoices, etc. After this change, you'll see actual company names like "Smith Framing LLC → Apex Builders Inc" everywhere. Role labels (TC, FC, GC) will only appear as small secondary badges for context, not as the primary identifier.

## Changes

### 1. SOV Page — Contract Section Headers
**File: `src/pages/ProjectSOVPage.tsx`**

- Update the contract query (line 461) to join org names: add `from_org:organizations!project_contracts_from_org_id_fkey(name), to_org:organizations!project_contracts_to_org_id_fkey(name)`
- Pass org names to `SOVContractSection` via the contract prop
- Change `contractLabel` (line 82) from `${contract.from_role} → ${contract.to_role}` to use org names with role as a small badge:
  ```
  "Smith Framing → Apex Builders" with a small (TC → GC) badge
  ```

### 2. Downstream Contracts Card
**File: `src/components/project/DownstreamContractsCard.tsx`**

- Line 128: Change title from `Downstream Contracts (FC)` → `Downstream Contracts`
- Line 139: Already uses `m.invited_org_name || 'Field Crew'` — good, but change the fallback line 140 from hardcoded `"Field Crew"` to show the org name or nothing
- Line 113: Toast from `'✓ FC contracts saved'` → `'✓ Contracts saved successfully'`

### 3. Scope Split Card
**File: `src/components/project/ScopeSplitCard.tsx`**

- Line 133: Title stays "Scope Split" (fine)
- Line 142: Change `"assigned to FC"` → use `fcOrgs[0]?.name || 'Field Crew'`
- Line 143: Change `"kept by TC"` → `"kept by your team"`
- Line 148: Change `"your Field Crew"` → use org name
- Line 157: Dialog title from `"Split Scope — TC vs FC"` → `"Split Scope"` (org names shown in the description below)

### 4. Contracts Section
**File: `src/components/project/ProjectContractsSection.tsx`**

- Line 139: Change `{contract.from_role} → {contract.to_role}` to use org names (already available as `contract.from_org_name`/`contract.to_org_name` — they're fetched). Show role as a small secondary label.

### 5. Edit Project
**File: `src/pages/EditProject.tsx`**

- Line 615: Change `{contract.from_role} → {contract.to_role}` badge to use org names

### 6. Platform Project Detail (admin view)
**File: `src/pages/platform/PlatformProjectDetail.tsx`**

- Line 475: Change `{c.from_role} → {c.to_role}` — this view already fetches org names (`c.from_org.name`, `c.to_org.name`), just needs to use them as primary with roles as secondary

### 7. Project Relationships Card
**File: `src/components/project/ProjectRelationships.tsx`**

- Lines using `roleLabels` map — already shows org names as primary, but the role badges use abbreviations like "FC". Keep this as-is since it's structural relationship view.

### 8. `getContractDisplayName` utility
**File: `src/hooks/useContractSOV.ts`**

- Already prefers org names over roles (line 139-141). No change needed — this function is correctly implemented.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Fetch org names in contract query, show company names in SOV section headers |
| `src/components/project/DownstreamContractsCard.tsx` | Remove "FC" from title and toast, use org names |
| `src/components/project/ScopeSplitCard.tsx` | Replace "TC"/"FC" labels with actual company names |
| `src/components/project/ProjectContractsSection.tsx` | Show org names instead of role→role labels |
| `src/pages/EditProject.tsx` | Use org names in contract badge |
| `src/pages/platform/PlatformProjectDetail.tsx` | Use org names as primary label |

