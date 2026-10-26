import type { CatalogProduct } from '@/types/poWizardV2';

export const HARDWARE_FIELDS = ['family', 'application', 'size'] as const;
export type HardwareField = typeof HARDWARE_FIELDS[number];
export type HardwareSelection = Partial<Record<HardwareField, string>>;
export interface HardwareCandidate { product: CatalogProduct; family: string; application: string; size: string }

const normalize = (text: string) => text.toLowerCase().replace(/[×]/g, 'x').replace(/[–—]/g, '-');

/** Classification is navigation only: never infer a fit from a model number. */
export function classifyHardware(product: CatalogProduct): HardwareCandidate {
  const sec = normalize(product.secondary_category ?? '').trim();
  const text = normalize(`${product.name ?? ''} ${product.description}`);
  let family = 'Other hardware';
  if (/hanger/.test(sec) || /hanger/.test(text)) family = 'Joist & Beam Hangers';
  else if (/post|column/.test(sec) || /post base|post cap|column connector/.test(text)) family = 'Post Bases & Caps';
  else if (/tie|strap/.test(sec)) family = 'Ties & Straps';
  else if (/hold.?down|anchor/.test(sec)) family = 'Concrete Anchors & Hold-Downs';
  else if (/angle|bracket|plate|clip/.test(sec)) family = 'Angles, Brackets & Clips';
  else if (/fastener|screw|nail/.test(sec)) family = 'Screws & Fasteners';

  let application = 'Other / unspecified';
  if (family === 'Joist & Beam Hangers') {
    if (/top[ -]?flange/.test(text)) application = 'Top flange';
    else if (/i[ -]?joist/.test(text)) application = 'I-joist';
    else if (/girder|multi[ -]?ply/.test(text)) application = 'Girder / multi-ply';
    else if (/truss/.test(text)) application = 'Truss';
    else if (/face[ -]?mount/.test(text)) application = 'Face mount';
  } else if (family === 'Post Bases & Caps') {
    const details = text.includes('supplier details:') ? text.split('supplier details:')[1] : text;
    if (/post base|column base/.test(details)) application = 'Post base';
    else if (/post cap|cap connector|column cap/.test(details)) application = 'Post cap';
    else if (/column connector/.test(details)) application = 'Column connector';
  } else if (family === 'Ties & Straps') {
    if (/hurricane|rafter tie/.test(text)) application = 'Hurricane / rafter tie';
    else if (/twist/.test(text)) application = 'Twist strap';
    else if (/\bl strap\b|\bt strap\b/.test(text)) application = 'L / T strap';
    else if (/strap/.test(text)) application = 'Flat strap';
    else if (/tie/.test(text)) application = 'Structural tie';
  } else if (family === 'Angles, Brackets & Clips') {
    if (/stopper|shield|protective/.test(text)) application = 'Protective plate';
    else if (/angle/.test(text)) application = 'Framing angle';
    else if (/clip/.test(text)) application = 'Sheathing / framing clip';
    else if (/mending/.test(text)) application = 'Mending plate';
    else if (/bearing plate/.test(text)) application = 'Bearing plate';
    else application = 'Brackets & plates';
  } else if (family === 'Concrete Anchors & Hold-Downs') {
    if (/hold.?down/.test(text)) application = 'Hold-down';
    else if (/screw/.test(text)) application = 'Concrete screw';
    else if (/bolt|rod/.test(text)) application = 'Anchor bolt / rod';
    else application = 'Concrete anchor';
  } else if (family === 'Screws & Fasteners') {
    application = /screw/.test(text) ? 'Screws' : /nail/.test(text) ? 'Nails' : 'Other fasteners';
  }

  let size = product.dimension?.trim() || 'Size not specified';
  if (size === 'Size not specified') {
    // Only sizes explicitly written in supplier details or the descriptive name.
    const details = text.includes('supplier details:') ? text.split('supplier details:')[1] : text;
    const lumber = details.match(/\b(\d+(?:-\d+\/\d+)?|\d+\/\d+)\s*x\s*(\d+(?:-\d+\/\d+)?)\b/);
    const width = details.match(/\b(\d+(?:-\d+\/\d+)?|\d+\/\d+)\s*(?:"|in\b)\s*wide/);
    const diameter = text.match(/diameter\s+(\d+(?:-\d+\/\d+)?|\d+\/\d+)\s*(?:in\b|")/);
    if (lumber) size = `${lumber[1]} × ${lumber[2]}`;
    else if (width) size = `${width[1]} in wide`;
    else if (diameter) size = `${diameter[1]} in diameter`;
  }
  return { product, family, application, size };
}

export function filterHardware(rows: HardwareCandidate[], selection: HardwareSelection) {
  return rows.filter(row => HARDWARE_FIELDS.every(field => !selection[field] || row[field] === selection[field]));
}

export function hardwareOptions(rows: HardwareCandidate[], field: HardwareField) {
  const counts = new Map<string, number>();
  rows.forEach(row => counts.set(row[field], (counts.get(row[field]) ?? 0) + 1));
  return Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
}

/** Resolve single choices without a click; history contains real choices only. */
export function advanceHardware(rows: HardwareCandidate[], selection: HardwareSelection, start: number) {
  const next = { ...selection };
  let index = start;
  while (index < HARDWARE_FIELDS.length) {
    const options = hardwareOptions(filterHardware(rows, next), HARDWARE_FIELDS[index]);
    if (options.length > 1) break;
    if (options[0]) next[HARDWARE_FIELDS[index]] = options[0].value;
    index += 1;
  }
  return { selection: next, index };
}

export function isExactHardwareModel(product: CatalogProduct, query: string) {
  const model = product.description.match(/\bmodel\s+([^.,;]+)[.,;]/i)?.[1]?.trim();
  const nameModel = product.name?.split(/\s+[—–]\s+/).at(-1)?.trim();
  return [model, nameModel].some(value => value?.toLowerCase() === query.trim().toLowerCase());
}