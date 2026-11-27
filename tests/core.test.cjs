const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const src = path.join(root,'app/v1.3.0/src');
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
test('every service worker precache path exists',()=>{const c=worker();const paths=vm.runInContext('[...assets]',c);assert.equal(paths.length,214);for(const u of paths)assert.ok(fs.existsSync(path.join(root,new URL(u).pathname.replace('/wfd-study/',''))),u);});

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
