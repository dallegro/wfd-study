"""Browser-engine regression checks; not a physical-device lock-screen test."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('WFD_TEST_URL', 'http://localhost:8000/')
ENGINE = os.environ.get('WFD_BROWSER', 'chromium')

with sync_playwright() as p:
    browser = getattr(p, ENGINE).launch()
    context = browser.new_context(locale='en-AU', viewport={'width': 390, 'height': 844})
    context.route('https://static.cloudflareinsights.com/**', lambda route: route.abort())
    # Capture app registrations without depending on the headless OS media UI.
    context.add_init_script("""window.mediaActions = {};
      const media = {setActionHandler(name, fn) {window.mediaActions[name] = fn;},
        setPositionState(value) {this.position = value;}};
      Object.defineProperty(navigator, 'mediaSession', {value: media, configurable: true});
      window.MediaMetadata = class {constructor(value) {Object.assign(this, value);}};
    """)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function("Number.isFinite(document.querySelector('#player').duration)")
    page.locator('#stop').click()
    page.wait_for_function("document.querySelector('#player').currentTime > 0.1")
    assert page.evaluate("navigator.mediaSession.metadata.title") == 'WFD #001'
    page.evaluate("mediaActions.pause()")
    page.wait_for_function("document.querySelector('#player').paused")
    page.evaluate("mediaActions.play()")
    page.wait_for_function("!document.querySelector('#player').paused")
    page.evaluate("mediaActions.nexttrack()")
    page.wait_for_function("document.querySelector('#number').textContent === '#002'")
    page.wait_for_function("!document.querySelector('#player').paused")
    page.locator('#dictationMode').click()
    assert page.evaluate("mediaActions.nexttrack === null && mediaActions.seekto === null")
    page.locator('#typed').fill('draft answer')
    assert page.evaluate("navigator.mediaSession.metadata.title") == 'WFD #002'
    page.evaluate("mediaActions.pause()")
    assert page.locator('#typed').input_value() == 'draft answer'
    page.locator('#typed').fill('')
    page.locator('#examOpen').click()
    assert page.evaluate("mediaActions.play === null && navigator.mediaSession.metadata === null")
    assert not errors, errors
    browser.close()
    print(f'{ENGINE}: playback, media controls, dictation protection and exam isolation passed')
