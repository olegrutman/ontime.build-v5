

# Fix: Organization Search Fails with Specific State/Trade Filters

## Problem
Some organizations have trailing whitespace in their `address->>'state'` values (e.g., `"CO "` instead of `"CO"`). The RPC uses an exact `ILIKE` match, so selecting "CO" from the dropdown doesn't match `"CO "`, causing those organizations to be excluded from results. When "Any state" is selected, the filter is skipped entirely, which is why it works.

## Fix

### Database Migration: Add TRIM() to the state and trade comparisons

Update the `search_organizations_for_join` function to trim whitespace before comparing:

```sql
WHERE
  (_state IS NULL OR _state = '' OR TRIM(o.address->>'state') ILIKE TRIM(_state))
  AND (_trade IS NULL OR _trade = '' OR TRIM(o.trade) ILIKE '%' || TRIM(_trade) || '%')
  AND (_query IS NULL OR _query = '' OR o.name ILIKE '%' || _query || '%')
```

### Data cleanup (same migration)
Also clean up existing dirty data:

```sql
UPDATE organizations
SET address = jsonb_set(address, '{state}', to_jsonb(TRIM(address->>'state')))
WHERE address->>'state' IS NOT NULL
  AND address->>'state' != TRIM(address->>'state');
```

This is a single migration with no frontend changes needed.

