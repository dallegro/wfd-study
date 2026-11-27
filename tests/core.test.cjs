const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const src = path.join(root,'app/v1.4.3/src');
const {alignDictation} = require(path.join(src,'scoring.js'));
test('exact sentence, case and punctuation',()=>{ const g=alignDictation('A useful structure.','a useful structure'); assert.equal(g.correct,3);assert.equal(g.perfect,true); });
test('omission',()=>{ const g=alignDictation('a good structure','a structure');assert.equal(g.correct,2);assert.equal(g.missing,1);assert.equal(g.perfect,false); });
test('wrong spelling',()=>{const g=alignDictation('a good structure','a god structure');assert.equal(g.wrong,1);assert.equal(g.correct,2)});
test('extra and repeated words',()=>{const g=alignDictation('a good structure','a good good structure');assert.equal(g.extra,1);assert.equal(g.correct,3);assert.equal(g.perfect,false)});
test('empty answer',()=>{const g=alignDictation('a good structure','');assert.equal(g.missing,3);assert.equal(g.correct,0)});
test('191 data entries, timing, waveforms and MP3s',()=>{const {data:entries}=require(path.join(src,'sentences.js'));const {waveforms:waves}=require(path.join(src,'waveforms.js'));const {wordTimes:timings}=require(path.join(src,'word-timings.js'));assert.equal(entries.length,191);assert.equal(waves.length,191);assert.equal(timings.length,191);entries.forEach((e,i)=>{assert.equal(e.n,i+1);assert.ok(!e.audio);assert.ok(fs.statSync(path.join(root,'audio',String(e.n).padStart(3,'0')+'.mp3')).size>100);assert.equal(waves[i].length,48);assert.ok(waves[i].every(x=>x>=0&&x<=1));assert.ok(timings[i].every(t=>t[1]>=t[0]));});});
test('HTML references valid local assets',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const [,p] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))assert.ok(fs.existsSync(path.join(root,p)),p);assert.ok(!html.includes('data:audio/mpeg;base64,'));});
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function worker(){const events={};const bytes=Uint8Array.from([0,1,2,3,4,5]);const fakeCache={match:async()=>new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}})};const c=vm.createContext({URL,Request,Response,Set,Array,Number,Math,caches:{has:async()=>true,open:async()=>fakeCache},fetch:async()=>{throw new Error('unexpected network')},self:{registration:{scope:'https://example.test/wfd-study/'},location:{origin:'https://example.test'},addEventListener:(name,fn)=>events[name]=fn}});vm.runInContext(sw,c);return c;}
test('offline MP3 range response',async()=>{const c=worker();const r=await vm.runInContext(`serveAsset(new Request('https://example.test/wfd-study/audio/001.mp3',{headers:{Range:'bytes=1-3'}}), AUDIO[0])`,c);assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 1-3/6');assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[1,2,3]);});
test('offline suffix and invalid ranges',async()=>{const c=worker();let r=await vm.runInContext(`serveAsset(new Request(AUDIO[0],{headers:{Range:'bytes=-2'}}), AUDIO[0])`,c);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[4,5]);r=await vm.runInContext(`serveAsset(new Request(AUDIO[0],{headers:{Range:'bytes=6-'}}), AUDIO[0])`,c);assert.equal(r.status,416);});
test('every service worker precache path exists',()=>{const c=worker();const paths=vm.runInContext('[...assets]',c);assert.equal(paths.length,217);for(const u of paths)assert.ok(fs.existsSync(path.join(root,new URL(u).pathname.replace('/wfd-study/',''))),u);});

const {isValidGoal,getDayCount,getDayRange,getResumeIndex}=require(path.join(src,'study-plan.js'));
const {readStored,writeStored}=require(path.join(src,'storage.js'));
test('study plan: partial final day and valid bounds',()=>{
  assert.equal(getDayCount(10,191),20);
  assert.deepEqual(getDayRange(19,10,191),{first:190,last:190});
  assert.deepEqual(getDayRange(0,191,191),{first:0,last:190});
  for(const n of [0,-1,1.5,192,NaN])assert.equal(isValidGoal(n,191),false);
  assert.equal(isValidGoal(191,191),true);
});
test('resume index: invalid and boundary values',()=>{
  for(const index of [-1,191,0.5,'3'])assert.equal(getResumeIndex({index},191),0);
  assert.equal(getResumeIndex(null,191),0);
  assert.equal(getResumeIndex({index:190},191),190);
});
test('storage: round trip, malformed JSON and unavailable storage',()=>{
  const values=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  assert.equal(writeStored('position',{index:10},storage),true);
  assert.deepEqual(readStored('position',storage),{index:10});
  values.set('invalid','{');
  assert.equal(readStored('invalid',storage),null);
  const broken={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};
  assert.equal(readStored('position',broken),null);
  assert.equal(writeStored('position',{},broken),false);
});

const {normalizeDone,normalizeLearning,recordAttempt,dueIndices}=require(path.join(src,'review-model.js'));
test('invalid progress is ignored without discarding valid marks',()=>{
  assert.deepEqual(normalizeDone(null,191),{});
  assert.deepEqual(normalizeDone({'0':true,'190':true,'191':true,'-1':true,'2':false},191),{'0':true,'190':true});
});
test('malformed learning records cannot break review rendering',()=>{
  assert.deepEqual(normalizeLearning(null,191),{sentences:{},weak:{}});
  const state=normalizeLearning({sentences:{'0':{attempts:1,history:null,streak:99},'1':null,'191':{attempts:1}},weak:{'w:test':{word:'test',sentences:null}}},191);
  assert.deepEqual(Object.keys(state.sentences),['0']);
  assert.deepEqual(state.sentences[0].history,[]);
  assert.equal(state.sentences[0].streak,5);
  assert.deepEqual(state.weak,{});
});
test('review intervals advance only when due and reset on error',()=>{
  const state=normalizeLearning(null,191);
  const now=1700000000000, day=86400000;
  const perfect=alignDictation('a good structure','a good structure');
  recordAttempt(state,0,'a good structure',perfect,'practice',now);
  assert.equal(state.sentences[0].due,now+day);
  recordAttempt(state,0,'a good structure',perfect,'practice',now+1000);
  assert.equal(state.sentences[0].due,now+day);
  assert.deepEqual(dueIndices(state,now+day),[0]);
  recordAttempt(state,0,'a good structure',perfect,'practice',now+day);
  assert.equal(state.sentences[0].due,now+4*day);
  recordAttempt(state,0,'a structure',alignDictation('a good structure','a structure'),'practice',now+day+1);
  assert.equal(state.sentences[0].streak,0);
  assert.deepEqual(dueIndices(state,now+day+1),[0]);
  assert.equal(state.weak['w:good'].count,1);
});
test('history stays bounded and survives normalization',()=>{
  const state=normalizeLearning(null,191);
  const g=alignDictation('word','word');
  for(let i=0;i<35;i++)recordAttempt(state,1,'word',g,'exam',1700000000000+i);
  assert.equal(state.sentences[1].history.length,30);
  assert.deepEqual(normalizeLearning(JSON.parse(JSON.stringify(state)),191),state);
});
test('offline status checks actual asset membership, not only count',async()=>{
  const c=worker();
  assert.equal(await vm.runInContext('offlineReady()',c),false);
  await vm.runInContext("caches.open=async()=>({keys:async()=>[...assets].map(url=>({url}))})",c);
  assert.equal(await vm.runInContext('offlineReady()',c),true);
  await vm.runInContext("caches.open=async()=>({keys:async()=>[...assets].slice(1).concat('https://example.test/unrelated').map(url=>({url}))})",c);
  assert.equal(await vm.runInContext('offlineReady()',c),false);
});

const {createMediaControls}=require(path.join(src,'media-session.js'));
test('media controls expose neutral metadata and gated actions',()=>{
  const handlers={},session={setActionHandler:(name,fn)=>handlers[name]=fn,setPositionState(value){this.position=value;}};
  const audioSession={},callback=()=>{};
  const controls=createMediaControls({session,audioSession,Metadata:class{constructor(value){Object.assign(this,value)}},artwork:[]},{play:callback,pause:callback,stop:callback,previous:callback,next:callback,seek:callback});
  controls.activate();
  assert.equal(audioSession.type,'playback');
  controls.sync({index:2,playing:true,canPrevious:true,canNext:false,canSeek:true,duration:4,position:6,rate:1});
  assert.equal(session.metadata.title,'WFD #003');
  assert.equal(session.playbackState,'playing');
  assert.equal(handlers.previoustrack,callback);
  assert.equal(handlers.nexttrack,null);
  assert.equal(session.position.position,4);
  controls.sync({index:2,playing:false,canPrevious:false,canNext:false,canSeek:false});
  assert.equal(handlers.previoustrack,null);
  assert.equal(handlers.seekto,null);
  assert.equal(session.playbackState,'paused');
  controls.release();
  assert.equal(session.metadata,null);
  assert.equal(session.playbackState,'none');
  assert.equal(handlers.play,null);
});
test('media integration is optional and unsupported actions cannot crash playback',()=>{
  const callbacks={play(){},pause(){},stop(){},previous(){},next(){},seek(){}};
  const controls=createMediaControls({},callbacks);
  assert.doesNotThrow(()=>{controls.activate();controls.sync({index:0});controls.release()});
  const unsupported=createMediaControls({session:{setActionHandler(){throw Error('unsupported')},setPositionState(){throw Error('unsupported')}},audioSession:{set type(value){throw Error('unsupported')}}},callbacks);
  assert.doesNotThrow(()=>{unsupported.activate();unsupported.sync({index:0,playing:true});unsupported.release()});
});

test('offline cache install downloads only app shell',async()=>{
  const c=worker();
  await vm.runInContext("globalThis.downloaded=[]; caches.open=async()=>({addAll:async reqs=>downloaded.push(...reqs.map(r=>r.url))})",c);
  await vm.runInContext('precache()',c);
  assert.equal(vm.runInContext('downloaded.length',c),26);
  assert.equal(vm.runInContext('downloaded.some(url=>AUDIO.includes(url))',c),false);
});
test('offline audio preparation reuses cached media and resumes partial download',async()=>{
  const c=worker();
  await vm.runInContext(`
    globalThis.present=new Set([...SHELL,AUDIO[0]]);
    globalThis.reused=[],globalThis.downloaded=[],globalThis.fail=true;
    caches.open=async()=>({
      keys:async()=>[...present].map(url=>({url})),
      put:async(url)=>{reused.push(url);present.add(url)},
      add:async(req)=>{if(fail&&req.url===AUDIO[2])throw Error('quota');downloaded.push(req.url);present.add(req.url)}
    });
    caches.match=async url=>url===AUDIO[1]?new Response('audio'):undefined;
    caches.keys=async()=>[CACHE];
  `,c);
  assert.equal(await vm.runInContext('prepareAudio()',c),false);
  assert.equal(await vm.runInContext('offlineReady()',c),false);
  await vm.runInContext('fail=false',c);
  assert.equal(await vm.runInContext('prepareAudio()',c),true);
  assert.equal(await vm.runInContext('offlineReady()',c),true);
  assert.equal(vm.runInContext('reused.length',c),1);
  assert.equal(vm.runInContext('downloaded.length',c),189);
});
test('cache storage failure falls back to network media',async()=>{
  const c=worker();
  await vm.runInContext("caches.open=async()=>{throw Error('storage unavailable')};fetch=async()=>new Response('online')",c);
  const response=await vm.runInContext('serveAsset(new Request(AUDIO[0]),AUDIO[0])',c);
  assert.equal(await response.text(),'online');
});
test('media position and playback state avoid redundant writes',()=>{
  let positions=0,states=0;
  const session={setActionHandler(){},setPositionState(){positions++},set playbackState(v){states++}};
  const cb=()=>{};
  const controls=createMediaControls({session},{play:cb,pause:cb,stop:cb,previous:cb,next:cb,seek:cb});
  controls.activate();
  const state={index:0,playing:true,canSeek:true,duration:4,position:1,rate:1};
  controls.sync(state);
  controls.sync({...state,position:1.1});
  assert.equal(positions,1);assert.equal(states,1);
  controls.sync({...state,position:1.5});
  assert.equal(positions,2);
  controls.sync({...state,playing:false,position:1.5});
  assert.equal(states,2);assert.equal(positions,3);
});

const {createFrameGovernor,offlineDownloadHint}=require(path.join(src,'adaptive-performance.js'));
test('healthy rendering keeps native frame cadence, even at 120 Hz',()=>{
  for(const delta of [8.33,16.67,33.33]){
    const governor=createFrameGovernor();
    for(let i=0;i<120;i++)assert.equal(governor.shouldPaint(i*delta),true);
    assert.equal(governor.limited,false);
  }
});
test('sustained rendering pressure reduces paint frequency and recovers',()=>{
  const governor=createFrameGovernor();
  let now=0;
  governor.shouldPaint(now);
  let skipped=0;
  for(let i=0;i<20;i++)if(!governor.shouldPaint(now+=40))skipped++;
  assert.equal(governor.limited,true);
  assert.ok(skipped>0);
  governor.reset();
  for(let i=0;i<65;i++)governor.shouldPaint(now+=16.67);
  assert.equal(governor.limited,false);
  assert.equal(governor.shouldPaint(now+16.67),true);
});
test('download hints respect data saver and missing Safari capabilities',()=>{
  assert.deepEqual(offlineDownloadHint(undefined,undefined),{initial:4,maximum:8});
  assert.deepEqual(offlineDownloadHint({effectiveType:'4g',downlink:10},8),{initial:8,maximum:8});
  assert.deepEqual(offlineDownloadHint({saveData:true,effectiveType:'4g',downlink:10},8),{initial:2,maximum:2});
  assert.deepEqual(offlineDownloadHint({effectiveType:'3g'},8),{initial:2,maximum:2});
  assert.deepEqual(offlineDownloadHint(undefined,2),{initial:2,maximum:2});
});
test('worker adjusts bounded download batches without overriding restricted mode',()=>{
  const c=worker();
  assert.equal(vm.runInContext('downloadPlan({initial:999,maximum:2}).size',c),2);
  assert.equal(vm.runInContext('nextBatchSize(4,8,100)',c),8);
  assert.equal(vm.runInContext('nextBatchSize(8,8,2000)',c),4);
  assert.equal(vm.runInContext('nextBatchSize(2,2,100)',c),2);
  assert.equal(vm.runInContext('nextBatchSize(4,8,1000)',c),4);
});

const {createWordAudio}=require(path.join(src,'word-audio.js'));
const {preparePlaybackSession}=require(path.join(src,'media-session.js'));
function wordAudioFixture(options={}){
  const timers=new Map(),sources=[],decodes=[],requests=[],contexts=[];
  let next=0,clock=0;
  const setTimer=(fn)=>{const key=++next;timers.set(key,fn);return key;};
  const clearTimer=key=>timers.delete(key);
  class Decoder{
    decodeAudioData(bytes,resolve){decodes.push(bytes);resolve({duration:5});}
  }
  class Context{
    state=options.state||'running';
    listeners=new Set();
    constructor(){contexts.push(this);}
    resume(){return options.resume?options.resume(this):Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    addEventListener(type,fn){this.listeners.add(fn);}
    removeEventListener(type,fn){this.listeners.delete(fn);}
    changeState(state){this.state=state;for(const fn of [...this.listeners])fn();}
    get currentTime(){return clock;}
    destination={};
    createBufferSource(){
      const source={connect(){},disconnect(){},start(...args){this.args=args;},stop(){this.stopped=true;}};
      sources.push(source);return source;
    }
  }
  const engine=createWordAudio({AudioContext:Context,OfflineAudioContext:Decoder,
    fetchAudio:async(url,options)=>{requests.push({url,signal:options.signal});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};},
    setTimer,clearTimer});
  async function prepare(){engine.prepare();const [key,fn]=timers.entries().next().value;timers.delete(key);await fn();}
  return {engine,prepare,sources,decodes,requests,timers,contexts,setClock:value=>{clock=value;}};
}
const wordOptions={from:1,to:1.5,rate:1,outputConfigured:true,onStart(){},onEnd(){},onFallback(){},onError(){}};
test('decoded words use original buffer offsets and replace active sources without repeated decoding',async()=>{
  const f=wordAudioFixture(),e=f.engine;
  e.select('one');await f.prepare();
  assert.equal(e.ready,true);
  let started=0,ended=0;
  const clip={...wordOptions,onStart:()=>started++,onEnd:()=>ended++};
  assert.equal(e.play(clip),true);
  assert.deepEqual(f.sources[0].args,[0,1,0.5]);assert.equal(started,1);
  f.setClock(0.2);assert.ok(Math.abs(e.position()-1.2)<1e-8);
  const stale=f.sources[0].onended;
  assert.equal(e.play({...clip,from:2,to:2.5}),true);
  assert.equal(f.sources[0].stopped,true);stale();assert.equal(ended,0);
  f.sources[1].onended();assert.equal(ended,1);assert.equal(started,2);
  assert.equal(e.position(),null);assert.equal(f.requests.length,1);assert.equal(f.decodes.length,1);
  assert.equal(f.contexts[0].listeners.size,0);
});
test('word audio releases previous sentence and preserves non-default speed fallback',async()=>{
  const f=wordAudioFixture(),e=f.engine;
  e.select('one');await f.prepare();
  assert.equal(e.play({...wordOptions,rate:0.8}),false);
  assert.equal(e.play(wordOptions),true);
  e.select('two');assert.equal(f.sources[0].stopped,true);
  assert.equal(e.ready,false);assert.equal(e.play(wordOptions),false);
  await f.prepare();assert.equal(e.ready,true);assert.equal(f.requests.length,2);
});
test('unsupported audio and cancelled preparation safely fall back',async()=>{
  const e=createWordAudio({fetchAudio:()=>assert.fail()});
  e.select('one');e.prepare();
  assert.equal(e.play(wordOptions),false);
  const f=wordAudioFixture();f.engine.select('one');f.engine.prepare();
  f.engine.select('two');assert.equal(f.timers.size,0);assert.equal(f.engine.ready,false);
});
test('word-only audio configures playback category without claiming system controls',()=>{
  const session={type:'auto'};
  assert.equal(preparePlaybackSession(session),true);assert.equal(session.type,'playback');
  assert.equal(preparePlaybackSession(undefined),false);
  assert.equal(preparePlaybackSession({set type(v){throw Error('unsupported')}}),false);
  assert.equal(preparePlaybackSession({get type(){return 'auto'},set type(v){}}),false);
});
test('prepared first word uses Web Audio only with confirmed output category; no bootstrap media playback',async()=>{
  const f=wordAudioFixture(),e=f.engine;e.select('one');await f.prepare();
  assert.equal(e.play({...wordOptions,outputConfigured:false}),false);
  assert.equal(f.contexts.length,0);
  assert.equal(e.play(wordOptions),true);
  e.resetOutput();assert.equal(f.sources[0].stopped,true);
  assert.equal(f.contexts[0].state,'closed');assert.equal(f.timers.size,0);
  assert.equal(e.ready,true);
  assert.equal(e.play(wordOptions),true);assert.equal(f.contexts.length,2);
});
test('interrupted context during playback cancels without replaying a partial word',async()=>{
  const f=wordAudioFixture(),e=f.engine;e.select('one');await f.prepare();
  let errors=0;
  assert.equal(e.play({...wordOptions,onEnd:()=>assert.fail(),onFallback:()=>assert.fail(),onError:()=>errors++}),true);
  const stale=f.sources[0].onended;
  f.contexts[0].changeState('interrupted');stale();
  assert.equal(errors,1);assert.equal(f.sources[0].stopped,true);assert.equal(f.contexts[0].state,'closed');
});
test('output watchdog terminates stalled playback without reporting success or replaying audio',async()=>{
  const f=wordAudioFixture(),e=f.engine;e.select('one');await f.prepare();
  let errors=0;assert.equal(e.play({...wordOptions,onEnd:()=>assert.fail(),onFallback:()=>assert.fail(),onError:()=>errors++}),true);
  const fn=[...f.timers.values()][0];fn();fn();
  assert.equal(errors,1);assert.equal(f.sources[0].stopped,true);assert.equal(e.position(),null);
});
test('resume rejection falls back, while cancelled resume cannot restart playback',async()=>{
  let rejectResume,resolveResume;
  const f=wordAudioFixture({state:'suspended',resume:ctx=>new Promise((resolve,reject)=>{rejectResume=reject;resolveResume=()=>{ctx.state='running';resolve();};})});
  const e=f.engine;e.select('one');await f.prepare();
  let fallback=0;const clip={...wordOptions,onEnd:()=>assert.fail(),onFallback:()=>fallback++};
  assert.equal(e.play(clip),true);rejectResume(Error('blocked'));await Promise.resolve();await Promise.resolve();
  assert.equal(fallback,1);assert.equal(f.sources.length,0);
  assert.equal(e.play(clip),true);e.resetOutput();
  resolveResume();await Promise.resolve();await Promise.resolve();
  assert.equal(fallback,1);assert.equal(f.sources.length,0);
});
test('suspended context waits for successful resume before announcing playback',async()=>{
  let resume;
  const f=wordAudioFixture({state:'suspended',resume:ctx=>new Promise(resolve=>{resume=()=>{ctx.state='running';resolve();};})});
  const e=f.engine;e.select('one');await f.prepare();
  let started=0;assert.equal(e.play({...wordOptions,onStart:()=>started++}),true);
  assert.equal(started,0);assert.equal(f.sources.length,0);
  resume();await Promise.resolve();await Promise.resolve();
  assert.equal(started,1);assert.equal(f.sources.length,1);
});
