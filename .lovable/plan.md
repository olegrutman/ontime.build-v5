

# Sasha -- In-App AI Guide (Floating Chat Bubble)

## Overview

Add a floating chat bubble in the bottom-right corner of every authenticated page. When clicked, it opens a chat panel where Sasha -- a calm, construction-savvy AI guide -- helps users understand Work Orders, Purchase Orders, Invoices, and navigate the app confidently.

Sasha is context-aware: she knows which page the user is on and tailors her responses accordingly. She uses plain construction language, never rushes, and always offers clear next-step buttons.

## User Experience

1. A small purple circle with a friendly icon sits in the bottom-right corner of every page (after login)
2. Clicking it opens a chat panel with Sasha's greeting and quick-action buttons
3. Users can ask questions or tap buttons to get guided explanations
4. Sasha detects the current page (Dashboard, Project, Work Order, PO, Invoice) and adjusts her guidance
5. The panel can be closed and reopened; conversation resets on close to keep things simple (no persistence needed initially)

## Architecture

```text
User clicks bubble
       |
       v
  SashaChat (React panel)
       |
       v
  Edge Function: sasha-guide
       |
       v
  Lovable AI (gemini-3-flash-preview)
       |
       v
  Streamed response back to UI
```

### Why an Edge Function?

The existing `generate-work-order-description` edge function already uses the Lovable AI gateway pattern with `LOVABLE_API_KEY`. Sasha follows the same approach -- a dedicated edge function that sends the conversation history plus a detailed system prompt to the AI, returning Sasha's response.

## Components

### 1. Floating Bubble + Chat Panel

**File: `src/components/sasha/SashaBubble.tsx`**

- A fixed-position button (bottom-right, z-50) with a chat icon
- On click, toggles a chat panel (400px wide, 500px tall on desktop; full-width on mobile)
- Panel contains: header with "Sasha" name and close button, scrollable message area, input field with send button
- Quick-action buttons rendered inline in Sasha's messages (e.g., "Explain Work Orders", "Explore a demo project")

**File: `src/components/sasha/SashaMessage.tsx`**

- Renders individual chat messages (user or Sasha)
- Sasha's messages use markdown rendering via a simple prose wrapper
- Action buttons are rendered as clickable chips below Sasha's text when the message includes them

**File: `src/components/sasha/SashaQuickActions.tsx`**

- Renders button options that Sasha provides (e.g., "Show me a Purchase Order", "Go back")
- Each button sends its label as the next user message

**File: `src/components/sasha/index.ts`**

- Barrel export

### 2. Context Detection Hook

**File: `src/hooks/useSashaContext.ts`**

- Reads current route via `useLocation()`
- Determines what the user is currently viewing:
  - `/dashboard` -> "Dashboard"
  - `/project/:id` with `?tab=work-orders` -> "Project Work Orders tab"
  - `/project/:id` with `?tab=purchase-orders` -> "Project Purchase Orders tab"
  - `/project/:id` with `?tab=invoices` -> "Project Invoices tab"
  - `/change-order/:id` -> "Work Order detail"
  - etc.
- Returns a plain-English context string that gets sent to the AI

### 3. Edge Function

**File: `supabase/functions/sasha-guide/index.ts`**

- Receives: `{ messages: [{role, content}], context: string }`
- Prepends Sasha's system prompt (the full persona and rules from the user's prompt)
- Injects the page context into the system prompt so Sasha knows where the user is
- Calls Lovable AI gateway (`gemini-3-flash-preview`) with the conversation
- Returns Sasha's response as JSON
- Uses the existing `LOVABLE_API_KEY` secret (already configured)

### 4. Integration Point

**File: `src/App.tsx`**

- Add `<SashaBubble />` inside the `AuthProvider` and `BrowserRouter` so it has access to auth state and routing
- Only render when the user is authenticated (not on Landing or Auth pages)

## System Prompt for Sasha (embedded in edge function)

The edge function will contain the full Sasha persona from the user's prompt, including:
- Calm, reassuring, non-technical tone
- One concept at a time approach
- Always offer next-step buttons (returned as structured data in the response)
- Context-awareness based on the current page
- Construction-friendly language rules (no "configuration", "permissions matrix", etc.)
- The greeting message logic for first interaction
- Explanation flows for Work Orders, POs, and Invoices

The AI will be instructed to return responses in a simple JSON format:

```text
{
  "text": "Sasha's message in markdown",
  "actions": ["Button label 1", "Button label 2", "Go back"]
}
```

This allows the UI to render both the text and the action buttons cleanly.

## Quick-Action Flow

When a user taps a quick-action button (e.g., "Explain Work Orders"), that button's label is sent as the next user message. Sasha's system prompt includes instructions for how to respond to each of these standard prompts, ensuring consistent and helpful responses.

## Visual Design

- Bubble: 56px circle, brand purple (`#9b86f3`), white chat icon, subtle shadow, pulse animation on first load to draw attention
- Panel: White card with rounded corners, shadow-xl, fixed position bottom-right (offset from bubble)
- Messages: Left-aligned for Sasha (light gray bg), right-aligned for user (brand purple bg, white text)
- Action buttons: Outlined chips below Sasha's messages, brand purple border
- Mobile: Panel goes full-width at bottom, max-height 70vh

## Files Changed

| File | Change |
|---|---|
| `src/components/sasha/SashaBubble.tsx` | New -- floating bubble + chat panel |
| `src/components/sasha/SashaMessage.tsx` | New -- message rendering with markdown |
| `src/components/sasha/SashaQuickActions.tsx` | New -- action button chips |
| `src/components/sasha/index.ts` | New -- barrel export |
| `src/hooks/useSashaContext.ts` | New -- route-based context detection |
| `supabase/functions/sasha-guide/index.ts` | New -- AI edge function with Sasha persona |
| `src/App.tsx` | Add SashaBubble component (authenticated pages only) |

## No Database Changes

Sasha conversations are ephemeral (reset on close). No tables, RLS policies, or migrations needed. The edge function uses the already-configured `LOVABLE_API_KEY`.

