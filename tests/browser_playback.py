"""Browser-engine regression checks; not a physical-device lock-screen test."""
import os
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

URL = os.environ.get('WFD_TEST_URL', 'http://localhost:8000/')
ENGINE = os.environ.get('WFD_BROWSER', 'chromium')

with sync_playwright() as p:
    browser = getattr(p, ENGINE).launch()
    context = browser.new_context(locale='en-AU', viewport={'width': 390, 'height': 844})
    context.route('https://static.cloudflareinsights.com/**', lambda route: route.abort())
    # Capture app registrations without depending on the headless OS media UI.
    # Firefox uses its real capability set; Chromium/WebKit exercise the optional
    # category integration with a mock. All must preserve decoded playback.
    simulate_category = ENGINE != 'firefox'
    context.add_init_script("""window.mediaActions = {};
      const media = {setActionHandler(name, fn) {window.mediaActions[name] = fn;},
        setPositionState(value) {this.position = value;}};
      Object.defineProperty(navigator, 'mediaSession', {value: media, configurable: true});
      window.MediaMetadata = class {constructor(value) {Object.assign(this, value);}};
      window.realAudioSessionSupported=!!navigator.audioSession;
      if (SIMULATE_CATEGORY) Object.defineProperty(navigator, 'audioSession', {value: {type:'auto'}, configurable: true});
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
      AudioBufferSourceNode.prototype.start=function(...args){const result=bufferStart.apply(this,args);window.bufferPlayCalls.push({category:navigator.audioSession?.type,offset:args[1],duration:args[2]});return result;};
      const nativePlay=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(...args){
        if(this.id==='player')window.nativePlayCalls.push({category:navigator.audioSession?.type,offset:this.currentTime});
        return nativePlay.apply(this,args);
      };
    """.replace("SIMULATE_CATEGORY", "true" if simulate_category else "false"))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded')
    page.evaluate("""() => {
      const player=document.querySelector('#player');
      window.mediaTrace=[];
      const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
      window.mediaSnapshot=()=>({time:player.currentTime,duration:player.duration,paused:player.paused,seeking:player.seeking,ready:player.readyState,network:player.networkState,seekable:ranges(player.seekable),buffered:ranges(player.buffered),error:player.error?.message,status:document.querySelector('#status').textContent,native:window.nativePlayCalls,buffer:window.bufferPlayCalls});
      for(const name of ['play','playing','pause','seeking','seeked','waiting','stalled','error','ended'])player.addEventListener(name,()=>window.mediaTrace.push({name,...window.mediaSnapshot()}));
    }""")
    def wait_complete():
        try:
            page.wait_for_function(complete, timeout=10000)
        except PlaywrightTimeoutError:
            print('Playback state:', page.evaluate('mediaSnapshot()'), flush=True)
            print('Media events:', page.evaluate('mediaTrace.slice(-30)'), flush=True)
            print('Page errors:', errors, flush=True)
            raise
    page.wait_for_function("Number.isFinite(document.querySelector('#player').duration)")
    page.locator('#language').select_option('en')
    complete = "document.querySelector('#status').textContent === 'Word playback complete'"
    words = page.locator('#english [data-word-index]')
    # A prepared first word must use the fast path even without Audio Session.
    page.wait_for_function('decodeCount > 0', timeout=15000)
    words.nth(3).click()
    wait_complete()
    assert page.evaluate("bufferPlayCalls.length === 1 && bufferPlayCalls[0].duration > 0 && nativePlayCalls.length === 0")
    if simulate_category:
        assert page.evaluate("bufferPlayCalls[0].category === 'playback'")
    else:
        assert not page.evaluate('realAudioSessionSupported')
    words.nth(2).click()
    words.nth(4).click()
    wait_complete()
    assert page.evaluate('bufferPlayCalls.length >= 3 && nativePlayCalls.length === 0')
    assert page.locator('.clip-active').count() == 0
    assert page.evaluate("navigator.mediaSession.metadata == null")
    # Foreground restoration must not require native warm-up.
    page.evaluate("window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pageshow'))")
    previous_calls=page.evaluate('bufferPlayCalls.length')
    words.nth(3).click()
    wait_complete()
    assert page.evaluate('bufferPlayCalls.length') == previous_calls + 1
    assert page.evaluate('nativePlayCalls.length') == 0
    # Missing/ineffective Audio Session is not a reason to downgrade desktop Web Audio.
    page.evaluate("""() => {
      window.savedSession=Object.getOwnPropertyDescriptor(navigator,'audioSession');
      Object.defineProperty(navigator,'audioSession',{value:{get type(){return 'auto'},set type(v){}},configurable:true});
    }""")
    previous_calls=page.evaluate('bufferPlayCalls.length')
    words.nth(3).click()
    wait_complete()
    assert page.evaluate('bufferPlayCalls.length') == previous_calls + 1
    assert page.evaluate('nativePlayCalls.length') == 0
    # Explicitly emulate the narrow Apple-mobile compatibility exception.
    # This checks routing and native progress, not actual iPhone sound output.
    page.evaluate("""() => {
      window.savedPlatform=Object.getOwnPropertyDescriptor(navigator,'platform');
      window.savedUA=Object.getOwnPropertyDescriptor(navigator,'userAgent');
      Object.defineProperty(navigator,'platform',{value:'iPhone',configurable:true});
      Object.defineProperty(navigator,'userAgent',{value:'iPhone Safari',configurable:true});
      Object.defineProperty(navigator,'audioSession',{value:undefined,configurable:true});
    }""")
    previous_calls=page.evaluate('nativePlayCalls.length')
    previous_buffers=page.evaluate('bufferPlayCalls.length')
    words.nth(3).click()
    wait_complete()
    assert page.evaluate('nativePlayCalls.length') == previous_calls + 1
    assert page.evaluate('bufferPlayCalls.length') == previous_buffers
    assert page.evaluate('document.querySelector("#player").currentTime > nativePlayCalls[nativePlayCalls.length-1].offset')
    # A supported playback category removes that exception, even on Apple mobile.
    page.evaluate("Object.defineProperty(navigator,'audioSession',{value:{type:'auto'},configurable:true})")
    words.nth(3).click()
    wait_complete()
    assert page.evaluate('bufferPlayCalls.length') == previous_buffers + 1
    assert page.evaluate("bufferPlayCalls[bufferPlayCalls.length-1].category === 'playback'")
    assert page.evaluate('nativePlayCalls.length') == previous_calls + 1
    page.evaluate("""() => {
      for(const [key,descriptor] of [['audioSession',window.savedSession],['platform',window.savedPlatform],['userAgent',window.savedUA]]){
        if(descriptor)Object.defineProperty(navigator,key,descriptor);
        else delete navigator[key];
      }
    }""")
    print(f'{ENGINE}: decoded playback, foreground restore, optional category and Apple-mobile fallback passed')
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
