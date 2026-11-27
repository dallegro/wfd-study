"""Typing integration test; run with the repo's local HTTP server."""
import os
from playwright.sync_api import sync_playwright, expect
URL=os.environ.get('WFD_TEST_URL','http://localhost:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(locale='en-AU',viewport={'width':390,'height':844})
    context.route('https://static.cloudflareinsights.com/**',lambda route:route.abort())
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL,wait_until='domcontentloaded')
    page.wait_for_function("document.querySelector('#number').dataset.index === '1'")
    page.locator('#language').select_option('ko')
    assert page.locator('#day option').first.inner_text() == '1회차'
    assert page.locator('#progressText').inner_text() == '10문장 중 0문장 암기 완료'
    assert page.locator('#number').inner_text() == '#001'
    assert page.locator('#number').evaluate("e=>getComputedStyle(e,'::after').content==='none'")
    assert page.locator('#number').get_attribute('aria-label') == '1번 문장'
    assert page.locator('#memorizeHeading h2').inner_text() == '영어 원문'
    page.locator('#translationToggle').uncheck()
    assert page.locator('#korean').is_hidden()
    page.locator('#translationToggle').check()
    assert page.locator('#korean').is_visible()
    page.locator('#language').select_option('en')
    assert page.locator('#day option').first.inner_text() == 'Session 1'
    assert page.locator('#translationToggleRow').is_hidden()
    # Preserve normal playback settings while typing defaults to one sentence and infinite repeats.
    page.locator('#typingToggle').check()
    assert page.locator('#typingArea').is_visible()
    assert page.locator('#playbackFold #typingSettings').count()==1
    assert page.locator('#typingHint').evaluate("e=>e.classList.contains('sr-only')")
    assert page.locator('#memorizeHeading #translationToggle').count()==1
    assert page.locator('#english').evaluate("e=>e.nextElementSibling.id==='typingArea'")
    assert page.locator('#dictationArea').is_hidden()
    assert page.locator('#mark').is_visible()
    assert page.locator('#memorizeMode').get_attribute('aria-pressed')=='true'
    assert page.locator('#repeat').input_value()=='0'
    assert page.locator('#dayPlay').is_hidden()
    assert page.locator('#english').inner_text().strip()
    page.locator('#typingInput').fill('A god')
    assert page.locator('#english [data-typing-state="incorrect"]').count()>0
    assert page.locator('#typingInput').get_attribute('aria-invalid')=='true'
    sentence=page.evaluate("document.querySelector('#english').textContent")
    page.locator('#typingInput').fill(sentence)
    assert page.locator('#typingInput').input_value()==''
    assert page.locator('#typingCount').inner_text().startswith('1 / 5')
    assert page.evaluate("!JSON.parse(localStorage.getItem('wfd191_done')||'{}')[0]")
    page.locator('#typingInput').fill(sentence)
    assert page.locator('#typingCount').inner_text().startswith('2 / 5')
    page.locator('#typingInput').fill('draft')
    page.once('dialog',lambda d:d.dismiss())
    page.locator('#next').click()
    assert page.locator('#number').get_attribute('data-index')=='1'
    assert page.locator('#typingInput').input_value()=='draft'
    page.locator('#typingToggle').uncheck()
    assert page.locator('#typingArea').is_hidden()
    page.locator('#typingToggle').check()
    assert page.locator('#typingInput').input_value()=='draft'
    page.locator('#typingInput').fill('')
    page.locator('#mark').click()
    assert page.locator('#mark').get_attribute('aria-pressed')=='true'
    page.locator('#dictationMode').click()
    assert page.locator('#typingArea').is_hidden()
    assert page.locator('#dictationArea').is_visible()
    assert page.locator('#dictationTitle').inner_text()=='Your answer'
    assert page.locator('#typed').get_attribute('placeholder')=='Type the sentence'
    assert page.locator('#dictationArea .dictation-field #wordCount').inner_text()=='0 words'
    page.locator('#typed').fill('One')
    assert page.locator('#wordCount').inner_text()=='1 word'
    page.locator('#typed').fill('One two three')
    assert page.locator('#wordCount').inner_text()=='3 words'
    page.locator('#typed').fill('')
    assert page.locator('#repeat').input_value()=='3'
    page.locator('#memorizeMode').click()
    assert page.locator('#typingCount').inner_text().startswith('2 / 5')
    page.reload(wait_until='domcontentloaded')
    assert page.locator('#typingArea').is_visible()
    assert page.locator('#typingCount').inner_text().startswith('2 / 5')
    page.locator('#sentenceListToggle').click()
    page.locator('#planChange').click()
    page.locator('[data-goal="20"]').click()
    assert page.locator('#planPreview').inner_text()=='About 10 days'
    assert page.locator('#planDetail').inner_text()=='191 sentences · 10 sessions'
    page.locator('#planCancel').click()
    assert '10 sentences/day' in page.locator('#goalSummary').inner_text()
    page.locator('#planChange').click()
    page.locator('[data-goal="20"]').click()
    page.locator('#planApply').click()
    assert '20 sentences/day' in page.locator('#goalSummary').inner_text()
    assert page.locator('#number').get_attribute('data-index')=='1'
    assert page.locator('#mark').get_attribute('aria-pressed')=='true'
    expect(page.locator('#sentenceList')).to_be_visible()
    page.locator('#playbackFold summary').click()
    expect(page.locator('#playbackFold')).to_have_js_property('open', True)
    expect(page.locator('#sentenceList')).to_be_hidden()
    expect(page.locator('#sentenceListToggle')).to_have_attribute('aria-expanded', 'false')
    for width,height in [(320,720),(390,844),(768,1024),(1280,900)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('#stop').click()
    page.wait_for_function("document.querySelector('#player').currentTime > 0.1")
    assert not errors,errors
    browser.close()
    print('Typing integration passed')
