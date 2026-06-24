// Collects a compact, model-friendly summary of what's actually visible
// in the main app area so Sasha can reference real numbers, headings,
// and statuses instead of the static route description alone.

const MAX_TOTAL = 2000;
const MAX_CARDS = 8;
const MAX_NUMBERS = 30;

function isVisible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
  return true;
}

function clean(s: string, max = 160): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function collectPageSnapshot(): string {
  if (typeof document === 'undefined') return '';

  const root =
    document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.body;
  if (!root) return '';

  const parts: string[] = [];

  // Headings (h1-h3)
  const headings = Array.from(root.querySelectorAll('h1, h2, h3'))
    .filter(isVisible)
    .map((h) => clean(h.textContent || '', 80))
    .filter(Boolean)
    .slice(0, 8);
  if (headings.length) parts.push(`Headings: ${headings.join(' › ')}`);

  // Active tab (radix data attrs commonly used by shadcn Tabs)
  const activeTab = root.querySelector('[role="tab"][data-state="active"], [aria-selected="true"][role="tab"]');
  if (activeTab) {
    const label = clean(activeTab.textContent || '', 40);
    if (label) parts.push(`Active tab: ${label}`);
  }

  // Tagged cards
  const cards = Array.from(root.querySelectorAll('[data-sasha-card]'))
    .filter(isVisible)
    .slice(0, MAX_CARDS)
    .map((el) => {
      const label = el.getAttribute('data-sasha-card') || 'Card';
      const text = clean((el as HTMLElement).innerText || '', 140);
      return `- ${label}: ${text}`;
    });
  if (cards.length) parts.push(`Visible cards:\n${cards.join('\n')}`);

  // Numbers ($, %, counts) from the full visible text
  const bodyText = clean((root as HTMLElement).innerText || '', 8000);
  const numRe = /\$[\d,]+(?:\.\d+)?[KMB]?|\d+(?:\.\d+)?%|\b\d+ (?:items?|invoices?|COs?|POs?|RFIs?|projects?|tasks?|days?|approvals?)\b/gi;
  const nums = Array.from(new Set(bodyText.match(numRe) || [])).slice(0, MAX_NUMBERS);
  if (nums.length) parts.push(`Numbers on screen: ${nums.join(', ')}`);

  const out = parts.join('\n');
  return out.length > MAX_TOTAL ? out.slice(0, MAX_TOTAL) + '…' : out;
}

export interface ElementSnapshot {
  label: string;
  heading: string;
  text: string;
  numbers: string[];
}

export function snapshotElement(el: HTMLElement): ElementSnapshot {
  const label =
    el.getAttribute('data-sasha-card') ||
    el.getAttribute('aria-label') ||
    el.getAttribute('role') ||
    el.tagName.toLowerCase();

  // Nearest heading inside, else preceding heading
  let heading = '';
  const innerHeading = el.querySelector('h1, h2, h3, h4');
  if (innerHeading) heading = clean(innerHeading.textContent || '', 80);
  if (!heading) {
    let prev: Element | null = el.previousElementSibling;
    while (prev && !heading) {
      if (/^H[1-4]$/.test(prev.tagName)) heading = clean(prev.textContent || '', 80);
      prev = prev.previousElementSibling;
    }
  }

  const text = clean(el.innerText || '', 600);
  const numRe = /\$[\d,]+(?:\.\d+)?[KMB]?|\d+(?:\.\d+)?%/g;
  const numbers = Array.from(new Set(text.match(numRe) || [])).slice(0, 12);

  return { label, heading, text, numbers };
}
