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
      Object.defineProperty(navigator, 'audioSession', {value: {type:'auto'}, configurable: true});
      window.nativePlayCalls=[];
      window.bufferPlayCalls=[];
      window.decodeCount=0;
      const offlinePrototype=(window.OfflineAudioContext||window.webkitOfflineAudioContext).prototype;
      const decode=offlinePrototype.decodeAudioData;
      offlinePrototype.decodeAudioData=function(bytes,success,failure){
        const done=buffer=>{window.decodeCount++;if(success)success(buffer);return buffer;};
        const result=decode.call(this,bytes,done,failure);
        return result;
      };
      const bufferStart=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...args){window.bufferPlayCalls.push({category:navigator.audioSession.type,offset:args[1],duration:args[2]});return bufferStart.apply(this,args);};
      const nativePlay=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(...args){
        if(this.id==='player')window.nativePlayCalls.push({category:navigator.audioSession.type,offset:this.currentTime});
        return nativePlay.apply(this,args);
      };
    """)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function("Number.isFinite(document.querySelector('#player').duration)")
    # Confirm a real decoded-buffer source starts before any full sentence playback.
    page.locator('#language').select_option('en')
    page.wait_for_function('decodeCount > 0', timeout=15000)
    page.locator('#english [data-word-index]').nth(3).click()
    page.wait_for_function('bufferPlayCalls.length === 1', timeout=10000)
    assert page.evaluate("bufferPlayCalls[0].category === 'playback' && bufferPlayCalls[0].duration > 0 && nativePlayCalls.length === 0")
    assert page.evaluate("navigator.mediaSession.metadata == null")
    page.wait_for_function("document.querySelector('#status').textContent === 'Word playback complete'", timeout=10000)
    assert page.locator('.clip-active').count() == 0
    page.locator('#english [data-word-index]').nth(2).click()
    page.locator('#english [data-word-index]').nth(4).click()
    page.wait_for_function("document.querySelector('#status').textContent === 'Word playback complete'", timeout=10000)
    assert page.locator('.clip-active').count() == 0
    assert page.evaluate('bufferPlayCalls.length >= 3')
    # Foreground restoration re-creates output context, not a bootstrap native word.
    page.evaluate("window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pageshow'))")
    previous_calls=page.evaluate('bufferPlayCalls.length')
    page.locator('#english [data-word-index]').nth(3).click()
    page.wait_for_function('count=>bufferPlayCalls.length > count', arg=previous_calls, timeout=10000)
    page.wait_for_function("document.querySelector('#status').textContent === 'Word playback complete'", timeout=10000)
    # Unsupported category selects the original native player without forced warmup.
    page.evaluate("Object.defineProperty(navigator,'audioSession',{value:{get type(){return 'auto'},set type(v){}},configurable:true})")
    previous_calls=page.evaluate('nativePlayCalls.length')
    page.locator('#english [data-word-index]').nth(3).click()
    assert page.evaluate('nativePlayCalls.length') == previous_calls + 1
    page.wait_for_function("document.querySelector('#status').textContent === 'Word playback complete'", timeout=10000)
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
