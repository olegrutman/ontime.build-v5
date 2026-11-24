import { useEffect, useState } from 'react';
import { findGuideSpotlightTarget } from '@/lib/sashaGuideDom';

export function useGuideTarget(selector: string | undefined, enabled: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!selector || !enabled) return;

    let frame = 0;
    let scrolledTarget: HTMLElement | null = null;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      const target = findGuideSpotlightTarget(selector);
      if (!target) {
        setRect(null);
        return;
      }
      const nextRect = target.getBoundingClientRect();
      setRect(nextRect);
      // Re-scroll when the target changes (e.g. More button -> item inside the phone sheet).
      if (scrolledTarget !== target) {
        scrolledTarget = target;
        window.setTimeout(() => {
          if (cancelled) return;
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
          if (window.innerWidth < 640 && target.closest('[role="dialog"]')) {
            // Sheets scroll on their own; bring the item to the top of the sheet, above the guide card.
            target.scrollIntoView({ block: 'start', inline: 'nearest', behavior });
          } else if (window.innerWidth < 640) {
            // The guide card covers the lower half on phones; keep the target near the top.
            const top = target.getBoundingClientRect().top + window.scrollY - 72;
            window.scrollTo({ top: Math.max(0, top), behavior });
          } else {
            target.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
          }
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
