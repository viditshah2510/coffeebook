"""
Coffeebook Scout v2 — Full Browser Exploration
Uses proper sessionStorage/localStorage/cookie injection for auth
"""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, BrowserContext

BASE_URL = "https://coffeebook.thescale.in"
SCREENSHOTS_DIR = Path("/home/vidit/projects/coffeebook/.testing/screenshots")
PROGRESS_DIR = Path("/home/vidit/projects/coffeebook/.testing/PROGRESS")
TESTING_DIR = Path("/home/vidit/projects/coffeebook/.testing")

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_DIR.mkdir(parents=True, exist_ok=True)

def log(msg):
    print(f"[SCOUT] {msg}", flush=True)

def setup_auth(page: Page):
    """Set up authentication via sessionStorage, localStorage, and cookie"""
    log("Setting up auth...")
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
    time.sleep(1)

    # Set all auth tokens that the app uses
    page.evaluate("""() => {
        // Password gate - uses sessionStorage
        sessionStorage.setItem('coffeebook-auth', 'true');
        // Profile selection - uses localStorage
        localStorage.setItem('coffeebook-profile', 'vidit');
        // Profile cookie - for server components
        document.cookie = 'coffeebook-profile=vidit;path=/;max-age=31536000;samesite=lax';
    }""")
    log("Auth tokens set (sessionStorage + localStorage + cookie)")

def get_buttons(page: Page):
    buttons = []
    for btn in page.locator("button").all():
        try:
            if btn.is_visible():
                text = btn.inner_text().strip()
                aria = btn.get_attribute("aria-label") or ""
                btn_type = btn.get_attribute("type") or ""
                buttons.append({"text": text[:60], "aria": aria, "type": btn_type})
        except:
            pass
    return buttons

def get_inputs(page: Page):
    inputs = []
    for inp in page.locator("input, textarea, select").all():
        try:
            if inp.is_visible():
                tag = inp.evaluate("el => el.tagName.toLowerCase()")
                inputs.append({
                    "tag": tag,
                    "type": inp.get_attribute("type") or tag,
                    "name": inp.get_attribute("name") or "",
                    "id": inp.get_attribute("id") or "",
                    "placeholder": inp.get_attribute("placeholder") or "",
                    "aria-label": inp.get_attribute("aria-label") or "",
                })
        except:
            pass
    return inputs

def get_links(page: Page):
    links = []
    for a in page.locator("a[href]").all():
        try:
            href = a.get_attribute("href") or ""
            text = a.inner_text().strip()
            links.append({"text": text[:40], "href": href})
        except:
            pass
    return links

def navigate_authed(page: Page, url: str):
    """Navigate to a URL, re-injecting auth if needed"""
    page.goto(url, wait_until="networkidle", timeout=30000)
    time.sleep(1.5)

    # Check if we got a 500 error page
    body_text = page.locator("body").inner_text()
    if "couldn't load" in body_text.lower() or "server error" in body_text.lower():
        log(f"  Got error page at {url}, re-injecting auth and retrying...")
        # Go back to root to set storage
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
        time.sleep(0.5)
        page.evaluate("""() => {
            sessionStorage.setItem('coffeebook-auth', 'true');
            localStorage.setItem('coffeebook-profile', 'vidit');
            document.cookie = 'coffeebook-profile=vidit;path=/;max-age=31536000;samesite=lax';
        }""")
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(2)

def run_exploration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            extra_http_headers={}
        )

        # Set the profile cookie at context level too
        context.add_cookies([{
            "name": "coffeebook-profile",
            "value": "vidit",
            "domain": "coffeebook.thescale.in",
            "path": "/",
        }])

        all_requests = []
        all_console = []

        page = context.new_page()

        page.on("response", lambda r: all_requests.append({
            "method": r.request.method,
            "url": r.url,
            "status": r.status,
            "resource_type": r.request.resource_type
        }))
        page.on("console", lambda msg: all_console.append({
            "type": msg.type,
            "text": msg.text,
            "url": page.url
        }))

        findings = {}
        pages_done = []

        # ============================================================
        # STEP 1: Password Gate & Authentication
        # ============================================================
        log("=== STEP 1: Landing + Auth Setup ===")
        setup_auth(page)

        # Now navigate to root and take screenshot of profile selection
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(1.5)
        title = page.title()
        body_text = page.locator("body").inner_text()
        log(f"  Title: {title}")
        log(f"  Page text: {body_text[:400]}")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-01-landing-authed.png"), full_page=True)

        # Should show profile selector now
        findings["landing"] = {
            "url": page.url,
            "title": title,
            "text": body_text[:300],
            "buttons": get_buttons(page),
        }
        pages_done.append("/ (landing)")

        # ============================================================
        # STEP 2: Feed Page
        # ============================================================
        log("=== STEP 2: Feed Page ===")
        navigate_authed(page, f"{BASE_URL}/feed")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-02-feed.png"), full_page=True)

        feed_url = page.url
        feed_title = page.title()
        feed_text = page.locator("body").inner_text()
        log(f"  URL: {feed_url}")
        log(f"  Title: {feed_title}")
        log(f"  Text (first 800 chars): {feed_text[:800]}")

        feed_buttons = get_buttons(page)
        feed_inputs = get_inputs(page)
        feed_links = get_links(page)

        log(f"  Buttons: {json.dumps(feed_buttons, indent=2)}")
        log(f"  Inputs: {json.dumps(feed_inputs, indent=2)}")

        # Count entry cards
        entry_cards = page.locator("a[href*='/entry/']").all()
        entry_hrefs = []
        for card in entry_cards:
            try:
                href = card.get_attribute("href")
                if href and "/entry/" in href and "new" not in href and "edit" not in href:
                    entry_hrefs.append(href)
            except:
                pass
        log(f"  Entry cards found: {len(entry_hrefs)}")
        log(f"  Entry hrefs: {entry_hrefs[:5]}")

        # Look at the full page HTML structure for filter elements
        # Scroll down
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-02a-feed-top.png"), full_page=True)

        findings["feed"] = {
            "url": feed_url,
            "title": feed_title,
            "text_preview": feed_text[:600],
            "buttons": feed_buttons,
            "inputs": feed_inputs,
            "entry_count": len(entry_hrefs),
            "entry_hrefs": entry_hrefs[:10],
        }
        pages_done.append("/feed")

        # ============================================================
        # STEP 3: Header / Nav Menu
        # ============================================================
        log("=== STEP 3: Header Navigation ===")
        # Look for hamburger menu
        nav_links = []
        for btn in page.locator("button, a").all():
            try:
                aria = btn.get_attribute("aria-label") or ""
                text = btn.inner_text().strip()
                if "menu" in aria.lower() or "hamburger" in aria.lower() or text == "":
                    tag = btn.evaluate("el => el.tagName.toLowerCase()")
                    log(f"  Possible menu button: tag={tag}, aria={aria}, text='{text[:30]}'")
            except:
                pass

        # Try to find and click any menu/nav button
        try:
            # Look for SVG-only buttons (hamburger icons)
            all_btns = page.locator("button").all()
            log(f"  Total buttons on feed: {len(all_btns)}")
            for i, btn in enumerate(all_btns):
                try:
                    text = btn.inner_text().strip()
                    aria = btn.get_attribute("aria-label") or ""
                    log(f"    Button[{i}]: text='{text[:30]}', aria='{aria}'")
                except:
                    pass
        except Exception as e:
            log(f"  Button enum error: {e}")

        # Try clicking what looks like a menu button (non-text button)
        try:
            header = page.locator("header, nav, [class*='header'], [class*='Header']").first
            if header.is_visible():
                header_html = header.inner_html()
                log(f"  Header HTML preview: {header_html[:500]}")
        except Exception as e:
            log(f"  Header inspect error: {e}")

        # ============================================================
        # STEP 4: Check FilterBar more deeply
        # ============================================================
        log("=== STEP 4: FilterBar Inspection ===")
        navigate_authed(page, f"{BASE_URL}/feed")
        time.sleep(1)

        # Get full rendered HTML of filter section
        try:
            filter_bar = page.locator("[class*='filter' i], [class*='Filter']").first
            if filter_bar.count() > 0 and filter_bar.is_visible():
                log(f"  Filter bar found: {filter_bar.inner_html()[:600]}")
        except Exception as e:
            log(f"  FilterBar error: {e}")

        # Check for select elements, comboboxes
        selects = page.locator("select").all()
        log(f"  Select elements: {len(selects)}")
        for sel in selects:
            try:
                options = [o.inner_text() for o in sel.locator("option").all()]
                log(f"    Select options: {options}")
            except:
                pass

        # Check for shadcn/ui components (radix)
        radix = page.locator("[data-radix-select-trigger], [role='combobox'], [role='listbox']").all()
        log(f"  Radix/combobox elements: {len(radix)}")
        for r in radix:
            try:
                text = r.inner_text().strip()
                log(f"    Combobox text: '{text[:50]}'")
            except:
                pass

        # Get the full page HTML to analyze structure
        try:
            html_snippet = page.evaluate("""() => {
                const main = document.querySelector('main');
                return main ? main.innerHTML.substring(0, 2000) : 'no main found';
            }""")
            log(f"  Main HTML snippet: {html_snippet[:1500]}")
        except Exception as e:
            log(f"  HTML snippet error: {e}")

        page.screenshot(path=str(SCREENSHOTS_DIR / "page-02b-feed-filters.png"), full_page=True)

        # Try feed with profile param
        navigate_authed(page, f"{BASE_URL}/feed?profile=vidit")
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-02c-feed-filtered.png"), full_page=True)
        filtered_text = page.locator("body").inner_text()
        log(f"  Feed with profile=vidit: {filtered_text[:400]}")

        # ============================================================
        # STEP 5: New Entry Form
        # ============================================================
        log("=== STEP 5: New Entry Form ===")
        navigate_authed(page, f"{BASE_URL}/entry/new")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-entry-new.png"), full_page=True)

        entry_new_url = page.url
        entry_new_text = page.locator("body").inner_text()
        log(f"  URL: {entry_new_url}")
        log(f"  Text: {entry_new_text[:1200]}")

        entry_inputs = get_inputs(page)
        entry_buttons = get_buttons(page)
        log(f"  Inputs: {json.dumps(entry_inputs, indent=2)}")
        log(f"  Buttons: {json.dumps(entry_buttons, indent=2)}")

        # Get full HTML to understand structure
        try:
            form_html = page.evaluate("""() => {
                const form = document.querySelector('form');
                if (form) return form.innerHTML.substring(0, 3000);
                const main = document.querySelector('main');
                return main ? main.innerHTML.substring(0, 3000) : 'not found';
            }""")
            log(f"  Form HTML: {form_html[:2500]}")
        except Exception as e:
            log(f"  Form HTML error: {e}")

        # Scroll through the form to capture more
        page.evaluate("window.scrollBy(0, 400)")
        time.sleep(0.5)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-03b-entry-new-mid.png"), full_page=True)
        mid_inputs = get_inputs(page)
        mid_buttons = get_buttons(page)
        log(f"  After scroll inputs: {json.dumps(mid_inputs, indent=2)}")
        log(f"  After scroll buttons: {json.dumps(mid_buttons, indent=2)}")

        page.evaluate("window.scrollBy(0, 400)")
        time.sleep(0.5)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-03c-entry-new-bottom.png"), full_page=True)
        bottom_inputs = get_inputs(page)
        bottom_buttons = get_buttons(page)
        log(f"  After 2nd scroll inputs: {json.dumps(bottom_inputs, indent=2)}")
        log(f"  After 2nd scroll buttons: {json.dumps(bottom_buttons, indent=2)}")

        page.evaluate("window.scrollBy(0, 400)")
        time.sleep(0.5)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-03d-entry-new-bottom2.png"), full_page=True)

        findings["entry_new"] = {
            "url": entry_new_url,
            "text": entry_new_text[:800],
            "inputs": entry_inputs,
            "buttons": entry_buttons,
        }
        pages_done.append("/entry/new")

        # ============================================================
        # STEP 6: Try submitting the new entry form
        # ============================================================
        log("=== STEP 6: Fill and Submit Entry Form ===")
        navigate_authed(page, f"{BASE_URL}/entry/new")
        time.sleep(1.5)

        try:
            # Scroll to top first
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(0.5)

            # Find and fill coffee name - look for text inputs
            all_text_inputs = page.locator("input[type='text'], input:not([type])").all()
            log(f"  Text inputs available: {len(all_text_inputs)}")
            for i, inp in enumerate(all_text_inputs):
                try:
                    ph = inp.get_attribute("placeholder") or ""
                    name = inp.get_attribute("name") or ""
                    log(f"    Input[{i}]: placeholder='{ph}', name='{name}'")
                    if "name" in ph.lower() or "coffee" in ph.lower() or i == 0:
                        inp.fill("Scout Test Espresso")
                        log(f"    Filled input[{i}] with 'Scout Test Espresso'")
                except:
                    pass

            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03e-form-filling.png"), full_page=True)

            # Click roast level buttons
            for btn in page.locator("button").all():
                try:
                    text = btn.inner_text().strip()
                    if text in ["Light", "Medium", "Medium Dark", "Dark"]:
                        btn.click()
                        log(f"  Clicked roast: {text}")
                        time.sleep(0.3)
                        break
                except:
                    pass

            # Click brew type buttons
            for btn in page.locator("button").all():
                try:
                    text = btn.inner_text().strip()
                    if text in ["Espresso", "Pour Over", "Filter", "AeroPress", "French Press"]:
                        btn.click()
                        log(f"  Clicked brew: {text}")
                        time.sleep(0.3)
                        break
                except:
                    pass

            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03f-form-toggles.png"), full_page=True)

            # Look for numeric inputs (bean weight, shot weight, etc)
            page.evaluate("window.scrollTo(0, 400)")
            time.sleep(0.5)
            number_inputs = page.locator("input[type='number']").all()
            log(f"  Number inputs: {len(number_inputs)}")
            for i, inp in enumerate(number_inputs):
                try:
                    if inp.is_visible():
                        ph = inp.get_attribute("placeholder") or ""
                        name = inp.get_attribute("name") or ""
                        aria = inp.get_attribute("aria-label") or ""
                        log(f"    Number input[{i}]: placeholder='{ph}', name='{name}', aria='{aria}'")
                        inp.fill(str(18 + i * 5))
                except:
                    pass

            # Fill text areas
            textareas = page.locator("textarea").all()
            log(f"  Textareas: {len(textareas)}")
            for i, ta in enumerate(textareas):
                try:
                    if ta.is_visible():
                        ph = ta.get_attribute("placeholder") or ""
                        log(f"    Textarea[{i}]: placeholder='{ph}'")
                        ta.fill("Chocolate, caramel, nutty finish. Great acidity.")
                except:
                    pass

            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03g-form-filled.png"), full_page=True)

            # Scroll to bottom to find submit button
            page.evaluate("window.scrollTo(0, 99999)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03h-form-bottom.png"), full_page=True)
            bottom_btns = get_buttons(page)
            log(f"  Bottom buttons: {json.dumps(bottom_btns, indent=2)}")

            # Find and click submit
            submitted = False
            for btn in page.locator("button[type='submit'], button").all():
                try:
                    text = btn.inner_text().strip()
                    if any(kw in text.lower() for kw in ["save", "submit", "add", "create", "log"]):
                        if btn.is_visible():
                            log(f"  Clicking submit button: '{text}'")
                            btn.click()
                            page.wait_for_load_state("networkidle", timeout=15000)
                            time.sleep(2)
                            log(f"  After submit URL: {page.url}")
                            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03i-after-submit.png"), full_page=True)
                            after_text = page.locator("body").inner_text()
                            log(f"  After submit text: {after_text[:300]}")
                            submitted = True
                            break
                except:
                    pass

            if not submitted:
                log("  Could not find submit button")

        except Exception as e:
            log(f"  Form fill error: {e}")

        # ============================================================
        # STEP 7: Roasteries Page
        # ============================================================
        log("=== STEP 7: Roasteries Page ===")
        navigate_authed(page, f"{BASE_URL}/roasteries")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-04-roasteries.png"), full_page=True)

        roasteries_url = page.url
        roasteries_text = page.locator("body").inner_text()
        log(f"  URL: {roasteries_url}")
        log(f"  Text: {roasteries_text[:800]}")

        roastery_buttons = get_buttons(page)
        roastery_inputs = get_inputs(page)
        log(f"  Buttons: {json.dumps(roastery_buttons, indent=2)}")
        log(f"  Inputs: {json.dumps(roastery_inputs, indent=2)}")

        # Try to get HTML structure
        try:
            main_html = page.evaluate("() => document.querySelector('main')?.innerHTML?.substring(0, 2000) || ''")
            log(f"  Main HTML: {main_html[:1500]}")
        except Exception as e:
            log(f"  HTML error: {e}")

        # Look for add button / dialog trigger
        try:
            for btn in page.locator("button").all():
                text = btn.inner_text().strip()
                if btn.is_visible() and ("add" in text.lower() or "new" in text.lower() or "+" in text or text == ""):
                    aria = btn.get_attribute("aria-label") or ""
                    log(f"  Potential add button: '{text}' aria='{aria}'")
        except Exception as e:
            log(f"  Button scan error: {e}")

        # Click any "Add" button to open dialog
        try:
            clicked = False
            for btn in page.locator("button").all():
                text = btn.inner_text().strip()
                if btn.is_visible() and "add" in text.lower():
                    log(f"  Clicking add button: '{text}'")
                    btn.click()
                    time.sleep(1.5)
                    page.screenshot(path=str(SCREENSHOTS_DIR / "page-04b-roastery-dialog.png"), full_page=True)
                    dialog_text = page.locator("body").inner_text()
                    log(f"  After add click: {dialog_text[:500]}")
                    dialog_inputs = get_inputs(page)
                    log(f"  Dialog inputs: {json.dumps(dialog_inputs, indent=2)}")
                    dialog_buttons = get_buttons(page)
                    log(f"  Dialog buttons: {json.dumps(dialog_buttons, indent=2)}")
                    clicked = True
                    break

            if not clicked:
                log("  No add button found — checking for FAB/icon button")
                # Try clicking buttons without text (might be icon buttons)
                for btn in page.locator("button").all():
                    text = btn.inner_text().strip()
                    if btn.is_visible() and (not text or "+" in text):
                        log(f"  Clicking icon button: '{text}'")
                        btn.click()
                        time.sleep(1.5)
                        page.screenshot(path=str(SCREENSHOTS_DIR / "page-04c-roastery-icon-btn.png"), full_page=True)
                        break
        except Exception as e:
            log(f"  Roastery dialog error: {e}")

        findings["roasteries"] = {
            "url": roasteries_url,
            "text": roasteries_text[:600],
            "buttons": roastery_buttons,
            "inputs": roastery_inputs,
        }
        pages_done.append("/roasteries")

        # ============================================================
        # STEP 8: Estates Page
        # ============================================================
        log("=== STEP 8: Estates Page ===")
        navigate_authed(page, f"{BASE_URL}/estates")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-05-estates.png"), full_page=True)

        estates_url = page.url
        estates_text = page.locator("body").inner_text()
        log(f"  URL: {estates_url}")
        log(f"  Text: {estates_text[:800]}")

        estate_buttons = get_buttons(page)
        estate_inputs = get_inputs(page)
        log(f"  Buttons: {json.dumps(estate_buttons, indent=2)}")
        log(f"  Inputs: {json.dumps(estate_inputs, indent=2)}")

        # Get HTML structure
        try:
            main_html = page.evaluate("() => document.querySelector('main')?.innerHTML?.substring(0, 2000) || ''")
            log(f"  Main HTML: {main_html[:1500]}")
        except Exception as e:
            log(f"  HTML error: {e}")

        # Click Add button
        try:
            for btn in page.locator("button").all():
                text = btn.inner_text().strip()
                if btn.is_visible() and ("add" in text.lower() or "+" in text):
                    log(f"  Clicking estate add button: '{text}'")
                    btn.click()
                    time.sleep(1.5)
                    page.screenshot(path=str(SCREENSHOTS_DIR / "page-05b-estate-dialog.png"), full_page=True)
                    dialog_text = page.locator("body").inner_text()
                    log(f"  Estate dialog text: {dialog_text[:500]}")
                    dialog_inputs = get_inputs(page)
                    log(f"  Estate dialog inputs: {json.dumps(dialog_inputs, indent=2)}")
                    dialog_buttons = get_buttons(page)
                    log(f"  Estate dialog buttons: {json.dumps(dialog_buttons, indent=2)}")
                    break
        except Exception as e:
            log(f"  Estate dialog error: {e}")

        findings["estates"] = {
            "url": estates_url,
            "text": estates_text[:600],
            "buttons": estate_buttons,
            "inputs": estate_inputs,
        }
        pages_done.append("/estates")

        # ============================================================
        # STEP 9: Entry Detail Page
        # ============================================================
        log("=== STEP 9: Entry Detail Page ===")
        navigate_authed(page, f"{BASE_URL}/feed")
        time.sleep(1.5)

        # Re-collect entry hrefs
        entry_links_fresh = page.locator("a[href*='/entry/']").all()
        fresh_hrefs = []
        for link in entry_links_fresh:
            try:
                href = link.get_attribute("href")
                if href and "/entry/" in href and "new" not in href and "edit" not in href:
                    fresh_hrefs.append(href)
            except:
                pass
        log(f"  Entry links on feed: {fresh_hrefs[:5]}")

        if fresh_hrefs:
            entry_url = f"{BASE_URL}{fresh_hrefs[0]}" if fresh_hrefs[0].startswith("/") else fresh_hrefs[0]
            navigate_authed(page, entry_url)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-06-entry-detail.png"), full_page=True)

            detail_text = page.locator("body").inner_text()
            log(f"  Entry detail text: {detail_text[:1000]}")
            detail_buttons = get_buttons(page)
            log(f"  Detail buttons: {json.dumps(detail_buttons, indent=2)}")
            detail_links = get_links(page)
            log(f"  Detail links: {json.dumps(detail_links[:10], indent=2)}")

            # Scroll through
            page.evaluate("window.scrollBy(0, 400)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-06b-entry-detail-mid.png"), full_page=True)

            findings["entry_detail"] = {
                "url": page.url,
                "text": detail_text[:800],
                "buttons": detail_buttons,
            }
            pages_done.append("/entry/[id] (detail)")

            # ============================================================
            # STEP 10: Entry Edit Page
            # ============================================================
            log("=== STEP 10: Entry Edit Page ===")
            edit_url = page.url.rstrip("/") + "/edit"
            navigate_authed(page, edit_url)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-07-entry-edit.png"), full_page=True)

            edit_text = page.locator("body").inner_text()
            log(f"  Edit URL: {page.url}")
            log(f"  Edit text: {edit_text[:1000]}")
            edit_inputs = get_inputs(page)
            edit_buttons = get_buttons(page)
            log(f"  Edit inputs: {json.dumps(edit_inputs, indent=2)}")
            log(f"  Edit buttons: {json.dumps(edit_buttons, indent=2)}")

            # Scroll through edit form
            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-07b-entry-edit-mid.png"), full_page=True)

            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-07c-entry-edit-bottom.png"), full_page=True)

            findings["entry_edit"] = {
                "url": page.url,
                "text": edit_text[:800],
                "inputs": edit_inputs,
                "buttons": edit_buttons,
            }
            pages_done.append("/entry/[id]/edit")
        else:
            log("  No entries found on feed — cannot test detail/edit pages")

        # ============================================================
        # STEP 11: API Routes Discovery
        # ============================================================
        log("=== STEP 11: Network Requests Summary ===")
        api_calls = [r for r in all_requests if
                     r.get("resource_type") in ["fetch", "xhr"] or
                     "/api/" in r.get("url", "")]
        log(f"  Total requests captured: {len(all_requests)}")
        log(f"  API/fetch calls: {len(api_calls)}")
        for r in api_calls:
            log(f"  {r['method']} {r['url']} -> {r['status']}")

        # Look at ALL unique fetch/xhr calls
        unique_api = {}
        for r in all_requests:
            if r.get("resource_type") in ["fetch", "xhr"]:
                key = f"{r['method']} {r['url']}"
                unique_api[key] = r['status']

        log(f"\n  Unique API endpoints:")
        for ep, status in sorted(unique_api.items()):
            log(f"    {ep} -> {status}")

        log("\n=== STEP 12: Console Messages ===")
        log(f"  Total: {len(all_console)}")
        for msg in all_console:
            if msg["type"] in ["error", "warning"]:
                log(f"  [{msg['type']}] {msg['text'][:200]} (on {msg['url'][:60]})")

        # Also check for Next.js RSC calls (document fetches with _rsc)
        rsc_calls = [r for r in all_requests if "_rsc=" in r.get("url", "")]
        log(f"\n  Next.js RSC calls: {len(rsc_calls)}")
        for r in rsc_calls:
            log(f"    {r['method']} {r['url'][:100]} -> {r['status']}")

        # ============================================================
        # Save all findings
        # ============================================================
        raw_data = {
            "findings": findings,
            "api_calls": all_requests,
            "console_messages": all_console,
            "unique_api_endpoints": unique_api,
        }
        (TESTING_DIR / "raw-scout-data.json").write_text(
            json.dumps(raw_data, indent=2, default=str)
        )
        log("  Raw data saved to raw-scout-data.json")

        # Update progress
        progress_lines = ["# Scout Progress\n\n"]
        for p in pages_done:
            progress_lines.append(f"- [x] {p}\n")
        progress_lines.append(f"- [x] Network monitoring\n")
        progress_lines.append(f"- [x] Console error capture\n")
        (PROGRESS_DIR / "SCOUT-PROGRESS.md").write_text("".join(progress_lines))

        browser.close()
        return raw_data


if __name__ == "__main__":
    data = run_exploration()
    print("\n[SCOUT] Exploration complete.")
    print(f"[SCOUT] Total requests: {len(data['api_calls'])}")
    print(f"[SCOUT] Console messages: {len(data['console_messages'])}")
