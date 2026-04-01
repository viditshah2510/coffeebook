"""
Scout: Check hamburger menu and additional interactions
"""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:3456"
SCREENSHOTS_DIR = Path("/home/vidit/projects/coffeebook/.testing/screenshots")

def inject_auth(page: Page):
    page.evaluate("""() => {
        sessionStorage.setItem('coffeebook-auth', 'true');
        localStorage.setItem('coffeebook-profile', 'vidit');
        document.cookie = 'coffeebook-profile=vidit;path=/;max-age=31536000;samesite=lax';
    }""")

def log(msg):
    print(f"[SCOUT] {msg}", flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.add_cookies([{
        "name": "coffeebook-profile",
        "value": "vidit",
        "domain": "localhost",
        "path": "/",
    }])
    page = context.new_page()

    # Go to feed, inject auth
    page.goto(BASE_URL, wait_until="domcontentloaded")
    inject_auth(page)
    page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=30000)
    time.sleep(1.5)

    # Find and click hamburger/menu button (button[0] is the menu icon)
    all_btns = page.locator("button").all()
    log(f"Total buttons on feed: {len(all_btns)}")
    for i, btn in enumerate(all_btns):
        text = btn.inner_text().strip()
        cls = btn.get_attribute("class") or ""
        aria = btn.get_attribute("aria-label") or ""
        log(f"  btn[{i}]: text='{text[:20]}', class='{cls[:60]}', aria='{aria}'")

    # Click the first button (hamburger menu) - it's button[0]
    log("\nClicking button[0] (hamburger menu)...")
    all_btns[0].click()
    time.sleep(1.5)
    page.screenshot(path=str(SCREENSHOTS_DIR / "page-09-menu-open.png"), full_page=True)
    menu_html = page.evaluate("() => document.body.innerHTML.substring(0, 3000)")
    body_text = page.locator("body").inner_text()
    log(f"After menu click body text:\n{body_text[:500]}")

    # Find nav links in the menu
    menu_links = []
    for a in page.locator("a[href]").all():
        href = a.get_attribute("href") or ""
        text = a.inner_text().strip()
        menu_links.append({"text": text, "href": href})
    log(f"\nAll links after menu open: {json.dumps(menu_links, indent=2)}")

    # Check for dialog/drawer
    drawer = page.locator("[role='dialog'], [data-radix-dialog], [class*='sheet'], [class*='drawer'], [class*='Sheet'], [class*='Drawer']").all()
    log(f"Dialog/drawer elements: {len(drawer)}")
    for d in drawer:
        log(f"  Drawer text: '{d.inner_text().strip()[:200]}'")

    # Also check for a popover/dropdown
    popovers = page.locator("[role='menu'], [role='menuitem']").all()
    log(f"Menu role elements: {len(popovers)}")

    # Screenshot full page
    page.screenshot(path=str(SCREENSHOTS_DIR / "page-09b-menu-full.png"), full_page=True)

    # Also try logout button (button[1])
    log("\n--- Checking logout button (button[1]) ---")
    page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=20000)
    time.sleep(1.5)
    all_btns2 = page.locator("button").all()
    if len(all_btns2) > 1:
        log(f"Clicking button[1] (logout)...")
        all_btns2[1].click()
        time.sleep(1.5)
        after_url = page.url
        after_text = page.locator("body").inner_text()
        log(f"After logout click URL: {after_url}")
        log(f"After logout text: {after_text[:300]}")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-10-after-logout.png"), full_page=True)

    # Now test feed filter buttons
    page.goto(BASE_URL, wait_until="domcontentloaded")
    inject_auth(page)
    page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=30000)
    time.sleep(1.5)

    log("\n--- Testing Feed Filter Buttons ---")
    # Click Karan filter
    log("Clicking 'Karan' filter...")
    karan_btn = page.locator("button", has_text="Karan").first
    karan_btn.click()
    page.wait_for_load_state("networkidle", timeout=10000)
    time.sleep(1)
    karan_url = page.url
    karan_text = page.locator("body").inner_text()
    log(f"  After Karan click URL: {karan_url}")
    log(f"  Feed text: {karan_text[:300]}")
    page.screenshot(path=str(SCREENSHOTS_DIR / "page-11-filter-karan.png"), full_page=True)

    # Click Vidit filter
    inject_auth(page)
    page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=30000)
    time.sleep(1)
    log("Clicking 'Medium' roast filter...")
    medium_btn = page.locator("button", has_text="Medium").first
    medium_btn.click()
    page.wait_for_load_state("networkidle", timeout=10000)
    time.sleep(1)
    medium_url = page.url
    medium_text = page.locator("body").inner_text()
    log(f"  After Medium click URL: {medium_url}")
    log(f"  Feed text: {medium_text[:300]}")
    page.screenshot(path=str(SCREENSHOTS_DIR / "page-12-filter-medium.png"), full_page=True)

    # Test existing entry detail - check the delete button
    inject_auth(page)
    page.goto(f"{BASE_URL}/entry/d8a44919-4c8a-4b2d-aea1-197f583158d0", wait_until="networkidle", timeout=30000)
    time.sleep(1.5)
    detail_text = page.locator("body").inner_text()
    log(f"\n--- Existing Entry (Bili hu) Detail ---")
    log(f"  Text:\n{detail_text}")
    page.screenshot(path=str(SCREENSHOTS_DIR / "page-13-bili-hu-detail.png"), full_page=True)

    # Check detail page HTML for edit/delete
    detail_html = page.evaluate("() => document.querySelector('main')?.innerHTML?.substring(0, 3000) || ''")
    log(f"  Detail HTML: {detail_html[:2000]}")

    # Scroll detail page
    page.evaluate("window.scrollBy(0, 500)")
    time.sleep(0.5)
    page.screenshot(path=str(SCREENSHOTS_DIR / "page-13b-bili-hu-detail-scroll.png"), full_page=True)

    # Check API routes more thoroughly
    log("\n--- Checking Server Actions ---")
    api_tests = [
        ("POST", "/api/ocr", {}),
    ]
    for method, path, body in api_tests:
        try:
            resp = page.request.post(f"{BASE_URL}{path}", data=json.dumps(body))
            log(f"  {method} {path}: {resp.status}")
        except Exception as e:
            log(f"  {method} {path}: error - {e}")

    browser.close()
    log("Done.")
