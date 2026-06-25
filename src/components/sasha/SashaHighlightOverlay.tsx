import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { snapshotElement } from '@/lib/sashaPageSnapshot';

interface Props {
  onSelect: (prompt: string) => void;
  onCancel: () => void;
}

// Selectors that mark "explainable" regions, in priority order.
const STRUCTURAL_SELECTORS = [
  '[data-sasha-card]',
  '[role="article"]',
  '[role="region"]',
  '[data-card]',
  'section',
  'article',
  'table',
  '[role="table"]',
  '[data-sidebar]',
  'header',
  'nav',
  'aside',
];

function isLayoutWrapper(el: HTMLElement): boolean {
  const cs = window.getComputedStyle(el);
  const hasBorder = cs.borderTopWidth !== '0px' || cs.borderBottomWidth !== '0px';
  const hasBg =
    cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    cs.backgroundColor !== 'transparent';
  const hasShadow = cs.boxShadow !== 'none';
  return !(hasBorder || hasBg || hasShadow);
}

export function SashaHighlightOverlay({ onSelect, onCancel }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [label, setLabel] = useState<string>('');
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const missTimerRef = useRef<number | null>(null);
  const [missHint, setMissHint] = useState(false);
  const maskId = `sasha-highlight-mask-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const findTargetAt = useCallback((x: number, y: number): HTMLElement | null => {
    const els = document.elementsFromPoint(x, y);
    const viewportArea = window.innerWidth * window.innerHeight;
    const minArea = 80 * 40;
    const maxArea = viewportArea * 0.7;

    // 1. Structural selectors first (most semantic)
    for (const el of els) {
      if (overlayRef.current?.contains(el)) continue;
      for (const sel of STRUCTURAL_SELECTORS) {
        const match = (el as HTMLElement).closest(sel) as HTMLElement | null;
        if (match && !overlayRef.current?.contains(match)) {
          const r = match.getBoundingClientRect();
          const area = r.width * r.height;
          if (area >= minArea && area <= maxArea) return match;
        }
      }
    }

    // 2. Fallback: smallest visually-distinct ancestor within size bounds
    for (const el of els) {
      if (overlayRef.current?.contains(el)) continue;
      let node: HTMLElement | null = el as HTMLElement;
      while (node && node !== document.body) {
        const r = node.getBoundingClientRect();
        const area = r.width * r.height;
        if (area >= minArea && area <= maxArea && !isLayoutWrapper(node)) {
          return node;
        }
        node = node.parentElement;
      }
    }
    return null;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });
      const target = findTargetAt(e.clientX, e.clientY);
      if (target) {
        setRect(target.getBoundingClientRect());
        const snap = snapshotElement(target);
        setLabel(snap.heading || snap.label);
      } else {
        setRect(null);
        setLabel('');
      }
    },
    [findTargetAt]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = findTargetAt(e.clientX, e.clientY);
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        const snap = snapshotElement(target);
        const numbers = snap.numbers.length ? `\nNumbers shown: ${snap.numbers.join(', ')}` : '';
        const heading = snap.heading ? `\nHeading: "${snap.heading}"` : '';
        const prompt = `Explain this "${snap.label}" the user just clicked on.${heading}${numbers}\nVisible text: "${snap.text}"`;
        onSelect(prompt);
      } else {
        // Don't cancel — show a brief miss hint and stay in highlight mode.
        setMissHint(true);
        if (missTimerRef.current) window.clearTimeout(missTimerRef.current);
        missTimerRef.current = window.setTimeout(() => setMissHint(false), 1200);
      }
    },
    [findTargetAt, onSelect]
  );

  useEffect(() => {
    return () => {
      if (missTimerRef.current) window.clearTimeout(missTimerRef.current);
    };
  }, []);

  const padding = 6;

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[55] pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0 bg-background/40 pointer-events-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {rect && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - padding}
                  y={rect.top - padding}
                  width={rect.width + padding * 2}
                  height={rect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="hsl(var(--foreground) / 0.35)"
              mask={`url(#${maskId})`}
            />
          </svg>
          <div
            className="absolute border-2 border-primary rounded-lg pointer-events-none transition-all duration-75"
            style={{
              left: rect.left - padding,
              top: rect.top - padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
              boxShadow: '0 0 0 4px hsl(var(--primary) / 0.2)',
            }}
          />
        </>
      )}

      {/* Cursor tooltip with target label */}
      {cursor && label && (
        <div
          className="absolute bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap max-w-xs truncate"
          style={{ left: cursor.x + 14, top: cursor.y + 14 }}
        >
          Explain: {label}
        </div>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none">
        Click any section, card, or number to have Sasha explain it · Esc to cancel
      </div>

      {missHint && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1.5 rounded-full text-xs shadow-lg pointer-events-none animate-in fade-in">
          Nothing to explain there — try a card or number
        </div>
      )}
    </div>,
    document.body
  );
}
