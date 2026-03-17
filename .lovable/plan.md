

# Analysis: "Needs Attention" Card Bugs

## Bug 1: Stale fallback to deleted `change_order` config (line 100)

```typescript
const config = typeConfig[item.type] || typeConfig.change_order;
```

The fallback `typeConfig.change_order` was removed in the last cleanup, so this evaluates to `undefined`. If an unknown type somehow appeared, the component would crash trying to read `.borderColor` from `undefined`. The fallback should be `typeConfig.invoice` or simply removed since the types are now constrained to `'invoice' | 'invite'`.

**Fix**: Change line 100 to `const config = typeConfig[item.type];` — the union type guarantees a match.

## Bug 2: Duplicate invites shown

Pending invites are passed to the card in **two** separate props: `attentionItems` (which includes items with `type: 'invite'` from sent invites at lines 309-319 of the hook) and `pendingInvites` (incoming invites at line 293). The card merges both arrays (lines 62-78), so invites appear in both lists if the same project invite exists in both queries. However, these are actually different things — `attentionItems` invites are **outgoing** invites the user sent, while `pendingInvites` are **incoming** invites to respond to. The naming is confusing but not a data duplication bug.

**No code change needed**, but the outgoing invite items should perhaps have a different label than "invite" to distinguish them. Low priority.

## Bug 3: Badge count includes both `attentionItems` and `pendingInvites` but only 5 items rendered

The badge at line 87 shows `allItems.length` (total count), but line 99 renders `allItems.slice(0, 5)`. If there are more than 5 items, the badge implies more exist but there's no "View all" link or indication of truncation.

**Fix**: Add a "View all" link or "+N more" indicator when `allItems.length > 5`.

## Summary of Fixes

### `src/components/dashboard/DashboardNeedsAttentionCard.tsx`
1. **Line 100**: Remove stale `typeConfig.change_order` fallback → `const config = typeConfig[item.type];`
2. **After the `.slice(0,5).map()` block**: Add a "+N more" indicator when items exceed 5

Both are small, safe changes.

