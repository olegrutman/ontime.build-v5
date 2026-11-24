export function findVisibleGuideTarget(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return candidates.find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }) ?? null;
}

const PROJECT_NAV_FALLBACK = '[data-sasha-target="project-nav-more"]';

/**
 * Element to spotlight for a step. On phones some project sections live in the
 * bottom "More" sheet, so when a section link is hidden we point at More until
 * the sheet opens. Click-to-advance still requires the real target.
 */
export function findGuideSpotlightTarget(selector: string): HTMLElement | null {
  const target = findVisibleGuideTarget(selector);
  if (target) return target;
  if (selector.includes('project-nav-')) return findVisibleGuideTarget(PROJECT_NAV_FALLBACK);
  if (selector.includes('supplier-catalog')) return findVisibleGuideTarget('[data-sasha-target="global-nav-more"]');
  return null;
}
