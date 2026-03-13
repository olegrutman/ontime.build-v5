

# Smart Default Status Filter on Dashboard

## What
Instead of always defaulting to "setup", dynamically pick the initial filter tab based on available data:
- If `statusCounts.setup > 0` → default to `'setup'`
- Otherwise → default to `'active'`

## Change

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Replace static `useState('setup')` with a `useEffect` that sets the filter based on `statusCounts` once data loads |

### Detail

Remove the hardcoded default and use an effect after `statusCounts` is available:

```tsx
const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('active');
const hasInitialized = useRef(false);

useEffect(() => {
  if (!dataLoading && !hasInitialized.current) {
    hasInitialized.current = true;
    if (statusCounts.setup > 0) {
      setStatusFilter('setup');
    }
  }
}, [dataLoading, statusCounts]);
```

This runs once when data first loads. Uses a ref to prevent re-triggering on refetch. Single file change, no backend work needed.

