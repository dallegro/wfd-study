/* wfd. — versioned offline cache. Original recordings remain byte-identical. */
const VERSION = '1.1.0';
const CACHE = `wfd-pwa-refactor-${VERSION}`;
const ROOT = new URL('./', self.registration.scope).href;
const url = path => new URL(path, ROOT).href;
const APP = url('index.html');
const SOURCE = ['sentences','word-timings','waveforms','locales','scoring','study','player-ui','pwa','help','review-exam','theme'];
const SHELL = [APP, ...['manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'].map(url), ...SOURCE.map(n=>url(`app/v${VERSION}/src/${n}.js`)), ...['base','components','layout'].map(n=>url(`app/v${VERSION}/styles/${n}.css`))];
const AUDIO = Array.from({length:191},(_,i)=>url(`audio/${String(i+1).padStart(3,'0')}.mp3`));
const assets = new Set([...SHELL,...AUDIO]);
async function precache(){
 const cache=await caches.open(CACHE);
 try {
  await cache.addAll(SHELL.map(p=>new Request(p,{cache:'reload'})));
  // Download audio in the background, with bounded concurrency. Readiness requires all 191 files.
  for(let i=0;i<AUDIO.length;i+=8) await cache.addAll(AUDIO.slice(i,i+8).map(p=>new Request(p,{cache:'reload'})));
 } catch(e){ await caches.delete(CACHE); throw e; }
}
self.addEventListener('install',e=>e.waitUntil(precache().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys()) if(k.startsWith('wfd-pwa-')&&k!==CACHE) await caches.delete(k);
 await self.clients.claim();
})()));
async function serveAsset(req, canonical){
 const cache=await caches.open(CACHE);
 const cached=await cache.match(canonical);
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
  e.respondWith((async()=>{const c=await caches.open(CACHE);return (await c.match(APP))||fetch(req)})());return;
 }
 if(assets.has(canonical)) e.respondWith(serveAsset(req,canonical));
});
