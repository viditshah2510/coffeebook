"""
Coffeebook Scout — Full Browser Exploration Script
Explores https://coffeebook.thescale.in systematically
"""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

BASE_URL = "https://coffeebook.thescale.in"
SCREENSHOTS_DIR = Path("/home/vidit/projects/coffeebook/.testing/screenshots")
PROGRESS_DIR = Path("/home/vidit/projects/coffeebook/.testing/PROGRESS")
TESTING_DIR = Path("/home/vidit/projects/coffeebook/.testing")

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_DIR.mkdir(parents=True, exist_ok=True)

api_calls = []
console_errors = []
discovered_routes = []
interactive_elements = {}

def log(msg):
    print(f"[SCOUT] {msg}")

def capture_network(page: Page, context_name: str):
    """Capture network requests made on current page"""
    pass  # We'll use response listeners

def save_progress(pages_done, pages_pending):
    lines = ["# Scout Progress\n"]
    for p in pages_done:
        lines.append(f"- [x] {p}\n")
    for p in pages_pending:
        lines.append(f"- [ ] {p}\n")
    (PROGRESS_DIR / "SCOUT-PROGRESS.md").write_text("".join(lines))

def explore_page(page: Page, url: str, name: str):
    """Navigate to a page and capture its state"""
    log(f"Exploring: {url}")
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(1)

        # Screenshot
        screenshot_path = str(SCREENSHOTS_DIR / f"page-{name}.png")
        page.screenshot(path=screenshot_path, full_page=True)
        log(f"  Screenshot saved: page-{name}.png")

        # Get page title
        title = page.title()

        # Get all visible text content summary
        content = page.content()

        # Enumerate interactive elements
        buttons = [b.inner_text().strip() for b in page.locator("button").all() if b.is_visible()]
        links = []
        for a in page.locator("a[href]").all():
            try:
                href = a.get_attribute("href")
                text = a.inner_text().strip()
                if href and not href.startswith("http") or (href and "coffeebook" in href):
                    links.append({"text": text, "href": href})
            except:
                pass

        inputs = []
        for inp in page.locator("input, textarea, select").all():
            try:
                inp_type = inp.get_attribute("type") or inp.evaluate("el => el.tagName.toLowerCase()")
                inp_name = inp.get_attribute("name") or inp.get_attribute("id") or inp.get_attribute("placeholder") or ""
                inp_label = inp.get_attribute("aria-label") or ""
                inputs.append({"type": inp_type, "name": inp_name, "label": inp_label})
            except:
                pass

        return {
            "url": url,
            "name": name,
            "title": title,
            "buttons": buttons,
            "links": links,
            "inputs": inputs,
            "screenshot": f"page-{name}.png"
        }
    except Exception as e:
        log(f"  ERROR on {url}: {e}")
        return {"url": url, "name": name, "error": str(e)}


def run_exploration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})

        # Collect all network requests
        all_requests = []
        all_console = []

        page = context.new_page()

        # Wire up listeners
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

        pages_done = []
        findings = {}

        # ============================================================
        # STEP 1: Landing page / Password gate
        # ============================================================
        log("=== STEP 1: Landing / Password Gate ===")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-00-landing.png"), full_page=True)

        # Check what's on the landing page
        content = page.content()
        title = page.title()
        log(f"  Title: {title}")

        # Look for password input
        password_inputs = page.locator("input[type='password'], input[type='text'], input[placeholder*='password' i], input[placeholder*='PIN' i]").all()
        log(f"  Password inputs found: {len(password_inputs)}")

        # Take snapshot of what we see
        visible_text = page.locator("body").inner_text()
        log(f"  Page text preview: {visible_text[:300]}")

        # Try to find the password field and fill it
        try:
            # Try common patterns for password gate
            pw_input = page.locator("input").first
            if pw_input.is_visible():
                pw_input.fill("scale@123")
                log("  Filled password field")
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-01-password-filled.png"), full_page=True)

                # Submit
                submit_btn = page.locator("button[type='submit'], button").first
                submit_btn.click()
                page.wait_for_load_state("networkidle", timeout=15000)
                time.sleep(1)
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-02-after-password.png"), full_page=True)
                log(f"  After password submit URL: {page.url}")
                log(f"  After password title: {page.title()}")
        except Exception as e:
            log(f"  Password gate error: {e}")

        pages_done.append("Landing/Password gate (/)")
        save_progress(pages_done, ["Profile selection", "/feed", "/entry/new", "/roasteries", "/estates"])

        # ============================================================
        # STEP 2: Profile Selection
        # ============================================================
        log("=== STEP 2: Profile Selection ===")
        current_url = page.url
        log(f"  Current URL: {current_url}")
        visible_text = page.locator("body").inner_text()
        log(f"  Page text: {visible_text[:500]}")

        page.screenshot(path=str(SCREENSHOTS_DIR / "page-03-profile-selection.png"), full_page=True)

        # Find profile buttons
        profile_buttons = page.locator("button, a").all()
        profile_names = []
        for btn in profile_buttons:
            try:
                text = btn.inner_text().strip()
                if text and len(text) < 30:
                    profile_names.append(text)
            except:
                pass
        log(f"  Buttons/links found: {profile_names}")

        # Click Vidit profile
        try:
            vidit_btn = page.locator("text=Vidit").first
            if vidit_btn.is_visible():
                vidit_btn.click()
                page.wait_for_load_state("networkidle", timeout=15000)
                time.sleep(1)
                log(f"  After Vidit click URL: {page.url}")
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-04-after-profile.png"), full_page=True)
            else:
                log("  Vidit button not visible, trying any button")
                # Try clicking first profile
                for btn in page.locator("button").all():
                    text = btn.inner_text().strip()
                    if text in ["Vidit", "Karan", "Amar"]:
                        btn.click()
                        page.wait_for_load_state("networkidle", timeout=15000)
                        time.sleep(1)
                        break
        except Exception as e:
            log(f"  Profile selection error: {e}")

        pages_done.append("Profile selection")

        # ============================================================
        # STEP 3: Feed Page
        # ============================================================
        log("=== STEP 3: Feed Page ===")
        page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        log(f"  Feed URL: {page.url}")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-05-feed.png"), full_page=True)

        feed_text = page.locator("body").inner_text()
        log(f"  Feed text preview: {feed_text[:600]}")

        # Document feed elements
        feed_buttons = []
        for btn in page.locator("button").all():
            try:
                if btn.is_visible():
                    text = btn.inner_text().strip()
                    aria = btn.get_attribute("aria-label") or ""
                    feed_buttons.append({"text": text, "aria": aria})
            except:
                pass
        log(f"  Feed buttons: {json.dumps(feed_buttons, indent=2)}")

        # Look for entry cards
        entry_cards = page.locator("a[href*='/entry/']").all()
        log(f"  Entry card links found: {len(entry_cards)}")
        entry_hrefs = []
        for card in entry_cards:
            try:
                href = card.get_attribute("href")
                entry_hrefs.append(href)
            except:
                pass
        log(f"  Entry hrefs: {entry_hrefs[:5]}")

        # Look for filter controls
        filter_elements = page.locator("select, [role='combobox'], [role='listbox']").all()
        log(f"  Filter elements: {len(filter_elements)}")

        findings["feed"] = {
            "url": page.url,
            "buttons": feed_buttons,
            "entry_count": len(entry_cards),
            "entry_hrefs": entry_hrefs[:10],
        }

        pages_done.append("/feed")
        save_progress(pages_done, ["/entry/new", "/roasteries", "/estates", "entry detail", "entry edit"])

        # ============================================================
        # STEP 4: Header / Navigation
        # ============================================================
        log("=== STEP 4: Header Navigation ===")
        # Look for hamburger/menu
        menu_btns = page.locator("button[aria-label*='menu' i], button[aria-label*='nav' i], [class*='hamburger'], [class*='menu-btn']").all()
        log(f"  Menu buttons: {len(menu_btns)}")

        # Try clicking hamburger
        try:
            hamburger = page.locator("button").filter(has_text="").first
            # Look for menu icon buttons
            for btn in page.locator("button").all():
                aria = btn.get_attribute("aria-label") or ""
                if "menu" in aria.lower() or "nav" in aria.lower():
                    log(f"  Found menu button: {aria}")
                    btn.click()
                    time.sleep(1)
                    page.screenshot(path=str(SCREENSHOTS_DIR / "page-06-menu-open.png"), full_page=True)
                    nav_text = page.locator("body").inner_text()
                    log(f"  Menu open text: {nav_text[:300]}")
                    # Close it
                    page.keyboard.press("Escape")
                    break
        except Exception as e:
            log(f"  Menu error: {e}")

        # ============================================================
        # STEP 5: New Entry Form
        # ============================================================
        log("=== STEP 5: New Entry Form ===")
        page.goto(f"{BASE_URL}/entry/new", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        log(f"  Entry/new URL: {page.url}")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-07-entry-new.png"), full_page=True)

        entry_text = page.locator("body").inner_text()
        log(f"  Entry form text: {entry_text[:1000]}")

        # Enumerate ALL form fields
        all_inputs = []
        for inp in page.locator("input, textarea, select").all():
            try:
                if inp.is_visible():
                    tag = inp.evaluate("el => el.tagName.toLowerCase()")
                    inp_type = inp.get_attribute("type") or tag
                    inp_name = inp.get_attribute("name") or ""
                    inp_id = inp.get_attribute("id") or ""
                    inp_placeholder = inp.get_attribute("placeholder") or ""
                    inp_label = inp.get_attribute("aria-label") or ""
                    inp_class = inp.get_attribute("class") or ""
                    all_inputs.append({
                        "tag": tag, "type": inp_type, "name": inp_name,
                        "id": inp_id, "placeholder": inp_placeholder,
                        "aria-label": inp_label
                    })
            except:
                pass
        log(f"  Form inputs: {json.dumps(all_inputs, indent=2)}")

        # Document buttons in the form
        form_buttons = []
        for btn in page.locator("button").all():
            try:
                if btn.is_visible():
                    text = btn.inner_text().strip()
                    aria = btn.get_attribute("aria-label") or ""
                    btn_type = btn.get_attribute("type") or ""
                    form_buttons.append({"text": text, "aria": aria, "type": btn_type})
            except:
                pass
        log(f"  Form buttons: {json.dumps(form_buttons, indent=2)}")

        # Scroll down to see more
        page.evaluate("window.scrollBy(0, 500)")
        time.sleep(0.5)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-07b-entry-new-scroll1.png"), full_page=True)

        page.evaluate("window.scrollBy(0, 500)")
        time.sleep(0.5)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-07c-entry-new-scroll2.png"), full_page=True)

        page.evaluate("window.scrollBy(0, 500)")
        time.sleep(0.5)
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-07d-entry-new-scroll3.png"), full_page=True)

        findings["entry_new"] = {
            "url": page.url,
            "inputs": all_inputs,
            "buttons": form_buttons,
        }

        pages_done.append("/entry/new")

        # ============================================================
        # STEP 6: Try filling the new entry form
        # ============================================================
        log("=== STEP 6: Fill New Entry Form ===")
        page.goto(f"{BASE_URL}/entry/new", wait_until="networkidle", timeout=30000)
        time.sleep(2)

        try:
            # Fill coffee name
            name_inputs = page.locator("input[placeholder*='coffee' i], input[placeholder*='name' i], input[name*='name' i]").all()
            if name_inputs:
                name_inputs[0].fill("Scout Test Coffee")
                log("  Filled coffee name")
            else:
                # Try first text input
                text_inputs = page.locator("input[type='text']").all()
                if text_inputs:
                    text_inputs[0].fill("Scout Test Coffee")
                    log("  Filled first text input with coffee name")

            time.sleep(0.5)
            page.screenshot(path=str(SCREENSHOTS_DIR / "page-08-form-filling.png"), full_page=True)

            # Try to interact with roast level toggles
            roast_btns = page.locator("button").all()
            for btn in roast_btns:
                text = btn.inner_text().strip().lower()
                if text in ["light", "medium", "dark", "medium-dark", "medium light"]:
                    btn.click()
                    log(f"  Clicked roast level: {text}")
                    break

            # Try brew type
            for btn in page.locator("button").all():
                text = btn.inner_text().strip().lower()
                if text in ["espresso", "filter", "pour over", "v60", "aeropress", "french press"]:
                    btn.click()
                    log(f"  Clicked brew type: {text}")
                    break

            page.screenshot(path=str(SCREENSHOTS_DIR / "page-08b-form-partial.png"), full_page=True)

        except Exception as e:
            log(f"  Form fill error: {e}")

        # ============================================================
        # STEP 7: Roasteries Page
        # ============================================================
        log("=== STEP 7: Roasteries Page ===")
        page.goto(f"{BASE_URL}/roasteries", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        log(f"  Roasteries URL: {page.url}")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-09-roasteries.png"), full_page=True)

        roasteries_text = page.locator("body").inner_text()
        log(f"  Roasteries text: {roasteries_text[:800]}")

        roast_buttons = []
        for btn in page.locator("button").all():
            try:
                if btn.is_visible():
                    text = btn.inner_text().strip()
                    aria = btn.get_attribute("aria-label") or ""
                    roast_buttons.append({"text": text, "aria": aria})
            except:
                pass
        log(f"  Roastery buttons: {json.dumps(roast_buttons, indent=2)}")

        roast_inputs = []
        for inp in page.locator("input, textarea").all():
            try:
                if inp.is_visible():
                    roast_inputs.append({
                        "type": inp.get_attribute("type") or "text",
                        "placeholder": inp.get_attribute("placeholder") or "",
                        "name": inp.get_attribute("name") or ""
                    })
            except:
                pass
        log(f"  Roastery inputs: {json.dumps(roast_inputs, indent=2)}")

        # Try clicking "Add" button
        try:
            add_btn = page.locator("button").filter(has_text="Add").first
            if add_btn.is_visible():
                add_btn.click()
                time.sleep(1)
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-09b-roastery-add-clicked.png"), full_page=True)
                add_text = page.locator("body").inner_text()
                log(f"  After add click: {add_text[:300]}")
        except Exception as e:
            log(f"  Roastery add error: {e}")

        findings["roasteries"] = {
            "url": page.url,
            "buttons": roast_buttons,
            "inputs": roast_inputs,
            "page_text": roasteries_text[:500]
        }

        pages_done.append("/roasteries")
        save_progress(pages_done, ["/estates", "entry detail", "entry edit", "filters"])

        # ============================================================
        # STEP 8: Estates Page
        # ============================================================
        log("=== STEP 8: Estates Page ===")
        page.goto(f"{BASE_URL}/estates", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        log(f"  Estates URL: {page.url}")
        page.screenshot(path=str(SCREENSHOTS_DIR / "page-10-estates.png"), full_page=True)

        estates_text = page.locator("body").inner_text()
        log(f"  Estates text: {estates_text[:800]}")

        estate_buttons = []
        for btn in page.locator("button").all():
            try:
                if btn.is_visible():
                    text = btn.inner_text().strip()
                    aria = btn.get_attribute("aria-label") or ""
                    estate_buttons.append({"text": text, "aria": aria})
            except:
                pass
        log(f"  Estate buttons: {json.dumps(estate_buttons, indent=2)}")

        estate_inputs = []
        for inp in page.locator("input, textarea").all():
            try:
                if inp.is_visible():
                    estate_inputs.append({
                        "type": inp.get_attribute("type") or "text",
                        "placeholder": inp.get_attribute("placeholder") or "",
                        "name": inp.get_attribute("name") or "",
                        "label": inp.get_attribute("aria-label") or ""
                    })
            except:
                pass
        log(f"  Estate inputs: {json.dumps(estate_inputs, indent=2)}")

        # Click Add button
        try:
            for btn in page.locator("button").all():
                text = btn.inner_text().strip()
                if "add" in text.lower() or "new" in text.lower() or "+" in text:
                    if btn.is_visible():
                        btn.click()
                        time.sleep(1)
                        page.screenshot(path=str(SCREENSHOTS_DIR / "page-10b-estate-add.png"), full_page=True)
                        after_text = page.locator("body").inner_text()
                        log(f"  After estate add click: {after_text[:400]}")

                        # Check for new inputs in the form
                        new_inputs = []
                        for inp in page.locator("input, textarea").all():
                            try:
                                if inp.is_visible():
                                    new_inputs.append({
                                        "type": inp.get_attribute("type") or "text",
                                        "placeholder": inp.get_attribute("placeholder") or "",
                                        "label": inp.get_attribute("aria-label") or inp.get_attribute("name") or ""
                                    })
                            except:
                                pass
                        log(f"  Estate form inputs after add: {json.dumps(new_inputs, indent=2)}")
                        break
        except Exception as e:
            log(f"  Estate add error: {e}")

        findings["estates"] = {
            "url": page.url,
            "buttons": estate_buttons,
            "inputs": estate_inputs,
            "page_text": estates_text[:500]
        }

        pages_done.append("/estates")

        # ============================================================
        # STEP 9: Entry Detail Page (if entries exist)
        # ============================================================
        log("=== STEP 9: Entry Detail Page ===")
        page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=30000)
        time.sleep(2)

        # Find entry links
        entry_links = page.locator("a[href*='/entry/']").all()
        log(f"  Entry links on feed: {len(entry_links)}")

        if entry_links:
            first_entry_href = None
            for link in entry_links:
                try:
                    href = link.get_attribute("href")
                    if href and "/entry/" in href and "new" not in href and "edit" not in href:
                        first_entry_href = href
                        break
                except:
                    pass

            if first_entry_href:
                full_entry_url = f"{BASE_URL}{first_entry_href}" if first_entry_href.startswith("/") else first_entry_href
                log(f"  Navigating to entry: {full_entry_url}")
                page.goto(full_entry_url, wait_until="networkidle", timeout=30000)
                time.sleep(2)
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-11-entry-detail.png"), full_page=True)

                entry_detail_text = page.locator("body").inner_text()
                log(f"  Entry detail text: {entry_detail_text[:800]}")

                detail_buttons = []
                for btn in page.locator("button").all():
                    try:
                        if btn.is_visible():
                            text = btn.inner_text().strip()
                            aria = btn.get_attribute("aria-label") or ""
                            detail_buttons.append({"text": text, "aria": aria})
                    except:
                        pass
                log(f"  Entry detail buttons: {json.dumps(detail_buttons, indent=2)}")

                # Check for edit link
                edit_links = page.locator("a[href*='/edit'], button[aria-label*='edit' i]").all()
                log(f"  Edit links: {len(edit_links)}")

                findings["entry_detail"] = {
                    "url": page.url,
                    "buttons": detail_buttons,
                    "text": entry_detail_text[:600]
                }

                # ============================================================
                # STEP 10: Entry Edit Page
                # ============================================================
                log("=== STEP 10: Entry Edit Page ===")
                edit_url = page.url.rstrip("/") + "/edit"
                page.goto(edit_url, wait_until="networkidle", timeout=30000)
                time.sleep(2)
                log(f"  Edit URL: {page.url}")
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-12-entry-edit.png"), full_page=True)

                edit_text = page.locator("body").inner_text()
                log(f"  Edit page text: {edit_text[:800]}")

                edit_inputs = []
                for inp in page.locator("input, textarea, select").all():
                    try:
                        if inp.is_visible():
                            tag = inp.evaluate("el => el.tagName.toLowerCase()")
                            edit_inputs.append({
                                "tag": tag,
                                "type": inp.get_attribute("type") or tag,
                                "name": inp.get_attribute("name") or "",
                                "id": inp.get_attribute("id") or "",
                                "placeholder": inp.get_attribute("placeholder") or "",
                                "value": inp.input_value() if tag in ["input", "textarea"] else ""
                            })
                    except:
                        pass
                log(f"  Edit form inputs: {json.dumps(edit_inputs, indent=2)}")

                edit_buttons = []
                for btn in page.locator("button").all():
                    try:
                        if btn.is_visible():
                            text = btn.inner_text().strip()
                            aria = btn.get_attribute("aria-label") or ""
                            edit_buttons.append({"text": text, "aria": aria})
                    except:
                        pass
                log(f"  Edit buttons: {json.dumps(edit_buttons, indent=2)}")

                # Scroll to see entire edit form
                page.evaluate("window.scrollBy(0, 600)")
                time.sleep(0.5)
                page.screenshot(path=str(SCREENSHOTS_DIR / "page-12b-entry-edit-scroll.png"), full_page=True)

                findings["entry_edit"] = {
                    "url": page.url,
                    "inputs": edit_inputs,
                    "buttons": edit_buttons,
                    "text": edit_text[:600]
                }

                pages_done.append("/entry/[id] (detail)")
                pages_done.append("/entry/[id]/edit")

        save_progress(pages_done, ["filters test", "complete"])

        # ============================================================
        # STEP 11: Test Feed Filters
        # ============================================================
        log("=== STEP 11: Feed Filters ===")
        page.goto(f"{BASE_URL}/feed", wait_until="networkidle", timeout=30000)
        time.sleep(2)

        # Look for filter elements more thoroughly
        all_filter_elements = []

        # Check for select elements
        selects = page.locator("select").all()
        for sel in selects:
            try:
                if sel.is_visible():
                    options = sel.locator("option").all()
                    option_texts = [o.inner_text().strip() for o in options]
                    all_filter_elements.append({
                        "type": "select",
                        "id": sel.get_attribute("id") or "",
                        "name": sel.get_attribute("name") or "",
                        "options": option_texts
                    })
            except:
                pass

        # Check for custom dropdowns
        dropdowns = page.locator("[role='combobox'], [role='listbox'], [data-filter]").all()
        log(f"  Select filters: {len(selects)}, Dropdowns: {len(dropdowns)}")
        log(f"  Filter elements: {json.dumps(all_filter_elements, indent=2)}")

        # Check visible page structure for filters
        filter_section = page.locator("[class*='filter'], [class*='Filter']").all()
        log(f"  Filter sections: {len(filter_section)}")

        page.screenshot(path=str(SCREENSHOTS_DIR / "page-13-feed-filters.png"), full_page=True)

        findings["feed_filters"] = {
            "filter_elements": all_filter_elements,
            "select_count": len(selects),
            "dropdown_count": len(dropdowns)
        }

        # ============================================================
        # STEP 12: Check all API calls observed
        # ============================================================
        log("=== STEP 12: Network Requests Summary ===")
        api_calls_filtered = [r for r in all_requests if
                              r.get("resource_type") in ["fetch", "xhr"] or
                              "/api/" in r.get("url", "")]
        log(f"  Total requests: {len(all_requests)}")
        log(f"  API calls: {len(api_calls_filtered)}")
        for req in api_calls_filtered:
            log(f"  {req['method']} {req['url']} -> {req['status']}")

        log("=== STEP 13: Console Messages ===")
        errors = [m for m in all_console if m["type"] in ["error", "warning"]]
        log(f"  Total console messages: {len(all_console)}")
        log(f"  Errors/warnings: {len(errors)}")
        for err in errors[:20]:
            log(f"  [{err['type']}] {err['text'][:200]}")

        # ============================================================
        # Save all findings to files
        # ============================================================

        # Save raw data as JSON
        raw_data = {
            "findings": findings,
            "api_calls": all_requests,
            "console_messages": all_console
        }
        (TESTING_DIR / "raw-scout-data.json").write_text(json.dumps(raw_data, indent=2, default=str))

        browser.close()

        return raw_data

if __name__ == "__main__":
    data = run_exploration()
    print("\n[SCOUT] Exploration complete. Raw data saved.")
    print(f"[SCOUT] API calls: {len(data['api_calls'])}")
    print(f"[SCOUT] Console messages: {len(data['console_messages'])}")
