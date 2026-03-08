

# Make Read Notifications Disappear

## Change
Update `markAsRead` and `markAllAsRead` in `useNotifications.ts` to **remove** notifications from local state instead of just toggling `is_read`.

### `src/hooks/useNotifications.ts`
- **`markAsRead`** (line 63-64): Change from mapping `is_read: true` to **filtering out** the notification by id
- **`markAllAsRead`** (line 77): Change from mapping all to `is_read: true` to **clearing** the array entirely (`setNotifications([])`)

Both already set `unreadCount` correctly — no other changes needed.

