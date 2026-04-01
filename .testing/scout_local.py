"""
Coffeebook Scout v3 — Local instance exploration
Target: http://localhost:3456
"""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:3456"
SCREENSHOTS_DIR = Path("/home/vidit/projects/coffeebook/.testing/screenshots")
PROGRESS_DIR = Path("/home/vidit/projects/coffeebook/.testing/PROGRESS")
TESTING_DIR = Path("/home/vidit/projects/coffeebook/.testing")

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_DIR.mkdir(parents=True, exist_ok=True)

def log(msg):
    print(f"[SCOUT] {msg}", flush=True)

def get_buttons(page: Page):
    buttons = []
    for btn in page.locator("button").all():
        try:
            if btn.is_visible():
                text = btn.inner_text().strip()
                aria = btn.get_attribute("aria-label") or ""
                btn_type = btn.get_attribute("type") or ""
                buttons.append({"text": text[:80], "aria": aria, "type": btn_type})
        except:
            pass
    return buttons

def get_inputs(page: Page):
    inputs = []
    for inp in page.locator("input, textarea, select").all():
        try:
            tag = inp.evaluate("el => el.tagName.toLowerCase()")
            is_vis = inp.is_visible()
            inputs.append({
                "tag": tag,
                "visible": is_vis,
                "type": inp.get_attribute("type") or tag,
                "name": inp.get_attribute("name") or "",
                "id": inp.get_attribute("id") or "",
                "placeholder": inp.get_attribute("placeholder") or "",
                "aria-label": inp.get_attribute("aria-label") or "",
                "required": inp.get_attribute("required") is not None,
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
            if not href.startswith("http") or "localhost" in href:
                links.append({"text": text[:50], "href": href})
        except:
            pass
    return links

def inject_auth(page: Page):
    """Inject authentication tokens"""
    page.evaluate("""() => {
        sessionStorage.setItem('coffeebook-auth', 'true');
        localStorage.setItem('coffeebook-profile', 'vidit');
        document.cookie = 'coffeebook-profile=vidit;path=/;max-age=31536000;samesite=lax';
    }""")

def navigate_with_auth(page: Page, url: str, name: str):
    """Navigate and re-inject auth if needed"""
    page.goto(url, wait_until="networkidle", timeout=30000)
    time.sleep(1.5)
    body = page.locator("body").inner_text()
    if "couldn't load" in body.lower() or "server error" in body.lower():
        log(f"  Error on {name}, re-injecting auth...")
        page.goto(BASE_URL, wait_until="domcontentloaded")
        inject_auth(page)
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(2)


def run_exploration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
        )
        context.add_cookies([{
            "name": "coffeebook-profile",
            "value": "vidit",
            "domain": "localhost",
            "path": "/",
        }])

        all_requests = []
        all_console = []
        page = context.new_page()

        page.on("response", lambda r: all_requests.append({
            "method": r.request.method,
            "url": r.url,
            "status": r.status,
            "resource_type": r.request.resource_type,
        }))
        page.on("console", lambda msg: all_console.append({
            "type": msg.type,
            "text": msg.text,
            "url": page.url,
        }))

        findings = {}
        pages_done = []

        # =========================================================
        # STEP 1: Landing Page + Auth
        # =========================================================
        log("=== STEP 1: Landing Page (Pre-Auth) ===")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-01-landing-preauth.png"), full_page=True)

        landing_text = page.locator("body").inner_text()
        landing_title = page.title()
        log(f"  Title: {landing_title}")
        log(f"  Text: {landing_text[:400]}")

        # Check for password input
        pw_input = page.locator("input[type='password']").first
        if pw_input.is_visible():
            log("  Password input visible - filling...")
            pw_input.fill("scale@123")
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-01b-password-filled.png"), full_page=True)
            submit = page.locator("button[type='submit']").first
            submit.click()
            page.wait_for_load_state("networkidle", timeout=15000)
            time.sleep(1)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-01c-after-password.png"), full_page=True)
            post_pw_text = page.locator("body").inner_text()
            log(f"  After password: {post_pw_text[:300]}")

        # Now inject auth and set profile
        inject_auth(page)
        time.sleep(0.5)

        page.screenshot(path=str(SCREENSHOTS_DIR / "page-01d-landing-authed.png"), full_page=True)
        authed_text = page.locator("body").inner_text()
        log(f"  After auth injection: {authed_text[:300]}")

        findings["landing"] = {
            "url": BASE_URL + "/",
            "title": landing_title,
            "pre_auth_text": landing_text[:300],
            "buttons": get_buttons(page),
            "inputs": get_inputs(page),
        }
        pages_done.append("/ (landing)")

        # =========================================================
        # STEP 2: Feed Page
        # =========================================================
        log("\n=== STEP 2: Feed Page ===")
        navigate_with_auth(page, f"{BASE_URL}/feed", "feed")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-02-feed.png"), full_page=True)

        feed_url = page.url
        feed_title = page.title()
        feed_text = page.locator("body").inner_text()
        log(f"  URL: {feed_url}")
        log(f"  Title: {feed_title}")
        log(f"  Full page text:\n{feed_text}")

        feed_buttons = get_buttons(page)
        feed_inputs = get_inputs(page)
        feed_links = get_links(page)

        log(f"\n  Buttons: {json.dumps(feed_buttons, indent=2)}")
        log(f"\n  Inputs: {json.dumps(feed_inputs, indent=2)}")
        log(f"\n  Internal links: {json.dumps(feed_links, indent=2)}")

        # Entry cards
        entry_hrefs = []
        for el in page.locator("a[href]").all():
            try:
                href = el.get_attribute("href") or ""
                if "/entry/" in href and "new" not in href and "edit" not in href:
                    entry_hrefs.append(href)
            except:
                pass
        log(f"\n  Entry card hrefs: {entry_hrefs[:10]}")

        # Check for filter selects / comboboxes
        log("\n  --- Filter elements ---")
        selects = page.locator("select").all()
        log(f"  Selects: {len(selects)}")
        combos = page.locator("[role='combobox']").all()
        log(f"  Comboboxes: {len(combos)}")
        for c in combos:
            try:
                log(f"    Combobox: '{c.inner_text().strip()}'")
            except:
                pass

        # Check FAB button
        fab = page.locator("a[href='/entry/new']").all()
        log(f"  FAB /entry/new links: {len(fab)}")
        for f in fab:
            log(f"    FAB text: '{f.inner_text().strip()}'")

        # Get full HTML to understand filter bar structure
        try:
            filter_html = page.evaluate("""() => {
                // Try to find filter bar
                const el = document.querySelector('[class*=filter], [class*=Filter]');
                return el ? el.outerHTML.substring(0, 2000) : 'no filter bar found';
            }""")
            log(f"\n  Filter HTML: {filter_html[:1000]}")
        except Exception as e:
            log(f"  Filter HTML error: {e}")

        findings["feed"] = {
            "url": feed_url,
            "title": feed_title,
            "full_text": feed_text,
            "buttons": feed_buttons,
            "inputs": feed_inputs,
            "links": feed_links,
            "entry_hrefs": entry_hrefs[:10],
        }
        pages_done.append("/feed")

        # =========================================================
        # STEP 3: Header Bar inspection
        # =========================================================
        log("\n=== STEP 3: Header Bar ===")
        try:
            header_html = page.evaluate("""() => {
                const header = document.querySelector('header');
                return header ? header.outerHTML.substring(0, 3000) : 'no header found';
            }""")
            log(f"  Header HTML: {header_html[:2000]}")
        except Exception as e:
            log(f"  Header error: {e}")

        # Try to find and click hamburger/menu
        hamburger_found = False
        for btn in page.locator("button").all():
            try:
                aria = btn.get_attribute("aria-label") or ""
                text = btn.inner_text().strip()
                cls = btn.get_attribute("class") or ""
                # Look for menu/nav/hamburger
                if any(kw in aria.lower() for kw in ["menu", "nav", "open"]):
                    log(f"  Menu button found: aria='{aria}', text='{text}'")
                    btn.click()
                    time.sleep(1)
                    page.screenshot(path=str(SCREENSHOTS_DIR / "page-02b-menu-open.png"), full_page=True)
                    menu_text = page.locator("body").inner_text()
                    log(f"  Menu text: {menu_text[:400]}")
                    hamburger_found = True
                    break
            except:
                pass

        if not hamburger_found:
            log("  No labeled menu button — checking for SVG/icon buttons...")
            # Look at all buttons on feed page
            all_btns_count = page.locator("button").count()
            log(f"  Total buttons: {all_btns_count}")
            for i in range(all_btns_count):
                btn = page.locator("button").nth(i)
                try:
                    text = btn.inner_text().strip()
                    aria = btn.get_attribute("aria-label") or ""
                    cls = btn.get_attribute("class") or ""
                    log(f"    button[{i}]: text='{text[:30]}', aria='{aria}', class='{cls[:60]}'")
                except:
                    pass

        # =========================================================
        # STEP 4: New Entry Form — Full Exploration
        # =========================================================
        log("\n=== STEP 4: New Entry Form ===")
        navigate_with_auth(page, f"{BASE_URL}/entry/new", "entry/new")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-entry-new-top.png"), full_page=True)

        entry_new_url = page.url
        entry_new_title = page.title()
        entry_new_text = page.locator("body").inner_text()
        log(f"  URL: {entry_new_url}")
        log(f"  Title: {entry_new_title}")
        log(f"  Full page text:\n{entry_new_text}")

        entry_inputs = get_inputs(page)
        entry_buttons = get_buttons(page)
        log(f"\n  All inputs: {json.dumps(entry_inputs, indent=2)}")
        log(f"\n  All buttons: {json.dumps(entry_buttons, indent=2)}")

        # Get the full form HTML for deep analysis
        try:
            form_html = page.evaluate("""() => {
                const main = document.querySelector('main');
                return main ? main.innerHTML.substring(0, 5000) : 'no main';
            }""")
            log(f"\n  Form HTML: {form_html[:4000]}")
        except Exception as e:
            log(f"  Form HTML error: {e}")

        # Scroll through form
        for scroll_n in range(1, 6):
            page.evaluate(f"window.scrollTo(0, {scroll_n * 400})")
            time.sleep(0.4)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"page-03{chr(97+scroll_n)}-entry-new-scroll{scroll_n}.png"), full_page=True)
            visible_inputs = [i for i in get_inputs(page) if i.get("visible")]
            inp_summary = [str(i['tag'])+":"+str(i['placeholder'] or i['aria-label'] or i['name']) for i in visible_inputs]
            log(f"  Scroll {scroll_n} - visible inputs: {inp_summary}")

        findings["entry_new"] = {
            "url": entry_new_url,
            "title": entry_new_title,
            "full_text": entry_new_text,
            "inputs": entry_inputs,
            "buttons": entry_buttons,
        }
        pages_done.append("/entry/new")

        # =========================================================
        # STEP 5: Fill and Submit Entry Form
        # =========================================================
        log("\n=== STEP 5: Fill Entry Form ===")
        navigate_with_auth(page, f"{BASE_URL}/entry/new", "entry/new")
        time.sleep(1)
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)

        submit_result = {"success": False, "error": None}

        try:
            # 1) Coffee name
            name_inp = None
            for inp in page.locator("input").all():
                ph = inp.get_attribute("placeholder") or ""
                name = inp.get_attribute("name") or ""
                inp_id = inp.get_attribute("id") or ""
                if any(kw in (ph+name+inp_id).lower() for kw in ["name", "coffee", "title"]):
                    if inp.is_visible():
                        name_inp = inp
                        break
            if not name_inp:
                # Just use first visible text input
                for inp in page.locator("input[type='text'], input:not([type])").all():
                    if inp.is_visible():
                        name_inp = inp
                        break
            if name_inp:
                name_inp.fill("Scout Espresso Blend")
                log("  Filled coffee name: Scout Espresso Blend")

            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-form-step1.png"), full_page=True)

            # 2) Roast level toggle buttons
            roast_clicked = False
            for btn in page.locator("button").all():
                text = btn.inner_text().strip()
                if text in ["Light", "Medium", "Medium Dark", "Dark"]:
                    btn.click()
                    log(f"  Clicked roast level: {text}")
                    roast_clicked = True
                    time.sleep(0.3)
                    break
            if not roast_clicked:
                log("  No roast level button found")

            # 3) Brew type toggle
            brew_clicked = False
            for btn in page.locator("button").all():
                text = btn.inner_text().strip()
                if text in ["Espresso", "Pour Over", "Filter", "AeroPress", "French Press", "Americano", "Cold Brew", "Moka Pot"]:
                    btn.click()
                    log(f"  Clicked brew type: {text}")
                    brew_clicked = True
                    time.sleep(0.3)
                    break
            if not brew_clicked:
                log("  No brew type button found")

            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-form-step2-toggles.png"), full_page=True)

            # 4) Scroll down to brewing params
            page.evaluate("window.scrollTo(0, 500)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-form-step3-brewing.png"), full_page=True)

            # Fill number inputs
            num_inputs = page.locator("input[type='number']").all()
            log(f"  Number inputs: {len(num_inputs)}")
            for i, inp in enumerate(num_inputs):
                try:
                    ph = inp.get_attribute("placeholder") or ""
                    aria = inp.get_attribute("aria-label") or ""
                    name = inp.get_attribute("name") or ""
                    log(f"    num[{i}]: ph='{ph}', aria='{aria}', name='{name}'")
                    if inp.is_visible():
                        values = [18, 36, 28, 15, 400]
                        inp.fill(str(values[i % len(values)]))
                        log(f"    Filled with {values[i % len(values)]}")
                except Exception as e:
                    log(f"    Error on num input {i}: {e}")

            # 5) Fill text areas
            page.evaluate("window.scrollTo(0, 1000)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-form-step4-tasting.png"), full_page=True)

            textareas = page.locator("textarea").all()
            log(f"  Textareas: {len(textareas)}")
            for i, ta in enumerate(textareas):
                try:
                    ph = ta.get_attribute("placeholder") or ""
                    aria = ta.get_attribute("aria-label") or ""
                    log(f"    textarea[{i}]: ph='{ph}', aria='{aria}'")
                    if ta.is_visible():
                        if "flavor" in ph.lower() or i == 0:
                            ta.fill("Chocolate, caramel, hazelnut")
                        elif "taste" in ph.lower() or i == 1:
                            ta.fill("Sweet, balanced, low acidity")
                        else:
                            ta.fill("Good scout test coffee")
                        log(f"    Filled textarea[{i}]")
                except Exception as e:
                    log(f"    Error on textarea {i}: {e}")

            # 6) Check for rating slider
            range_inputs = page.locator("input[type='range']").all()
            log(f"  Range inputs: {len(range_inputs)}")
            for inp in range_inputs:
                try:
                    if inp.is_visible():
                        aria = inp.get_attribute("aria-label") or ""
                        min_v = inp.get_attribute("min") or "0"
                        max_v = inp.get_attribute("max") or "10"
                        log(f"    Range: aria='{aria}', min={min_v}, max={max_v}")
                        inp.fill("8")
                        log("    Set range to 8")
                except Exception as e:
                    log(f"    Range error: {e}")

            page.evaluate("window.scrollTo(0, 99999)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-form-step5-bottom.png"), full_page=True)
            bottom_btns = get_buttons(page)
            log(f"  Bottom buttons: {json.dumps(bottom_btns, indent=2)}")

            # 7) Submit
            for btn in page.locator("button").all():
                try:
                    text = btn.inner_text().strip()
                    btn_type = btn.get_attribute("type") or ""
                    if any(kw in text.lower() for kw in ["save", "submit", "log", "add entry", "create"]) or btn_type == "submit":
                        if btn.is_visible():
                            log(f"  Submitting with button: '{text}' (type={btn_type})")
                            btn.click()
                            page.wait_for_load_state("networkidle", timeout=20000)
                            time.sleep(2)
                            after_url = page.url
                            after_text = page.locator("body").inner_text()
                            log(f"  After submit URL: {after_url}")
                            log(f"  After submit text: {after_text[:400]}")
                            page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-form-submitted.png"), full_page=True)
                            submit_result["success"] = True
                            submit_result["redirect_url"] = after_url
                            break
                except:
                    pass

        except Exception as e:
            submit_result["error"] = str(e)
            log(f"  Form fill error: {e}")

        findings["entry_form_submit"] = submit_result

        # =========================================================
        # STEP 6: Roasteries Page
        # =========================================================
        log("\n=== STEP 6: Roasteries Page ===")
        navigate_with_auth(page, f"{BASE_URL}/roasteries", "roasteries")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-04-roasteries.png"), full_page=True)

        roasteries_url = page.url
        roasteries_text = page.locator("body").inner_text()
        log(f"  URL: {roasteries_url}")
        log(f"  Full text:\n{roasteries_text}")

        roastery_buttons = get_buttons(page)
        roastery_inputs = get_inputs(page)
        roastery_links = get_links(page)
        log(f"\n  Buttons: {json.dumps(roastery_buttons, indent=2)}")
        log(f"\n  Inputs: {json.dumps(roastery_inputs, indent=2)}")

        # Get HTML structure
        try:
            main_html = page.evaluate("() => document.querySelector('main')?.innerHTML?.substring(0, 3000) || ''")
            log(f"\n  Main HTML: {main_html[:2500]}")
        except:
            pass

        # Try clicking Add Roastery dialog
        dialog_inputs_roastery = []
        for btn in page.locator("button").all():
            text = btn.inner_text().strip()
            if btn.is_visible() and ("add" in text.lower() or "new" in text.lower() or "+" in text):
                log(f"  Clicking: '{text}'")
                btn.click()
                time.sleep(1.5)
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-04b-roastery-dialog.png"), full_page=True)
                dialog_text = page.locator("body").inner_text()
                log(f"  Dialog text: {dialog_text[:600]}")
                dialog_inputs_roastery = get_inputs(page)
                dialog_btns = get_buttons(page)
                log(f"  Dialog inputs: {json.dumps(dialog_inputs_roastery, indent=2)}")
                log(f"  Dialog buttons: {json.dumps(dialog_btns, indent=2)}")

                # Try to get dialog HTML
                try:
                    dialog_html = page.evaluate("""() => {
                        const dialog = document.querySelector('[role="dialog"], dialog');
                        return dialog ? dialog.innerHTML.substring(0, 2000) : 'no dialog';
                    }""")
                    log(f"  Dialog HTML: {dialog_html[:1500]}")
                except:
                    pass
                break

        findings["roasteries"] = {
            "url": roasteries_url,
            "full_text": roasteries_text,
            "buttons": roastery_buttons,
            "inputs": roastery_inputs,
            "links": roastery_links,
            "dialog_inputs": dialog_inputs_roastery,
        }
        pages_done.append("/roasteries")

        # =========================================================
        # STEP 7: Estates Page
        # =========================================================
        log("\n=== STEP 7: Estates Page ===")
        navigate_with_auth(page, f"{BASE_URL}/estates", "estates")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-05-estates.png"), full_page=True)

        estates_url = page.url
        estates_text = page.locator("body").inner_text()
        log(f"  URL: {estates_url}")
        log(f"  Full text:\n{estates_text}")

        estate_buttons = get_buttons(page)
        estate_inputs = get_inputs(page)
        log(f"\n  Buttons: {json.dumps(estate_buttons, indent=2)}")
        log(f"\n  Inputs: {json.dumps(estate_inputs, indent=2)}")

        try:
            main_html = page.evaluate("() => document.querySelector('main')?.innerHTML?.substring(0, 3000) || ''")
            log(f"\n  Main HTML: {main_html[:2500]}")
        except:
            pass

        # Click Add dialog
        dialog_inputs_estate = []
        for btn in page.locator("button").all():
            text = btn.inner_text().strip()
            if btn.is_visible() and ("add" in text.lower() or "new" in text.lower() or "+" in text):
                log(f"  Clicking: '{text}'")
                btn.click()
                time.sleep(1.5)
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-05b-estate-dialog.png"), full_page=True)
                dialog_text = page.locator("body").inner_text()
                log(f"  Dialog text: {dialog_text[:600]}")
                dialog_inputs_estate = get_inputs(page)
                dialog_btns = get_buttons(page)
                log(f"  Estate dialog inputs: {json.dumps(dialog_inputs_estate, indent=2)}")
                log(f"  Estate dialog buttons: {json.dumps(dialog_btns, indent=2)}")
                try:
                    dialog_html = page.evaluate("""() => {
                        const dialog = document.querySelector('[role="dialog"], dialog');
                        return dialog ? dialog.innerHTML.substring(0, 2000) : 'no dialog';
                    }""")
                    log(f"  Estate dialog HTML: {dialog_html[:1500]}")
                except:
                    pass
                break

        findings["estates"] = {
            "url": estates_url,
            "full_text": estates_text,
            "buttons": estate_buttons,
            "inputs": estate_inputs,
            "dialog_inputs": dialog_inputs_estate,
        }
        pages_done.append("/estates")

        # =========================================================
        # STEP 8: Entry Detail + Edit
        # =========================================================
        log("\n=== STEP 8: Entry Detail & Edit ===")
        navigate_with_auth(page, f"{BASE_URL}/feed", "feed")
        time.sleep(1.5)

        entry_links = []
        for el in page.locator("a[href]").all():
            try:
                href = el.get_attribute("href") or ""
                if "/entry/" in href and "new" not in href and "edit" not in href:
                    entry_links.append(href)
            except:
                pass
        log(f"  Entry links: {entry_links[:5]}")

        if entry_links:
            entry_url = f"{BASE_URL}{entry_links[0]}"
            navigate_with_auth(page, entry_url, "entry-detail")
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-06-entry-detail.png"), full_page=True)

            detail_text = page.locator("body").inner_text()
            detail_url = page.url
            log(f"  Detail URL: {detail_url}")
            log(f"  Detail text:\n{detail_text}")
            detail_buttons = get_buttons(page)
            log(f"\n  Detail buttons: {json.dumps(detail_buttons, indent=2)}")

            # Scroll
            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-06b-entry-detail-scroll.png"), full_page=True)

            try:
                main_html = page.evaluate("() => document.querySelector('main')?.innerHTML?.substring(0, 4000) || ''")
                log(f"\n  Detail main HTML: {main_html[:3000]}")
            except:
                pass

            findings["entry_detail"] = {
                "url": detail_url,
                "full_text": detail_text,
                "buttons": detail_buttons,
            }
            pages_done.append("/entry/[id] (detail)")

            # Edit page
            edit_url = detail_url.rstrip("/") + "/edit"
            log(f"\n  Navigating to edit: {edit_url}")
            navigate_with_auth(page, edit_url, "entry-edit")
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-07-entry-edit.png"), full_page=True)

            edit_text = page.locator("body").inner_text()
            edit_url_actual = page.url
            log(f"  Edit URL: {edit_url_actual}")
            log(f"  Edit text:\n{edit_text}")
            edit_inputs = get_inputs(page)
            edit_buttons = get_buttons(page)
            log(f"\n  Edit inputs: {json.dumps(edit_inputs, indent=2)}")
            log(f"\n  Edit buttons: {json.dumps(edit_buttons, indent=2)}")

            # Scroll
            for sn in range(1, 5):
                page.evaluate(f"window.scrollTo(0, {sn * 500})")
                time.sleep(0.4)
                page.screenshot(path=str(SCREENSHOTS_DIR / f"page-07{chr(96+sn)}-entry-edit-scroll{sn}.png"), full_page=True)
                visible_inp = [i for i in get_inputs(page) if i.get("visible")]
                inp_sum = [str(i['tag'])+":"+str(i['placeholder'] or i['aria-label'] or i['name']) for i in visible_inp]
                log(f"  Scroll {sn} visible inputs: {inp_sum}")

            findings["entry_edit"] = {
                "url": edit_url_actual,
                "full_text": edit_text,
                "inputs": edit_inputs,
                "buttons": edit_buttons,
            }
            pages_done.append("/entry/[id]/edit")
        else:
            log("  No entries found - skipping detail/edit")

        # =========================================================
        # STEP 9: Feed with Filters
        # =========================================================
        log("\n=== STEP 9: Feed Filters ===")
        navigate_with_auth(page, f"{BASE_URL}/feed", "feed-filters")
        time.sleep(1.5)

        # Try profile filter
        try:
            profile_filter = f"{BASE_URL}/feed?profile=vidit"
            navigate_with_auth(page, profile_filter, "feed-profile-filter")
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-02c-feed-profile-filter.png"), full_page=True)
            log(f"  Feed?profile=vidit text: {page.locator('body').inner_text()[:400]}")
        except Exception as e:
            log(f"  Profile filter error: {e}")

        try:
            roast_filter = f"{BASE_URL}/feed?roast=medium"
            navigate_with_auth(page, roast_filter, "feed-roast-filter")
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-02d-feed-roast-filter.png"), full_page=True)
            log(f"  Feed?roast=medium text: {page.locator('body').inner_text()[:400]}")
        except Exception as e:
            log(f"  Roast filter error: {e}")

        # =========================================================
        # STEP 10: API Routes
        # =========================================================
        log("\n=== STEP 10: API Routes ===")
        # Try to discover API routes
        api_routes = ["/api/uploads", "/api/ocr"]
        for route in api_routes:
            try:
                resp = page.request.get(f"{BASE_URL}{route}")
                log(f"  {route}: {resp.status}")
            except Exception as e:
                log(f"  {route}: error - {e}")

        # =========================================================
        # STEP 11: Network Summary
        # =========================================================
        log("\n=== STEP 11: Network Summary ===")
        api_calls = [r for r in all_requests if r.get("resource_type") in ["fetch", "xhr"] or "/api/" in r.get("url", "")]
        log(f"  Total requests: {len(all_requests)}")
        log(f"  API/fetch calls: {len(api_calls)}")

        unique_endpoints = {}
        for r in all_requests:
            if r.get("resource_type") in ["fetch", "xhr"] or "/api/" in r.get("url", ""):
                key = f"{r['method']} {r['url']}"
                unique_endpoints[key] = r['status']

        log(f"\n  All API endpoints observed:")
        for ep, status in sorted(unique_endpoints.items()):
            log(f"    {ep} -> {status}")

        # Also collect RSC (Next.js React Server Component) calls
        rsc_calls = [r for r in all_requests if "_rsc=" in r.get("url", "")]
        log(f"\n  RSC calls: {len(rsc_calls)}")
        for r in rsc_calls[:20]:
            log(f"    {r['method']} {r['url'][:100]} -> {r['status']}")

        # Document endpoints
        non_rsc_api = {}
        for r in all_requests:
            url = r.get("url", "")
            if "localhost:3456" in url and ("_next" not in url or "api" in url) and "_rsc" not in url:
                if r.get("resource_type") in ["fetch", "xhr", "document"]:
                    key = f"{r['method']} {url.replace('http://localhost:3456', '')}"
                    non_rsc_api[key] = r['status']

        log(f"\n  App endpoints (no static files):")
        for ep, status in sorted(non_rsc_api.items()):
            log(f"    {ep} -> {status}")

        log("\n=== STEP 12: Console Messages ===")
        log(f"  Total console messages: {len(all_console)}")
        errors = [m for m in all_console if m["type"] in ["error", "warning"]]
        log(f"  Errors/warnings: {len(errors)}")
        for err in errors[:30]:
            log(f"  [{err['type']}] {err['text'][:200]} (page: {err['url'][:60]})")

        # =========================================================
        # Save everything
        # =========================================================
        raw_data = {
            "findings": findings,
            "all_requests": all_requests,
            "console_messages": all_console,
            "unique_endpoints": unique_endpoints,
            "non_rsc_endpoints": non_rsc_api,
        }
        (TESTING_DIR / "raw-scout-data.json").write_text(json.dumps(raw_data, indent=2, default=str))
        log("\n  Raw data saved")

        # Progress
        progress = ["# Scout Progress\n\n"]
        for p in pages_done:
            progress.append(f"- [x] {p}\n")
        (PROGRESS_DIR / "SCOUT-PROGRESS.md").write_text("".join(progress))

        browser.close()
        return raw_data


if __name__ == "__main__":
    data = run_exploration()
    print(f"\n[SCOUT] Done. Requests: {len(data['all_requests'])}, Console: {len(data['console_messages'])}")
