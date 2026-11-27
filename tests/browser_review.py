"""Review and exam UI regression. Simulated exam media events, not an audio benchmark."""
import os, json
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = os.environ.get('WFD_TEST_URL', 'http://localhost:8000/')
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(locale='ko-KR', viewport={'width':390,'height':844})
    context.route('https://static.cloudflareinsights.com/**', lambda route: route.abort())
    page = context.new_page(); errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.goto(URL,wait_until='domcontentloaded')
    page.locator('#language').select_option('ko')
    page.locator('#mark').click()
    assert page.evaluate("JSON.parse(localStorage.getItem('wfd191_learning_v1')).sentences[0].scheduled")
    page.locator('#dictationMode').click(); assert page.locator('#check').is_disabled()
    page.locator('#typed').fill('good structure'); page.locator('#check').click()
    assert page.locator('#result .grade-score').inner_text()=='2 / 10'
    assert page.locator('#result .flow-error-row').count()==1
    page.locator('#reviewOpen').click();page.locator('#reviewBody .plus-tabs button').nth(3).click()
    assert page.locator('.weak-history-row').count()>0
    assert page.locator('#reviewBody .plus-action, #reviewBody .weak-entry').count()==0
    page.locator('#reviewBody .plus-tabs button').nth(2).click()
    assert page.locator('.read-only-history').count()==1
    assert page.locator('.read-only-history button:not(.flow-more)').count()==0
    page.locator('.read-only-history summary').first.click()
    assert page.locator('.history-attempt p').first.inner_text()=='good structure'
    page.locator('#reviewBody .plus-tabs button').nth(1).click()
    assert page.locator('#reviewBody .plus-action').inner_text()=='전체 복습 · 1문장'
    page.locator('.flow-sentence button').first.click()
    assert page.locator('#reviewNext').inner_text()=='건너뛰기'
    assert page.locator('#reviewPosition').inner_text()=='개별 연습'
    assert page.locator('#reviewMeter').is_hidden()
    assert page.locator('#attemptSummary').is_hidden()
    assert page.locator('.utility #reviewNext').is_visible()
    assert page.locator('#reviewNext').bounding_box()['y'] < page.locator('#check').bounding_box()['y']

    assert page.locator('#mark').is_hidden();page.locator('#reviewNext').click()
    assert '건너뛴 문장 1' in page.locator('.review-notice').inner_text()
    page.locator('#reviewBody .plus-tabs button').nth(0).click()
    page.locator('#reviewBody .plus-action').click()
    page.locator('#typed').fill('A good architectural structure should be useful, durable and beautiful.')
    page.locator('#check').click(); assert page.locator('#reviewNext').inner_text()=='복습 완료'
    page.locator('#reviewNext').click();page.locator('#reviewBody .plus-tabs button').nth(3).click()
    assert page.locator('.weak-history-row').count()>0
    assert page.locator('#reviewBody .plus-action, #reviewBody .weak-entry').count()==0
    page.locator('.record-manage:not(.weak-history) summary').click()
    with page.expect_download() as download: page.locator('.record-actions button').first.click()
    backup=Path(download.value.path()).read_bytes()
    assert json.loads(backup)['learning']['sentences']['0']['attempts']==2
    page.locator('#resetAllHistory').click()
    page.locator('.record-manage:not(.weak-history) summary').click()
    with page.expect_navigation(wait_until='domcontentloaded'):
        page.locator('.record-manage input[type=file]').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':backup})
    page.wait_for_function("JSON.parse(localStorage.getItem('wfd191_learning_v1')).sentences[0]?.attempts===2")
    page.locator('#examOpen').click()
    assert page.locator('#examDialog').get_attribute('data-phase')=='landing'
    page.evaluate("()=>{const e=document.getElementById('examAudio');Object.defineProperty(e,'src',{set(){},get(){return '';}});e.play=()=>Promise.resolve();e.pause=()=>{};e.load=()=>{};}")
    page.locator('#examBody .plus-action').click()
    for _ in range(4):
        page.evaluate("document.getElementById('examAudio').dispatchEvent(new Event('ended'))")
        page.locator('#examBody textarea').fill('test answer')
        assert '2단어' in page.locator('#examBody .input-meta').inner_text()
        page.locator('#examBody .plus-action').click()
    assert page.locator('.exam-answer').count()==4
    assert page.locator('.exam-answer[open]').count()==0
    assert page.locator('.exam-answer .grade-score').count()==0
    page.locator('.exam-answer summary').first.click()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#examBody .exam-again').click()
    page.evaluate("document.getElementById('examAudio').dispatchEvent(new Event('error'))")
    assert '음원 재생이 중단' in page.locator('#examBody .exam-status').inner_text()
    assert not errors,errors
    browser.close()
    print('Review, backup restoration and simulated exam interruption checks passed')
