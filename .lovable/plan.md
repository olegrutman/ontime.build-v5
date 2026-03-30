

# Delete Old SOV Versions on Regenerate

## What
When regenerating an SOV, the system currently keeps all previous versions visible (v1, v2, v3...), which confuses users. Instead, delete all old versions for that contract before creating the new one, so only the latest version is ever shown.

## Change

### `supabase/functions/generate-sov/index.ts` (~line 302)

Before creating the new SOV record, delete all existing SOV records and their items for the same project+contract:

```typescript
// Delete old SOV versions for this contract
const { data: oldSovs } = await admin
  .from("project_sov")
  .select("id")
  .eq("project_id", project_id)
  .eq("contract_id", contract.id);

if (oldSovs && oldSovs.length > 0) {
  const oldIds = oldSovs.map(s => s.id);
  await admin.from("project_sov_items").delete().in("sov_id", oldIds);
  await admin.from("project_sov").delete().in("id", oldIds);
}

// Always version 1 now
const newVersion = 1;
```

Also update the insert to set `previous_version_id: null` since there's no previous version anymore, and `sov_name: 'SOV v1'`.

### Files Changed
- `supabase/functions/generate-sov/index.ts` — delete old versions before creating new one

