/*
    ╭──────────────────────────────────────────────────────────╮
    │      ▂ ▅ █ ▅ ▂    wfd.                                   │
    │                   WRITE FROM DICTATION                   │
    ╰──────────────────────────────────────────────────────────╯

    Designed & developed by Daseul Kim (김다슬)
    @ektmfdl  /  github.com/dallegro
    Built for learners, by a learner.

    Independent practice tool · Not an official Pearson service.
    Learning materials and audio: Banditbul Education (Nov 19).
*/
const CACHE = 'wfd-pwa-v8-footer-3a19fbc383';
const PREFIX = 'wfd-pwa-';
const APP = new URL('./index.html', self.registration.scope).href;
const ROOT = new URL('./', self.registration.scope).href;
const ASSETS = ['manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll([APP,...ASSETS].map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting();})());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key)}await self.clients.claim()})());
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 const canonical=url.origin+url.pathname;
 if(req.mode==='navigate'&&(canonical===ROOT||canonical===APP)){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);try{
   const response=await fetch(req,{signal:controller.signal});if(response.ok&&response.headers.get('content-type')?.includes('text/html')){try{await cache.put(APP,response.clone())}catch(e){}return response}return (await cache.match(APP))||response;
  }catch(e){return (await cache.match(APP))||new Response('Offline setup incomplete. Please reconnect and reopen wfd.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}finally{clearTimeout(timer)}})());return;
 }
 if(ASSETS.includes(canonical)){event.respondWith((async()=>{const cache=await caches.open(CACHE);return (await cache.match(canonical))||fetch(req)})())}
});
