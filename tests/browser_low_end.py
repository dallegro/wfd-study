"""Simulated slow CPU and network; not a real low-end phone benchmark."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('WFD_TEST_URL', 'http://localhost:8000/')
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 360, 'height': 640}, is_mobile=True, has_touch=True, locale='en-AU')
    context.route('https://static.cloudflareinsights.com/**', lambda route: route.abort())
    page = context.new_page()
    cdp = context.new_cdp_session(page)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    cdp.send('Network.enable')
    cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 200000, 'uploadThroughput': 93750})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_function("Number.isFinite(document.querySelector('#player').duration)", timeout=60000)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert page.locator('#grid button').count() == 0
    page.locator('#sentenceListToggle').click()
    assert page.locator('#grid button').count() == 10
    page.locator('#sentenceListToggle').click()
    page.locator('#stop').click()
    page.wait_for_function("document.querySelector('#player').currentTime > 0.1", timeout=20000)
    page.locator('#dictationMode').click()
    page.locator('#typed').fill('A good architectural structure should be useful, durable and beautiful.')
    page.locator('#check').click()
    assert page.locator('#result .grade-score').inner_text() == '10 / 10'
    assert not errors, errors
    browser.close()
    print('Simulated low-end CPU/network: first load, layout, lazy list, playback and scoring passed')
