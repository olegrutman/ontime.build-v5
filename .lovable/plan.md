

# Show "Setup" as Default Status Filter on Dashboard

Change the initial `statusFilter` state in `src/pages/Dashboard.tsx` from `'active'` to `'setup'`.

### File to change
| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Line with `useState<ProjectStatusFilter>('active')` → change default to `'setup'` |

