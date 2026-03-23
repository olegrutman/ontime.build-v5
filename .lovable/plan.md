

# Default SOV Sections to Collapsed

## Change

**File: `src/pages/ProjectSOVPage.tsx`** — Line 44

Change the initial state of the collapsible from `true` to `false`:

```ts
// Before:
const [open, setOpen] = useState(true);

// After:
const [open, setOpen] = useState(false);
```

This is inside the `SOVContractSection` component, so every SOV section will start collapsed when the user first navigates to the SOV page.

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Change collapsible default state from `true` to `false` |

