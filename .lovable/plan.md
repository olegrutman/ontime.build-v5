
# Replace Job Title Text Input with Dropdown

## Change
Replace the free-text job title input in `AccountStep.tsx` with the same `Select` dropdown already used in `RoleStep.tsx`, using the existing `JOB_TITLES` list.

## File: `src/components/signup-wizard/AccountStep.tsx`

1. Add imports for `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
2. Import the `JOB_TITLES` array from `RoleStep.tsx` (or extract it to a shared location)
3. Replace the `<Input>` element inside the `showJobTitle` block with a `<Select>` dropdown using the same options as `RoleStep`

### Before (text input):
```
<Input id="jobTitle" type="text" value={data.jobTitle} ... />
```

### After (dropdown):
```
<Select value={data.jobTitle} onValueChange={v => onChange({ jobTitle: v })}>
  <SelectTrigger>
    <SelectValue placeholder="Select your job title" />
  </SelectTrigger>
  <SelectContent>
    {JOB_TITLES.map(t => (
      <SelectItem key={t} value={t}>{t}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Shared Constant
Move `JOB_TITLES` from `RoleStep.tsx` to `src/components/signup-wizard/types.ts` so both `AccountStep` and `RoleStep` import from the same place, avoiding duplication.

| File | Change |
|------|--------|
| `src/components/signup-wizard/types.ts` | Export `JOB_TITLES` array |
| `src/components/signup-wizard/AccountStep.tsx` | Replace text input with Select dropdown, import `JOB_TITLES` |
| `src/components/signup-wizard/RoleStep.tsx` | Import `JOB_TITLES` from `types.ts` instead of defining locally |
