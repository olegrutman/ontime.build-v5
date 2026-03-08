

# Add Notification Badge to Header Component

## What's Already Working
The `NotificationSheet` component already has a real-time unread count badge — it shows a red circle with the count, updates via Supabase realtime subscription on INSERT/DELETE, and caps at "99+". This works correctly in `ProjectTopBar`, `MobileProjectHeader`, `TopBar`, and `WorkOrderTopBar`.

## The Gap
`src/components/Header.tsx` (the main app header) uses a **plain Bell icon button** (line 73-77) with no badge and no connection to notifications. It doesn't use `NotificationSheet` at all.

## Fix
Replace the standalone Bell button in `Header.tsx` with the existing `<NotificationSheet />` component. Style the trigger to match the header's dark theme (white/translucent icon colors).

### Changes — `src/components/Header.tsx`
1. Import `NotificationSheet` from `@/components/notifications`
2. Remove the standalone `Bell` button (lines ~72-77)
3. Replace it with `<NotificationSheet />` — this already includes the bell icon, unread badge, and the slide-out panel
4. Optionally wrap or pass a className to match the header's `text-primary-foreground` styling

This is a single-file, ~5-line change. No new components or database work needed — all the real-time plumbing already exists.

