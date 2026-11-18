/**
 * Pulls only explicitly spoken product facts out of a field note
 * ("Supply 24 pieces of 2x8 at 16 ft" → 2x8, 16 ft, 24). Nothing is guessed:
 * a missing size, length or count stays null so the user is asked.
 */
export interface ExtractedMaterial {
  nominal: string | null;      // e.g. "2x8"
  thickness: number | null;
  width: number | null;
  lengthFt: number | null;
  quantity: number | null;
  keywords: string[];          // remaining meaningful words for catalog search
}

const FILLER = new Set(['supply','supplies','need','needs','needed','we','i','the','a','an','of','at','for','to','and','please','order','ordering','get','some','more','pieces','piece','pcs','pc','boards','board','sticks','stick','each','ea','ft','feet','foot','long','lf','by','x','more','another','bring','send','us','me','on','in','with','qty','quantity','about','around','material','materials','lumber']);

export function extractMaterial(text: string): ExtractedMaterial {
  const t = ` ${(text || '').toLowerCase().replace(/[″"]/g, ' in ').replace(/[′']/g, ' ft ').replace(/\s+/g, ' ')} `;
  let thickness: number | null = null, width: number | null = null, lengthFt: number | null = null, quantity: number | null = null;
  let rest = t;

  // 2x8x16 / 2 x 8 x 16'
  const triple = t.match(/\b(\d{1,2})\s*(?:x|by)\s*(\d{1,2})\s*(?:x|by)\s*(\d{1,2})\b/);
  if (triple) { thickness = +triple[1]; width = +triple[2]; lengthFt = +triple[3]; rest = rest.replace(triple[0], ' '); }
  else {
    const dim = t.match(/\b(\d{1,2})\s*(?:x|by)\s*(\d{1,2})\b(?!\s*(?:ft|feet|foot))/);
    if (dim) { thickness = +dim[1]; width = +dim[2]; rest = rest.replace(dim[0], ' '); }
    const len = rest.match(/\b(\d{1,2})\s*(?:-\s*)?(?:ft|feet|foot|footers?)\b/) || rest.match(/\b(?:at|@|by)\s+(\d{1,2})\b(?!\s*(?:pieces|pcs|boards|sticks|ea|each))/);
    if (len) { lengthFt = +len[1]; rest = rest.replace(len[0], ' '); }
  }
  const qty = rest.match(/\b(\d{1,4})\s*(?:pieces|piece|pcs|pc|boards|board|sticks|stick|ea|each|sheets|sheet|units|qty)\b/) || rest.match(/\b(?:qty|quantity)\s*(\d{1,4})\b/) || ((thickness != null || lengthFt != null) ? rest.match(/\b(\d{1,4})\b/) : null);
  if (qty) { quantity = +qty[1]; rest = rest.replace(qty[0], ' '); }
  if (thickness != null && (thickness < 1 || thickness > 12)) thickness = null;
  if (width != null && (width < 2 || width > 16)) width = null;
  if (lengthFt != null && (lengthFt < 4 || lengthFt > 40)) lengthFt = null;
  const keywords = rest.split(/[^a-z0-9#]+/).filter(w => w.length > 1 && !FILLER.has(w) && !/^\d+$/.test(w));
  return { nominal: thickness && width ? `${thickness}x${width}` : null, thickness, width, lengthFt, quantity, keywords };
}

/** Catalog lumber stores dimension as `2 in. x 8 in.` and length as `16 ft.` */
export function catalogDimension(m: ExtractedMaterial): string | null {
  return m.thickness && m.width ? `${m.thickness} in. x ${m.width} in.` : null;
}

export function catalogLengthFt(length: string | null | undefined): number | null {
  const m = (length || '').match(/^\s*(\d+(?:\.\d+)?)\s*ft/i);
  return m ? Number(m[1]) : null;
}
