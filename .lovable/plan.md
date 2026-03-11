

# Fix Schedule Task Adjustment Bugs

## Bug Fixes

### 1. Debounce progress slider in TaskDetailDrawer
- Add local state for the slider value, update it on every tick for visual feedback
- Only call `onUpdate` on `onValueCommit` (Radix Slider's commit event) or after a 300ms debounce
- This eliminates the 6+ rapid PATCH requests when dragging the slider

### 2. Route drawer date changes through cascade logic
- Pass `handleScheduleChange` into `TaskDetailDrawer` as a separate `onDateChange` prop
- When start_date or end_date changes in the drawer, compute the new start/end pair and call `onDateChange` instead of `onUpdate`
- This ensures downstream tasks get the cascade confirmation dialog

### 3. Fix stale closure in handleScheduleChange / applyUpdate
- Wrap `applyUpdate` in `useCallback` with proper dependencies
- Or use a ref to always access current `items`

### 4. Fix SheetHeader ref warning
- Wrap `SheetHeader` usage or add `forwardRef` — minor, but cleans up console

## Files

| File | Change |
|------|--------|
| `src/components/schedule/TaskDetailDrawer.tsx` | Add local progress state, use `onValueCommit`, add `onDateChange` prop for cascade routing |
| `src/components/schedule/ScheduleTab.tsx` | Pass `handleScheduleChange` to drawer as `onDateChange`, wrap `applyUpdate` in `useCallback` |

## Implementation Detail

**TaskDetailDrawer** progress slider change:
```tsx
// Local state for smooth dragging
const [localProgress, setLocalProgress] = useState(item.progress);

// Reset when item changes
useEffect(() => setLocalProgress(item.progress), [item.progress]);

<Slider
  value={[localProgress]}
  onValueChange={v => setLocalProgress(v[0])}        // visual only
  onValueCommit={v => onUpdate(item.id, { progress: v[0] })}  // single PATCH
  max={100}
  step={5}
/>
```

**TaskDetailDrawer** date change routing:
```tsx
// New prop
onDateChange: (id: string, newStart: string, newEnd: string) => void;

// In date inputs, call onDateChange instead of onUpdate
onChange={e => {
  const newStart = e.target.value;
  const duration = item.end_date ? differenceInDays(...) : 0;
  const newEnd = format(addDays(new Date(newStart), duration), 'yyyy-MM-dd');
  onDateChange(item.id, newStart, newEnd);
}}
```

