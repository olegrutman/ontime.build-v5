

# Fix: "Needs Attention" card shows Accept/Decline on sent invites

## The Bug

The card merges two different kinds of invites into `allItems` and treats them identically:

1. **Sent invites** (from `attentionItems`, type `'invite'`) — invites the current org sent to other orgs. These should NOT have Accept/Decline buttons. The user is waiting for a response, not making a decision.
2. **Incoming invites** (from `pendingInvites` prop) — invites TO the current org. These correctly need Accept/Decline buttons.

Both get `type: 'invite'`, so the `isInvite` check on line 101 renders Accept/Decline for everything.

## Fix

### `src/hooks/useDashboardData.ts`
- Change the type for sent invites from `'invite'` to `'sent_invite'` in the `AttentionItem` type union and the builder loop (lines 309-319).

### `src/components/dashboard/DashboardNeedsAttentionCard.tsx`
- Add `'sent_invite'` to the `AttentionItem.type` union.
- Add a `sent_invite` entry in `typeConfig` with a distinct style (e.g., amber/yellow, "Awaiting" badge).
- Sent invites render as clickable rows (navigate to project) with a "Pending" badge — no action buttons.
- Incoming invites (from `pendingInvites`) keep their Accept/Decline buttons unchanged.

### Result
| Item | Display |
|---|---|
| Pending invoice | 💰 row → "Review" badge, click navigates to project |
| Sent invite (outgoing) | 📤 row → "Awaiting" badge, click navigates to project |
| Incoming invite | 📨 row → Accept / Decline buttons |

