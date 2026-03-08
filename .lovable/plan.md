

# Add "Explain This Card" Mode to Sasha

When Sasha's chat is open, enable a highlight mode where users can click on any card in the UI to have Sasha explain it.

## How It Works

1. **Toggle button in Sasha header** — A crosshair/pointer icon button in the Sasha chat header activates "highlight mode"
2. **Highlight mode overlay** — When active, hovering over `[data-sasha-card]` elements shows a pulsing highlight border (reusing the existing `BoltSpotlight` pattern). Clicking a card captures its type and visible text content, exits highlight mode, and sends a message to Sasha like: *"Explain this card: [Purchase Order — PO-0012, Acme Lumber, $4,500, Status: Approved]"*
3. **Data attributes on cards** — Add `data-sasha-card="<type>"` attributes to key card components so the system knows what was clicked and can extract meaningful text

## Files to Change

### 1. `src/components/sasha/SashaBubble.tsx`
- Add `highlightMode` state (boolean)
- Toggle button in the chat header (a `MousePointer2` icon)
- When `highlightMode` is true and chat is open, render a new `<SashaHighlightOverlay>` component
- When a card is selected, call `sendMessage()` with the extracted card description and exit highlight mode

### 2. New: `src/components/sasha/SashaHighlightOverlay.tsx`
- Portal overlay (`z-[55]`, below Sasha panel `z-50` but above page content)
- Listens for `mouseover` / `click` on elements matching `[data-sasha-card]`
- On hover: shows a pulsing border around the hovered card (similar to `BoltSpotlight`)
- On click: extracts `data-sasha-card` attribute value + `el.innerText` (truncated to ~200 chars), calls `onSelect(cardType, textContent)`, closes overlay

### 3. Add `data-sasha-card` attributes to card components
- `src/components/purchase-orders/POCard.tsx` → `data-sasha-card="Purchase Order"`
- `src/components/WorkItemCard.tsx` → `data-sasha-card="Work Item"`
- `src/components/rfi/RFICard.tsx` → `data-sasha-card="RFI"`
- `src/components/project/ProfitCard.tsx` → `data-sasha-card="Profit Position"`
- `src/components/project/MaterialsBudgetStatusCard.tsx` → `data-sasha-card="Materials Budget"`
- `src/components/project/AttentionBanner.tsx` → `data-sasha-card="Attention Banner"`

### 4. `src/components/sasha/SashaMessage.tsx` (no structural changes)
- Sasha's AI backend already receives context and free-text messages, so the explain prompt will work naturally

## UX Flow

1. User opens Sasha → sees crosshair button in header
2. Clicks crosshair → header shows "Click any card to explain" hint, page cards get hover highlights
3. User hovers a PO card → pulsing blue border appears
4. User clicks → Sasha receives: *"Explain this card to me: Purchase Order — PO-0012 | Acme Lumber | $4,500 | Approved"*
5. Sasha responds with a plain-language explanation of what that card shows and what actions are available

No database changes required.

