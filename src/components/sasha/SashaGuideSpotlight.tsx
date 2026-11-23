import { useEffect, useState } from 'react';
import { findVisibleGuideTarget } from '@/lib/sashaGuideDom';

export function useGuideTarget(selector: string | undefined, enabled: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!selector || !enabled) return;

    let frame = 0;
    let scrolled = false;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      const target = findVisibleGuideTarget(selector);
      if (!target) {
        setRect(null);
        return;
      }
      const nextRect = target.getBoundingClientRect();
      setRect(nextRect);
      if (!scrolled) {
        scrolled = true;
        window.setTimeout(() => {
          if (cancelled) return;
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        }, 120);
      }
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    const observer = new MutationObserver((mutations) => {
      const onlyGuideChanged = mutations.every((mutation) => {
        const element = mutation.target instanceof Element ? mutation.target : null;
        return element?.closest('[data-sasha-guide-ui]') != null;
      });
      if (!onlyGuideChanged) scheduleUpdate();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    const retry = window.setInterval(scheduleUpdate, 500);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearInterval(retry);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [selector, enabled]);

  return rect;
}

export function GuideSpotlightMask({ rect, maskId }: { rect: DOMRect; maskId: string }) {
  const padding = 7;
  return (
    <>
      <svg className="fixed inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(var(--foreground) / 0.58)"
          mask={`url(#${maskId})`}
        />
      </svg>
      <div
        className="fixed rounded-xl border-2 border-primary shadow-[0_0_0_5px_hsl(var(--primary)/0.22)] transition-all duration-150"
        style={{
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
        aria-hidden
      />
    </>
  );
}
