import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  targetSelector: string | null;
}

export function BoltSpotlight({ targetSelector }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetSelector) { setRect(null); return; }

    const updateRect = () => {
      const el = document.querySelector(targetSelector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    // Small delay to allow navigation to settle
    const timer = setTimeout(updateRect, 400);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [targetSelector]);

  if (!rect) return null;

  const padding = 6;

  return createPortal(
    <div className="fixed inset-0 z-[60] pointer-events-none" aria-hidden>
      {/* Overlay */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="bolt-spotlight-mask">
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
          fill="hsl(222 47% 11% / 0.5)"
          mask="url(#bolt-spotlight-mask)"
        />
      </svg>
      {/* Pulsing border */}
      <div
        className="absolute border-2 border-primary rounded-lg animate-pulse"
        style={{
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />
    </div>,
    document.body
  );
}
