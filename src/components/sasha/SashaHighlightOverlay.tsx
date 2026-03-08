import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onSelect: (prompt: string) => void;
  onCancel: () => void;
}

export function SashaHighlightOverlay({ onSelect, onCancel }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const maskId = `sasha-highlight-mask-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const findCardAt = useCallback((x: number, y: number): HTMLElement | null => {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      // Skip elements inside our overlay
      if (overlayRef.current?.contains(el)) continue;
      const card = (el as HTMLElement).closest('[data-sasha-card]') as HTMLElement | null;
      if (card) return card;
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = findCardAt(e.clientX, e.clientY);
    if (card) {
      setRect(card.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [findCardAt]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const card = findCardAt(e.clientX, e.clientY);
    if (card) {
      e.preventDefault();
      e.stopPropagation();
      const type = card.getAttribute('data-sasha-card') || 'Card';
      const content = (card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      onSelect(`Explain this ${type} card to me: ${content}`);
    } else {
      onCancel();
    }
  }, [findCardAt, onSelect, onCancel]);

  const padding = 6;

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[55] pointer-events-none" aria-hidden>
      {/* Interactive overlay that captures mouse events */}
      <div
        className="absolute inset-0 bg-background/40 pointer-events-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {/* Highlight around hovered card */}
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
              x="0" y="0" width="100%" height="100%"
              fill="hsl(var(--foreground) / 0.3)"
              mask={`url(#${maskId})`}
            />
          </svg>
          <div
            className="absolute border-2 border-primary rounded-lg animate-pulse pointer-events-none"
            style={{
              left: rect.left - padding,
              top: rect.top - padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
            }}
          />
        </>
      )}

      {/* Hint banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none">
        Click any card to have Sasha explain it
      </div>
    </div>,
    document.body
  );
}
