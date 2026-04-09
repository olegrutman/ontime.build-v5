

# Fix: Remove Read Notifications from List

## Problem
When a notification is clicked and marked as read, it briefly disappears (local state update) but then reappears because:
1. The realtime subscription on `notifications` table fires on the UPDATE event
2. `fetchNotifications()` calls `get_my_notifications` RPC which returns **all** notifications (read + unread)
3. The read notification gets re-added to the list

## Fix (two options, implementing the simpler one)

### Change: `src/hooks/useNotifications.ts`
Filter the fetched notifications to only show unread ones. After `get_my_notifications` returns data, filter with `.filter(n => !n.is_read)` before setting state. This ensures read notifications never appear in the list regardless of what the RPC returns.

Also change the realtime subscription from `event: '*'` to `event: 'INSERT'` so marking a notification as read (UPDATE) doesn't trigger a refetch that would briefly flash the list.

| File | Change |
|------|--------|
| `src/hooks/useNotifications.ts` | Filter results to unread only; change realtime event to `INSERT` |

