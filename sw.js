/* wfd. — versioned offline cache. Original recordings remain byte-identical. Plan duration UI revision. */
const VERSION = '1.5.0';
const CACHE = `wfd-pwa-refactor-${VERSION}-ux9`;
const ROOT = new URL('./', self.registration.scope).href;
const url = path => new URL(path, ROOT).href;
const APP = url('index.html');
const SOURCE = ['sentences','word-timings','waveforms','locales','scoring','study','player-ui','pwa','help','review-exam','theme','main','storage','study-plan','review-model','media-session','adaptive-performance','word-audio','typing-model','typing'];
const SHELL = [APP, ...['manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'].map(url), ...SOURCE.map(n=>url(`app/v${VERSION}/src/${n}.js`)), ...['base','components','layout'].map(n=>url(`app/v${VERSION}/styles/${n}.css`))];
const AUDIO = Array.from({length:191},(_,i)=>url(`audio/${String(i+1).padStart(3,'0')}.mp3`));
const assets = new Set([...SHELL,...AUDIO]);
// Activate the small app shell before downloading the entire audio library.
async function precache(){
 const cache=await caches.open(CACHE);
 try {
  await cache.addAll(SHELL.map(p=>new Request(p,{cache:'reload'})));
 } catch(e){ await caches.delete(CACHE); throw e; }
}
self.addEventListener('install',e=>e.waitUntil(precache().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

// Keep prior audio available until the new cache is complete. The recordings
// are immutable across these releases, so reuse their full responses.
let preparation=null;
function downloadPlan(hint){
 const maximum=hint?.maximum===2?2:8;
 const initial=[2,4,8].includes(hint?.initial)?hint.initial:4;
 return { size:Math.min(initial,maximum),maximum };
}
function nextBatchSize(size,maximum,elapsed){
 if(elapsed>1500)return Math.max(2,size/2);
 if(elapsed<500)return Math.min(maximum,size*2);
 return size;
}
async function prepareAudio(hint){
 try {
  const cache=await caches.open(CACHE);
  const present=new Set((await cache.keys()).map(request=>request.url));
  const missing=AUDIO.filter(path=>!present.has(path));
  const plan=downloadPlan(hint);
  let size=plan.size;
  for(let i=0;i<missing.length;){
   const batch=missing.slice(i,i+size);
   const started=Date.now();
   const results=await Promise.allSettled(batch.map(async path=>{
    const previous=await caches.match(path);
    if(previous&&previous.status===200)await cache.put(path,previous);
    else await cache.add(new Request(path));
   }));
   if(results.some(result=>result.status==='rejected'))return false;
   i+=batch.length;
   size=nextBatchSize(size,plan.maximum,Date.now()-started);
  }
  if(!await offlineReady())return false;
  // Defer cleanup until successful preparation; quota or network failure
  // leaves prior audio available, and the next attempt resumes missing files.
  try {
   for(const k of await caches.keys())if(k.startsWith('wfd-pwa-')&&k!==CACHE)await caches.delete(k);
  } catch {}
  return true;
 } catch {return false;}
}
function prepareOnce(hint){
 if(!preparation)preparation=prepareAudio(hint).finally(()=>{preparation=null;});
 return preparation;
}
async function offlineReady() {
  try {
    if (!(await caches.has(CACHE))) return false;
    const cache = await caches.open(CACHE);
    const present = new Set((await cache.keys()).map(request => request.url));
    return [...assets].every(path => present.has(path));
  } catch {
    return false;
  }
}

self.addEventListener('message', event => {
  if(event.data?.type==='wfd:prepare-offline'&&event.data.version===VERSION){
    event.waitUntil((async()=>{
      const ready=await prepareOnce(event.data.download);
      if(event.source)event.source.postMessage({type:'wfd:offline-prepared',version:VERSION,ready});
    })());
    return;
  }
  if (event.data?.type !== 'wfd:offline-status' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const ready = event.data.version === VERSION && await offlineReady();
    event.ports[0].postMessage({ version: VERSION, ready });
  })());
});

async function serveAsset(req, canonical){
 let cached;
 try {
  const cache=await caches.open(CACHE);
  cached=await cache.match(canonical);
  if(!cached&&AUDIO.includes(canonical))cached=await caches.match(canonical);
 } catch {}
 if(!cached) return fetch(req);
 const range=req.headers.get('range');
 if(!range||!AUDIO.includes(canonical)) return cached;
 // Safari and Chromium may request partial MP3 responses. Cached assets are complete files.
 const bytes=await cached.arrayBuffer(); const size=bytes.byteLength;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 const invalid=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 if(!match||(!match[1]&&!match[2])) return invalid();
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start) return invalid();
 return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)}});
}
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const parsed=new URL(req.url);if(parsed.origin!==self.location.origin)return;
 const canonical=parsed.origin+parsed.pathname;
 if(req.mode==='navigate'&&(canonical===ROOT||canonical===APP)){
  // Keep HTML and its versioned assets on the same release. A new worker updates them together.
  e.respondWith((async()=>{try{const c=await caches.open(CACHE);const cached=await c.match(APP);if(cached)return cached;}catch{}return fetch(req)})());return;
 }
 if(assets.has(canonical)) e.respondWith(serveAsset(req,canonical));
});
