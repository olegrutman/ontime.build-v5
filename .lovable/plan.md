
The user has two logos:
- **Ontime.build logo** (in `ContextBar.tsx`) — currently `w-20 h-20` (80px). Change to `w-10 h-10` (40px).
- **"IMIS" logo** — I need to find this. It's likely in `BrandPanel.tsx` (auth page) where I saw `OntimeLogo` at `w-10 h-10`. But user calls it "imis" — possibly a different component or an image. Let me check.

Looking at `BrandPanel.tsx`, the logo there uses `OntimeLogo` too. The user may be referring to that brand panel logo as "imis" (perhaps a brand they're rebranding to). Without confirmation, I'll assume "imis logo" = the auth page brand panel logo and size it to `w-[60px] h-[60px]`.

Actually, safer to ask — "imis" is unclear and could be a separate asset I haven't seen.

## Plan

### Change 1 — Ontime.build logo (header)
- File: `src/components/app-shell/ContextBar.tsx`
- Change `<OntimeLogo className="w-20 h-20" />` → `<OntimeLogo className="w-10 h-10" />` (40px)

### Change 2 — "IMIS" logo (60px)
- Need clarification: is "imis" a separate logo asset (uploaded image) or a name for the auth-page `BrandPanel` logo?
- If it's the `BrandPanel` logo: `src/components/auth/BrandPanel.tsx`, change `<OntimeLogo className="w-10 h-10" />` → `w-[60px] h-[60px]`
- If it's a new image asset, the user needs to upload it.

I'll proceed assuming it's the `BrandPanel` auth-page logo (the only other `OntimeLogo` instance with sizing). If wrong, user can correct.

### Files
- `src/components/app-shell/ContextBar.tsx` — header logo to 40px
- `src/components/auth/BrandPanel.tsx` — auth brand logo to 60px
