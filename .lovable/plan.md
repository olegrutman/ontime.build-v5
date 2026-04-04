

# Redesign Project Header to Match Business Snapshot Style

## What this does

Restyle the project overview's dark header to use the same visual language as the `DashboardBusinessSnapshot` card — compact, information-dense, with the same typography hierarchy and spacing. Move the notification bell from the top context bar into this header so it lives alongside project info.

## Current state

- The dark header is a wide flat band with `text-xl` project name, small address, and pills floated right
- Notifications live in the `ProjectShell` top bar (line 137)
- The Business Snapshot card uses: `rounded-2xl bg-slate-950 p-5`, small uppercase label (`text-[0.7rem]`), large value (`text-2xl font-semibold`), sub-info in `text-[0.8rem] text-slate-400`, then stat rows in `text-[0.85rem]`

## Changes

### 1. Restyle header to match Business Snapshot typography (`ProjectHome.tsx` lines 291-313)

- Keep `bg-slate-950 text-white` but add `rounded-t-2xl` on the right edge (matching the card radius)
- Use the same hierarchy: small uppercase label for "Project Overview", `text-2xl font-semibold` for project name, `text-[0.8rem] text-slate-400` for address
- Add a compact stat row below (same `text-[0.85rem]` style as Business Snapshot) showing key info: status, health, project type — displayed as `label · value` pairs in slate-400/white
- Move notification bell into the header's top-right corner, next to the status/health pills

### 2. Remove NotificationSheet from ProjectShell top bar (`ProjectShell.tsx` line 137)

- Delete the `<NotificationSheet />` from the top context bar since it now lives in the header

### 3. Add NotificationSheet to the dark header (`ProjectHome.tsx`)

- Import and render `<NotificationSheet />` in the header's right section, before the status pills

## Files to modify

| File | Change |
|------|--------|
| `ProjectHome.tsx` lines 291-313 | Restyle header: match Business Snapshot typography, add stat row, add NotificationSheet |
| `ProjectShell.tsx` line 137 | Remove `<NotificationSheet />` |

