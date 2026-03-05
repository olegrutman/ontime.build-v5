

# Show "Admin" / "Owner" label for org admins

## Problem
The sidebar and top bar display the role label (e.g., "General Contractor Manager") based on `currentRole`. Even though `is_admin = true` was set correctly, the UI doesn't reflect admin/owner status visually.

## Changes

**1. AppSidebar.tsx** (line ~230-233) — When `isAdmin` is true, show "Owner" or "Admin · GC" instead of just the role label:
```
{isAdmin ? 'Owner' : ROLE_LABELS[currentRole]}
```

**2. TopBar.tsx** — Similarly update the user menu to reflect admin status if applicable.

**3. Optionally update RoleBadge** — Could show "OWNER" instead of "GC" when the user is an admin, or add a small crown/shield icon.

## Scope
Frontend-only changes — the data is already correct in the database.

