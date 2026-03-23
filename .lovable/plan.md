

# Replace FC/TC Labels with Company Names in CO Wizard & Detail Page

## Summary

The CO wizard and detail page use raw role abbreviations like "FC", "TC", "FC cost to TC", "TC labor" etc. These should show actual company names for clarity — the same pattern already applied elsewhere in the app.

## Changes

### 1. CO Detail Page — Fetch org names for the CO's orgs
**File: `src/components/change-orders/CODetailPage.tsx`**

Add two small queries to resolve org names:
- **CO owner org name**: Query `organizations` by `co.org_id` → e.g. "Smith Framing LLC"
- **Assigned org name**: Query `organizations` by `co.assigned_to_org_id` → e.g. "Apex Builders Inc"
- FC collaborator org name is already available from `collaborators[].organization?.name`

Then replace all hardcoded role labels:
- Line 244: `{role} view` → `{myOrgName} view`
- Line 258: `'TC labor'` → `'{myOrgName} labor'`
- Line 263: `'FC cost to TC'` → `'{fcOrgName} cost'` (get from active collaborator)
- Line 449: `"FC cost to TC"` → `"{fcOrgName} cost"`
- Line 450: `"TC labor"` → `"{myOrgName} labor"`
- Line 739: `"FC Pricing Base"` → `"{fcOrgName} Pricing Base"`
- Line 744: `"Use FC input as my pricing base"` → `"Use {fcOrgName} input as my pricing base"`
- Line 759: `"FC hours"` → `"{fcOrgName} hours"`
- Line 770: `"FC lump sum"` → `"{fcOrgName} lump sum"`

### 2. CO Wizard StepConfig — Use org names from fetched team data
**File: `src/components/change-orders/wizard/StepConfig.tsx`**

The component already fetches `tcMembers` and `fcMembers` with `org_name`. Use those names in labels:
- Line 38-50: PRICING_OPTIONS descriptions say "TC submits...", "TC logs hours...", "TC tracks hours..." — replace "TC" with the selected TC org name (for GC view) or "You" (for TC view)
- Line 96: `"Assign to Trade Contractor"` → `"Assign to"` (the dropdown already shows company names)
- Line 173: `"TC will be warned..."` → `"They will be warned..."`
- Line 186: `"Share this CO with TC immediately"` → `"Share immediately"` or use assigned org name
- Line 252: `"Field crew input needed"` → `"Field crew input needed"` stays (generic term is fine here) but line 253 hint `"FC will be able to..."` → `"They will be able to..."`
- Line 260: `"Assign Field Crew"` → `"Assign field crew"` (the dropdown shows company names)
- Line 363: `"Share with TC immediately"` → `"Share immediately"`
- Line 386: `"TC will build a material list..."` → `"They will build a material list..."`
- Line 413: `"{party} responsible"` buttons — replace with actual org name when available (e.g. "Smith Framing responsible" vs "Apex Builders responsible"), falling back to role if no name available
- Line 427: `"TC will add equipment costs..."` → `"They will add equipment costs..."`

### 3. CO Wizard StepReview — Use org names
**File: `src/components/change-orders/wizard/StepReview.tsx`**

- Line 58: Materials value `${data.materialsResponsible ?? '—'} responsible` — resolve to org name
- Line 61: Equipment value same pattern
- Line 63: `"FC Input"` → `"Field crew input"` or use assigned FC org name

## Technical Detail

For the detail page, add a simple org name query:
```tsx
const { data: coOrgName } = useQuery({
  queryKey: ['org-name', co?.org_id],
  enabled: !!co?.org_id,
  queryFn: async () => {
    const { data } = await supabase.from('organizations').select('name').eq('id', co!.org_id).single();
    return data?.name ?? '';
  },
});
const { data: assignedOrgName } = useQuery({
  queryKey: ['org-name', co?.assigned_to_org_id],
  enabled: !!co?.assigned_to_org_id,
  queryFn: async () => {
    const { data } = await supabase.from('organizations').select('name').eq('id', co!.assigned_to_org_id!).single();
    return data?.name ?? '';
  },
});
const fcCollabName = currentCollaborator?.organization?.name ?? 'Field crew';
const myOrgName = activeMembership?.organization?.name ?? role;
```

For the wizard, the `ResponsibilitySection` needs the assigned TC org name passed in. Since `StepConfig` already has `tcMembers`, derive names from the selected `assignedToOrgId`.

| File | Change |
|------|--------|
| `src/components/change-orders/CODetailPage.tsx` | Add org name queries, replace all FC/TC labels with company names |
| `src/components/change-orders/wizard/StepConfig.tsx` | Replace TC/FC in hints and labels with org names or neutral pronouns |
| `src/components/change-orders/wizard/StepReview.tsx` | Show org names instead of role codes in review summary |

