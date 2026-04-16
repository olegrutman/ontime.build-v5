

# Update Document Downloads: Full Address, Remove Approval Workflow, Remove URL

## What's Changing

1. **Full project address** on all documents — show street, city, state, zip instead of just city/state
2. **Remove Approval Workflow section** from invoice download (lines 268-271)
3. **Remove the URL that prints at the bottom** — this is the browser's automatic page URL when printing. We hide it with a `@media print` CSS rule that suppresses browser-generated headers/footers. The "Powered by Ontime.build" footer stays.

## Technical Details

### All 5 Edge Functions

**Add `projectAddr` helper** to parse full address:
```ts
function projectAddr(project: any): string {
  const a = project?.address;
  if (a && typeof a === 'object') {
    return [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ');
  }
  return [project?.city, project?.state].filter(Boolean).join(', ');
}
```

**Update project select queries** to include `address` field (where not already included).

**Add print CSS** to hide browser URL:
```css
@media print {
  @page { margin: 0.5in; }
  body { padding: 0; }
  .page { box-shadow: none; border-radius: 0; }
}
```
The `@page { margin: 0.5in }` combined with the existing page setup prevents browsers from inserting their default header/footer (which includes the URL).

### Invoice-specific
- Remove the Approval Workflow section (lines 268-271) and related variables (`steps`, `statusIdx`, `currentIdx`, `approvalHtml`)
- Update project select: `projects(name, city, state)` → `projects(name, address, city, state)`
- Use `projectAddr(invoice.project)` for location display

### PO-specific
- Update: `projects(name, city, state)` → `projects(name, address, city, state)`
- Use `projectAddr()` for project location

### Work Order, Credit Memo, Project Summary
- Same pattern: add `address` to project select, use `projectAddr()` helper

## Files Modified
1. `supabase/functions/invoice-download/index.ts`
2. `supabase/functions/po-download/index.ts`
3. `supabase/functions/work-order-download/index.ts`
4. `supabase/functions/return-credit-memo/index.ts`
5. `supabase/functions/project-summary-download/index.ts`

No database changes needed.

