

# Sasha Page-Aware Greetings

## Goal

When Sasha opens (or the user asks "where am I?"), she should proactively announce what page the user is on and list the key elements visible on that page.

## Changes

### 1. Enrich `useSashaContext` with detailed page content descriptions

**File: `src/hooks/useSashaContext.ts`**

Expand each context string to include a bullet-point summary of what the user can see/do on that page. For example:

| Page | Current context | New context |
|------|----------------|-------------|
| Dashboard | `Dashboard -- their list of projects` | `Dashboard -- Shows: list of projects with status badges, quick stats (active projects, pending items), financial snapshot tiles, needs-attention panel, reminders, and a "New Project" button.` |
| Project Overview | `Project Overview -- summary of a single project` | `Project Overview -- Shows: attention banner (items needing action), financial signal cards (contract value, billed, retainage), operational summary, team members, contracts section, readiness checklist, and project scope.` |
| Work Orders tab | `Project Work Orders tab -- list of all Work Orders` | `Project Work Orders tab -- Shows: list of Work Orders with status badges (Draft, In Progress, Complete), each card shows title, location, pricing mode, and completion progress. Users can create new Work Orders or click into any existing one.` |
| Purchase Orders tab | `Project Purchase Orders tab -- list of all POs` | `Project Purchase Orders tab -- Shows: PO cards with PO number, supplier name, status, and total amount. Users can create new POs, filter by status, and click into any PO for line-item details.` |

Similar enrichment for all routes: Invoices, SOV, RFIs, Estimates, Financials, Team, Work Order detail, Work Item detail, Partner Directory, Catalog, Profile, Material Orders, Create Project, and Supplier pages.

### 2. Update Sasha system prompt to proactively describe the page

**File: `supabase/functions/sasha-guide/index.ts`**

Add to the CONTEXT-AWARE HELP section:

```
PAGE AWARENESS:
When the conversation starts or the user asks "where am I" / "what's on this page" / "what can I do here":
1. Name the page they're on
2. List the key sections and elements they can see (use the context provided)
3. Suggest 2-3 things they can do right now
4. Offer action buttons for the most logical next steps

Example response for Dashboard:
{
  "text": "You're on your **Dashboard** -- this is home base.\n\nHere's what you can see:\n- **Your projects** listed with status badges\n- **Quick stats** showing active projects and items needing attention\n- **Financial snapshot** with billing totals\n- **Needs Attention** panel highlighting urgent items\n\nYou can click any project to dive in, or create a new one.",
  "actions": ["Create a new project", "What do the status badges mean?", "Explain the financial snapshot"]
}
```

### 3. Update initial greeting to be page-aware

**File: `src/components/sasha/SashaBubble.tsx`**

Instead of a static `INITIAL_GREETING`, make it dynamic based on `useSashaContext()`. When the bubble is opened, the first message sent to the AI will include the page context, so Sasha can greet with page-specific info.

Change approach: When the panel opens for the first time, automatically send a silent "init" message to the edge function with the current context, so Sasha's first response is tailored to the current page rather than always showing the generic greeting.

Alternatively (simpler): Keep the static greeting but add a quick-action button **"What's on this page?"** that triggers a context-aware response. This avoids an automatic API call on every open.

**Chosen approach**: Add "What's on this page?" as a default action button in the initial greeting, and enrich the context strings so the AI has enough information to give a detailed answer.

Update `INITIAL_GREETING.actions` to:
```typescript
actions: [
  "What's on this page?",
  "Explore a demo project",
  "Explain work orders",
  "Explain purchase orders",
]
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSashaContext.ts` | Enrich all context strings with detailed page content descriptions |
| `supabase/functions/sasha-guide/index.ts` | Add PAGE AWARENESS instructions to system prompt |
| `src/components/sasha/SashaBubble.tsx` | Add "What's on this page?" action to initial greeting |

