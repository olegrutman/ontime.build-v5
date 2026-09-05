/**
 * Safari < 15.4 (and some corporate-managed browsers) do not expose the global
 * `structuredClone`. Never call it directly — use this helper instead so the
 * bundle cannot throw a ReferenceError during module initialization.
 *
 * The fallback is a plain recursive clone that covers the JSON-compatible data
 * we clone in this app (arrays, plain objects, Date, Map, Set, primitives).
 */
export function deepClone<T>(value: T): T {
  const sc = (globalThis as { structuredClone?: <V>(v: V) => V }).structuredClone;
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {
      // Fall through to the manual clone for non-cloneable values.
    }
  }
  return manualClone(value, new WeakMap());
}

function manualClone<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (value === null || typeof value !== "object") return value;

  const obj = value as unknown as object;
  if (seen.has(obj)) return seen.get(obj) as T;

  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as T;

  if (Array.isArray(value)) {
    const arr: unknown[] = [];
    seen.set(obj, arr);
    for (const item of value) arr.push(manualClone(item, seen));
    return arr as unknown as T;
  }

  if (value instanceof Map) {
    const map = new Map();
    seen.set(obj, map);
    value.forEach((v, k) => map.set(manualClone(k, seen), manualClone(v, seen)));
    return map as unknown as T;
  }

  if (value instanceof Set) {
    const set = new Set();
    seen.set(obj, set);
    value.forEach(v => set.add(manualClone(v, seen)));
    return set as unknown as T;
  }

  const out: Record<string, unknown> = {};
  seen.set(obj, out);
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = manualClone(v, seen);
  }
  return out as unknown as T;
}
