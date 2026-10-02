"""Phone-width layout audit: visits every screen for an account and flags text
spilling out of its box, page-wide overflow and squashed checkboxes.

Usage: WIDTHS=320,394 NAME=gc python3 scripts/mobile-audit/mobile_audit.py access+gc-owner@test.com
       (account "me" uses the injected preview session)
Results: /tmp/browser/audit/<NAME>.json plus screenshots.
"""
import asyncio, json, os, sys, requests
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SUPA = "https://gzqgbfazwvmwmirbqfwf.supabase.co"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cWdiZmF6d3Ztd21pcmJxZndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTI2MzAsImV4cCI6MjA4NDYyODYzMH0.SBoesmRP0SCtKBBrF9ime8QxJI_hLCGF5Th0cS6F34w"
KEY = "sb-gzqgbfazwvmwmirbqfwf-auth-token"
OUT = Path("/tmp/browser/audit"); OUT.mkdir(parents=True, exist_ok=True)
SECTIONS = ["overview", "change-orders", "invoices", "purchase-orders", "team", "setup", "scope", "sov",
            "rfis", "estimates", "money", "returns", "backcharges", "payment-apps", "field", "schedule",
            "daily-log", "docs", "pulse", "settings"]
GLOBAL = ["/dashboard", "/org/team", "/partners", "/projects/archive", "/catalog", "/estimates",
          "/purchase-orders", "/reminders", "/supplier/inventory", "/supplier/estimates", "/profile",
          "/settings", "/rfis"]
WIDTHS = [int(w) for w in os.environ.get("WIDTHS", "320,394").split(",")]
PROJECTS = int(os.environ.get("PROJECTS", "3"))
NAME = os.environ.get("NAME", "run")
DETECT = (Path(__file__).parent / "detect.js").read_text()


def session_for(acct):
    if acct == "me":
        return json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])
    r = requests.post(f"{SUPA}/auth/v1/token?grant_type=password", headers={"apikey": ANON},
                      json={"email": acct, "password": "AccessTest!2026"})
    r.raise_for_status()
    return r.json()


def rest(tok, path):
    r = requests.get(f"{SUPA}/rest/v1/{path}", headers={"apikey": ANON, "Authorization": f"Bearer {tok}"})
    return r.json() if r.ok else []


async def main():
    acct = sys.argv[1]
    s = session_for(acct)
    tok = s["access_token"]
    urls = list(GLOBAL)
    for pr in rest(tok, f"projects?select=id&order=updated_at.desc&limit={PROJECTS}"):
        pid = pr["id"]
        urls += [f"/project/{pid}/{x}" for x in SECTIONS]
        for c in rest(tok, f"change_orders?select=id&project_id=eq.{pid}&limit=2"):
            urls.append(f"/project/{pid}/change-orders/{c['id']}")
    findings, visited = [], 0
    async with async_playwright() as p:
        br = await p.chromium.launch(headless=True)
        for w in WIDTHS:
            ctx = await br.new_context(viewport={"width": w, "height": 800})
            pg = await ctx.new_page()
            await pg.goto(BASE)
            await pg.evaluate(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(s))})")
            for u in urls:
                visited += 1
                try:
                    await pg.goto(BASE + u, wait_until="domcontentloaded")
                    await pg.wait_for_timeout(4000)
                    for b in (await pg.query_selector_all('[aria-expanded="false"]'))[:10]:
                        try:
                            if await b.is_visible():
                                await b.click(timeout=600)
                                await pg.wait_for_timeout(100)
                        except Exception:
                            pass
                    await pg.wait_for_timeout(400)
                    res = await pg.evaluate(DETECT)
                except Exception as e:
                    res = [{"kind": "error", "text": str(e)[:120]}]
                if res:
                    shot = OUT / f"{NAME}_{w}_{len(findings)}.png"
                    try:
                        await pg.screenshot(path=str(shot))
                    except Exception:
                        pass
                    findings.append({"url": u, "final": pg.url.replace(BASE, ""), "width": w, "issues": res[:15], "shot": str(shot)})
                (OUT / f"{NAME}.json").write_text(json.dumps({"visited": visited, "findings": findings}, indent=1))
            await ctx.close()
        await br.close()
    print(NAME, "visited", visited, "pages with issues", len(findings))


asyncio.run(main())
