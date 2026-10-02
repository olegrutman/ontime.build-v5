() => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1)
    out.push({ kind: "page-wide", text: `page ${document.documentElement.scrollWidth}px wider than ${vw}px` });
  const desc = (el) => {
    const c = typeof el.className === "string" ? el.className : "";
    return el.tagName.toLowerCase() + "." + c.split(" ").slice(0, 5).join(".");
  };
  const clipOf = (el) => {
    let a = el.parentElement;
    while (a && a !== document.body) {
      if (getComputedStyle(a).overflowX !== "visible") return a;
      a = a.parentElement;
    }
    return null;
  };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim();
    if (t.length < 2) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.textOverflow === "ellipsis") continue;
    if (el.closest('[aria-hidden="true"],.sr-only')) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const clip = clipOf(el);
    let box = { left: 0, right: vw };
    if (clip) {
      const cs = getComputedStyle(clip);
      // intentional horizontal scrollers (tables) are fine
      if (["auto", "scroll"].includes(cs.overflowX) && clip.scrollWidth > clip.clientWidth + 1 && clip.tagName !== "MAIN" && clip.clientWidth < vw * 0.9) continue;
      const cr = clip.getBoundingClientRect();
      box = { left: Math.max(0, cr.left), right: Math.min(vw, cr.right) };
    }
    if (b.right > box.right + 1.5 || b.left < box.left - 1.5)
      out.push({ kind: "text-out", text: t.slice(0, 60), el: desc(el), over: Math.round(Math.max(b.right - box.right, box.left - b.left)) });
  }
  document.querySelectorAll('button[role=checkbox]').forEach((c) => {
    const r = c.getBoundingClientRect();
    if (r.width && Math.abs(r.width - r.height) > 1.5)
      out.push({ kind: "not-square", text: `${Math.round(r.width)}x${Math.round(r.height)}`, el: desc(c) });
  });
  return out.slice(0, 40);
}
