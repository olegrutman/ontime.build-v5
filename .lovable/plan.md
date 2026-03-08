

# Enable Sasha Tab Navigation for All Users (Not Just Demo)

## Problem
The `handleAction` function in `SashaBubble.tsx` only navigates to project tabs when `isDemoMode` is true. Non-demo users clicking "Go to SOV tab" or similar actions get them sent as chat messages instead of navigating.

## Changes

**File: `src/components/sasha/SashaBubble.tsx` (lines 58–94)**

Refactor `handleAction` to extract the project ID from the current URL path (`/project/:id`) and use it for navigation regardless of demo mode. The demo-specific `demoProjectId` becomes a fallback.

```tsx
const handleAction = useCallback(
  (action: string) => {
    const lower = action.toLowerCase();

    // Determine current project ID from URL or demo context
    const pathMatch = location.pathname.match(/^\/project\/([^/?]+)/);
    const currentProjectId = pathMatch?.[1] || (isDemoMode ? demoProjectId : null);

    if (currentProjectId) {
      const projectPath = `/project/${currentProjectId}`;
      if (lower.includes('work order') && lower.includes('tab') || lower.includes('go to work order')) {
        navigate(`${projectPath}?tab=work-orders`); return;
      }
      if (lower.includes('purchase order') || lower.includes('go to po')) {
        navigate(`${projectPath}?tab=purchase-orders`); return;
      }
      if (lower.includes('invoice') && (lower.includes('tab') || lower.includes('view invoice'))) {
        navigate(`${projectPath}?tab=invoices`); return;
      }
      if (lower.includes('sov') || lower.includes('schedule of values')) {
        navigate(`${projectPath}?tab=sov`); return;
      }
      if (lower.includes('rfi')) {
        navigate(`${projectPath}?tab=rfis`); return;
      }
      if (lower.includes('team')) {
        navigate(`${projectPath}?tab=team`); return;
      }
      if (lower.includes('financial')) {
        navigate(`${projectPath}?tab=financials`); return;
      }
      if (lower.includes('overview') || lower.includes('project home')) {
        navigate(`${projectPath}?tab=overview`); return;
      }
      if (lower.includes('return')) {
        navigate(`${projectPath}?tab=returns`); return;
      }
    }

    // Global navigation (works from any page)
    if (lower.includes('dashboard') || lower.includes('go home')) {
      navigate('/dashboard'); return;
    }
    if (lower.includes('partner')) {
      navigate('/partners'); return;
    }
    if (lower.includes('reminder')) {
      navigate('/reminders'); return;
    }

    // Default: send as chat message
    sendMessage(action);
  },
  [location.pathname, isDemoMode, demoProjectId, navigate]
);
```

Key improvements:
- Navigation works for **all users** on any project page, not just demo mode
- Added missing tabs: `team`, `financials`, `returns`
- Added global navigation: dashboard, partners, reminders
- `location.pathname` added to dependency array

Single file change, no database changes.

