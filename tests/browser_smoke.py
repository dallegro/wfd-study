"""Run after starting python3 -m http.server 8000 in the repository root."""
import os
from playwright.sync_api import sync_playwright
URL = os.environ.get('WFD_TEST_URL', 'http://localhost:8000/')
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(locale='ko-KR', viewport={'width':390,'height':844}, color_scheme='light')
    context.route('https://static.cloudflareinsights.com/**', lambda route: route.abort())
    # Capture unexpected layout shifts, including those before DOMContentLoaded.
    context.add_init_script("""window.wfdShifts = [];
      if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.wfdShifts.push(entry.value);
          }
        }).observe({type:'layout-shift', buffered:true});
      }""")
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function("document.getElementById('number').textContent === '#001'")
    page.wait_for_function("Number.isFinite(document.getElementById('player').duration)")
    assert page.evaluate("!document.documentElement.hasAttribute('data-wfd-booting')")
    page.wait_for_function("document.getElementById('pwaState').dataset.ready === 'true'", timeout=60000)
    page.wait_for_timeout(250)
    initial_shift = page.evaluate("window.wfdShifts.reduce((a,b)=>a+b,0)")
    print(f'Initial mobile layout shift sum: {initial_shift:.4f}')
    assert initial_shift <= 0.1, f'Unexpected initial layout shifts: {initial_shift}'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('#themeToggle').click()  # system -> light
    page.locator('#themeToggle').click()  # light -> dark
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    page.reload(wait_until='domcontentloaded')
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    page.locator('#dictationMode').click()
    page.locator('#typed').fill('A good architectural structure should be useful, durable and beautiful.')
    page.locator('#check').click()
    assert page.locator('#result .grade-score').inner_text() == '10 / 10'
    page.locator('#next').click()
    assert page.locator('#number').inner_text() == '#002'
    page.reload(wait_until='domcontentloaded')
    assert page.locator('#number').inner_text() == '#002'
    page.locator('#reviewOpen').click()
    assert page.locator('#reviewDialog').is_visible()
    # Enter a recorded sentence and return to the previous study position.
    page.locator('#reviewBody .plus-tabs button').nth(2).click()
    page.locator('#reviewBody .plus-item button').first.click()
    assert page.locator('#reviewSession').is_visible()
    assert page.locator('#number').inner_text() == '#001'
    page.locator('#reviewExit').click()
    assert page.locator('#number').inner_text() == '#002'
    assert page.locator('#reviewSession').is_hidden()
    page.locator('#examOpen').click()
    assert page.locator('#examDialog').is_visible()
    page.locator('#studyHome').click()
    page.locator('#language').select_option('en')
    assert page.locator('html').get_attribute('lang') == 'en'
    page.set_viewport_size({'width':1280,'height':900})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.wait_for_function("document.getElementById('pwaState').dataset.ready === 'true'", timeout=60000)
    assert page.evaluate("async()=> (await (await caches.open('wfd-pwa-refactor-1.4.0')).keys()).length") == 215
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function("Number.isFinite(document.getElementById('player').duration)")
    assert page.locator('#number').inner_text() == '#002'
    page.locator('#stop').click()
    page.wait_for_function("document.getElementById('player').currentTime > 0.1")
    assert not errors, errors
    browser.close()
    print('Browser smoke passed: mobile, desktop, grading, resume, theme, language, navigation, offline audio')
