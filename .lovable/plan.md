

# Fix: Impersonation Banner Visibility & Return Flow

## Problem
When the platform owner logs into another user's account via "Login As", the impersonation banner exists but may not be visible because:
1. The banner uses `relative` positioning — it scrolls away and can be hidden behind the sidebar layout
2. The banner sits outside `AppLayout` but the layout's `min-h-screen flex` structure can push it off-screen
3. No visual emphasis makes it easy to miss

## Changes

### 1. Make ImpersonationBanner fixed/sticky at the very top (always visible)
**File: `src/components/platform/ImpersonationBanner.tsx`**
- Change from `relative` to `sticky top-0` with highest z-index (`z-[100]`)
- This ensures the banner is always visible regardless of scroll position or layout structure

### 2. Add body padding offset when banner is active
**File: `src/App.tsx`**
- Wrap `ImpersonationBanner` + routes in a flex column so the sticky banner doesn't overlap content

### 3. Improve the banner UX
**File: `src/components/platform/ImpersonationBanner.tsx`**
- Make the "End Session" button more prominent (destructive styling)
- Add a "Return to Platform" label to clarify what happens on click
- Keep the countdown timer visible

### No backend changes needed
The `endImpersonation` function in `useImpersonation.ts` already restores the original session from `sessionStorage` and redirects to `/platform`. The edge function `platform-impersonate` already logs the end event.

