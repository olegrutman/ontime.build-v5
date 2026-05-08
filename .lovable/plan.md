## Default Change Orders view to "Active"

In `src/components/change-orders/COListPage.tsx`, the filter state currently initializes to `'all'`. Change the initial value to `'in_progress'` so the page lands on the **Active** tab by default.

- The "All" tab remains visible in the same row, so users can click it to see every CO (including approved and withdrawn).
- No changes to filter logic, counts, sorting (action-required still floats to top), or styling.
- One-line change:

```ts
const [filter, setFilter] = useState<FilterKey>('in_progress');
```

That's it.
