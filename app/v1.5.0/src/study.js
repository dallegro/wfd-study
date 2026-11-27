import { translations, lang, tr, uiKo, languageIndex, setLanguage } from './locales.js';
import { data, audioUrl } from './sentences.js';
import { wordTimes } from './word-timings.js';
import { alignDictation } from './scoring.js';
import { readStored, writeStored } from './storage.js';
import { normalizeDone } from './review-model.js';
import { createMediaControls, preparePlaybackSession, needsPlaybackCategory, allowsWordBuffer } from './media-session.js';
import { createWordAudio } from './word-audio.js';
import { createTyping } from './typing.js';
import { getDayRange, getDayCount, getResumeIndex, isValidGoal } from './study-plan.js';

const nodes=[];
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
  const node=walker.currentNode;
  const key=node.nodeValue.trim();
  if(translations[key])nodes.push([node,key]);
}
function updateLanguage(){
  document.documentElement.lang=lang;
  document.title='wfd. — '+tr('WFD 191 반복 듣기');
  for(const [node,key] of nodes)node.nodeValue=tr(key);
  document.getElementById('typed').placeholder=tr('문장을 입력하세요');
}
const $=id=>document.getElementById(id);
const a=$('player');
const iconPaths={"globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18\"/>", "repeat": "<path d=\"m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3\"/>", "list": "<path d=\"M3 6h13M3 11h9M3 16h9m8-7v9a2 2 0 1 1-2-2h2m0-7 3-1\"/>", "play": "<path d=\"m8 5 12 7-12 7z\"/>", "pause": "<path d=\"M9 5v14M15 5v14\"/>", "prev": "<path d=\"m15 5-7 7 7 7\"/>", "next": "<path d=\"m9 5 7 7-7 7\"/>", "shuffle": "<path d=\"M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 3-2 4-4m4-4c1-1 2-2 4-2h3m-4-4 4 4-4 4\"/>", "check": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12 3 3 5-6\"/>", "eye": "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "eyeoff": "<path d=\"m3 3 18 18M10 5a12 12 0 0 1 12 7 15 15 0 0 1-3 4M6 6a15 15 0 0 0-4 6s4 7 10 7a12 12 0 0 0 4-1\"/>", "settings": "<path d=\"M4 7h16M4 17h16\"/><circle cx=\"9\" cy=\"7\" r=\"3\" fill=\"var(--panel)\"/><circle cx=\"15\" cy=\"17\" r=\"3\" fill=\"var(--panel)\"/>", "down": "<path d=\"m6 9 6 6 6-6\"/>", "instagram": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M17 7h.01\"/>"};
function iconButton(id,k,label){
  const b=$(id);
  b.replaceChildren();
  const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("class","ui-icon");
  svg.setAttribute("viewBox","0 0 24 24");
  svg.setAttribute("fill","none");
  svg.setAttribute("stroke","currentColor");
  svg.setAttribute("stroke-width","1.8");
  svg.setAttribute("stroke-linecap","round");
  svg.setAttribute("stroke-linejoin","round");
  svg.setAttribute("aria-hidden","true");
  svg.innerHTML=iconPaths[k];
  const span=document.createElement("span");
  span.className="button-label";
  span.textContent=label;
  b.append(svg,span);
  b.setAttribute("aria-label",label);
  b.title=label;
}
let studyMode='memorize',translationVisible=true,typingEnabled=false;
try{
  const savedMode=localStorage.getItem('wfd191_studyMode');
  if(['dictation','typing'].includes(savedMode))studyMode=savedMode;
  typingEnabled=savedMode==='typing'||localStorage.getItem('wfd191_typingEnabled')==='1';
  if(studyMode==='memorize'&&typingEnabled)studyMode='typing';
  translationVisible=localStorage.getItem('wfd191_showTranslation')!=='0'
}catch(e){}
let selectedMode='single',finiteRepeat='3',singleInfinite=false;
let idx=0,day=0,mode='',count=0,timer=null,run=0,shown=false,paused=false,pending=null;
let done = normalizeDone(readStored('wfd191_done'), data.length);
function save() {
  writeStored('wfd191_done', done);
}
const pad=n=>String(n).padStart(3,'0');
let goal=10;
try{
  const saved=Number(localStorage.getItem('wfd191_goal'));
  if(isValidGoal(saved, data.length))goal=saved
}catch(e){}
;
const POSITION='wfd191_position',PLAY_PREF='wfd191_playPrefs',TYPING_PLAY_PREF='wfd191_typingPlayPrefs';
const typing=createTyping({getIndex:()=>idx,getSentence:()=>data[idx].en,isActive:()=>studyMode==='typing',length:data.length});
const typingPlayback=()=>({...readStored(PLAY_PREF),repeat:'3',infinite:true,...readStored(TYPING_PLAY_PREF),scope:'single'});
let reviewActive=false,normalSnapshot=null;

function storePosition(){
  if(!reviewActive)writeStored(POSITION,{index:idx})
}
const savedPosition=readStored(POSITION);
const resumeIndex=getResumeIndex(savedPosition, data.length);
idx=resumeIndex;
day=Math.floor(idx/goal);
function playbackPrefs(){
  return {scope:selectedMode,repeat:finiteRepeat,infinite:singleInfinite,speed:$('speed').value,gap:$('gap').value}
}
function storePlayback(){
  if(!reviewActive)writeStored(studyMode==='typing'?TYPING_PLAY_PREF:PLAY_PREF,playbackPrefs())
}
function applyPlaybackPrefs(p){
  if(!p)return;
  selectedMode=p.scope==='day'?'day':'single';
  if(['1','3','5','10'].includes(p.repeat))finiteRepeat=p.repeat;
  singleInfinite=p.infinite===true;
  for(const id of ['speed','gap'])if([...$(id).options].some(o=>o.value===p[id]))$(id).value=p[id]
}
applyPlaybackPrefs(studyMode==='typing'?typingPlayback():readStored(PLAY_PREF));
const first = () => getDayRange(day, goal, data.length).first;
const last = () => getDayRange(day, goal, data.length).last;
const dayCount = () => getDayCount(goal, data.length);

function answerTranslation(e){
  if(lang==='en')return '';
  if(e[lang])return e[lang];
  const note={zh:'本句译文尚未提供。',hi:'इस वाक्य का अनुवाद अभी उपलब्ध नहीं है।',es:'Traducción de esta frase aún no disponible.',vi:'Bản dịch câu này chưa có.',ne:'यस वाक्यको अनुवाद अझै उपलब्ध छैन।',fil:'Wala pang salin para sa pangungusap na ito.'};
  return note[lang]||''
}
function refreshGoalLabels(){
  $('goalSummary').textContent=planSummary(goal);
  $('goalDuration').textContent=tr('약 {d}일 분량 · 총 {d}회차').replaceAll('{d}',dayCount());
  $('goal').setAttribute('aria-label',tr('하루 학습량'));
}
function dayOption(d){
  return tr('회차 {n}').replace('{n}',d+1);
}
function updateDayOptions(){
  for(const o of $('day').options){
    const label=dayOption(+o.value);
    if(o.textContent!==label)o.textContent=label;
  }
  $('day').value=String(day)
}
function buildDays(){
  const select=$('day');
  select.innerHTML='';
  for(let d=0;d<dayCount();d++){
    const o=document.createElement('option');
    o.value=d;
    o.textContent=dayOption(d);
    select.append(o)
  }
  select.value=String(day);
  $('goal').value=goal;
  refreshGoalLabels()
}
function changeGoal(){
  const raw=$('goal').value.trim(),n=Number(raw);
  if(!raw||!isValidGoal(n, data.length)){
    $('goal').value=goal;
    refreshGoalLabels();
    return
  }
  if(n===goal){
    refreshGoalLabels();
    return
  }
  halt();
  goal=n;
  try{
    localStorage.setItem('wfd191_goal',String(goal))
  }catch(e){}
  ;
  day=Math.floor(idx/goal);
  buildDays();
  paintGrid();
  $('prev').disabled=idx===first();
  refreshNavigation()
}
// Word timings are loaded separately.

let transcriptWords=[],transcriptState=[],wordClip=null,wordClipTimer=null,wordPosition=null;
const wordAudio=createWordAudio({AudioContext:window.AudioContext||window.webkitAudioContext,OfflineAudioContext:window.OfflineAudioContext||window.webkitOfflineAudioContext,fetchAudio:(url,options)=>fetch(url,options)});
function playerPosition(){return wordAudio.position()??wordPosition??(a.currentTime||0);}
function resetWordPosition(){wordPosition=null;}
function wordVisual(){document.dispatchEvent(new Event('wfd-word-visual'));}
const clipLocale={ko:['단어를 누르면 해당 음원 구간을 들을 수 있어요.','단어 듣기','단어 재생 완료','단어 재생 중','다시 눌러 재생해 주세요.'],en:['Tap a word to hear that part of the recording.','Listen to word','Word playback complete','Playing word','Tap again to play.'],ceb:['Pindota ang pulong aron madungog ang bahin sa audio.','Paminawa ang pulong','Nahuman ang pulong','Gipatukar ang pulong','Pindota pag-usab aron mapatukar.'],ja:['単語を押すと、その部分の音声を聞けます。','単語を聞く','単語の再生完了','単語を再生中','もう一度押して再生してください。'],zh:['点击单词即可听原音对应片段。','听单词','单词播放完成','正在播放单词','请再次点击播放。'],hi:['रिकॉर्डिंग का वह हिस्सा सुनने के लिए शब्द पर टैप करें।','शब्द सुनें','शब्द का ऑडियो पूरा हुआ','शब्द चल रहा है','चलाने के लिए फिर टैप करें।'],es:['Pulsa una palabra para escuchar ese fragmento del audio.','Escuchar palabra','Reproducción de palabra finalizada','Reproduciendo palabra','Pulsa de nuevo para reproducir.'],vi:['Chạm vào một từ để nghe đoạn âm thanh tương ứng.','Nghe từ','Đã phát xong từ','Đang phát từ','Chạm lại để phát.'],ne:['रेकर्डिङको त्यो भाग सुन्न शब्दमा थिच्नुहोस्।','शब्द सुन्नुहोस्','शब्दको अडियो सकियो','शब्द बज्दै छ','बजाउन फेरि थिच्नुहोस्।'],fil:['Pindutin ang salita upang marinig ang bahaging iyon ng audio.','Pakinggan ang salita','Tapos na ang pag-play ng salita','Pine-play ang salita','Pindutin muli para i-play.']};
function clipText(i){
  return (clipLocale[lang]||clipLocale.en)[i]
}
function clipHint(el){
  el.textContent=clipText(0);
  el.classList.add('word-audio-hint')
}
function wordButton(el,i,word){
  el.type='button';
  el.classList.add('word-audio');
  el.dataset.wordIndex=String(i);
  el.dataset.wordLabel=word;
  el.title=clipText(1)+': '+word;
  el.setAttribute('aria-label',el.title);
  el.onclick=()=>playWord(i);
  return el
}
function refreshWordLabels(){
  for(const el of document.querySelectorAll('[data-word-index]')){
    el.title=clipText(1)+': '+el.dataset.wordLabel;
    el.setAttribute('aria-label',el.title)
  }
}
function paintClip(){
  for(const el of document.querySelectorAll('[data-word-index]'))el.classList.toggle('clip-active',!!wordClip&&Number(el.dataset.wordIndex)===wordClip.index)
}
function clearWordClip(){
  if(wordClipTimer!==null)clearInterval(wordClipTimer);
  wordClipTimer=null;
  if(!wordClip)return;
  if(wordClip.engine==='buffer')wordPosition=wordAudio.position()??wordPosition;
  wordAudio.stop();
  wordClip=null;
  paintClip();
  wordVisual();
}
function endWordClip(failed=false){
  if(!wordClip)return;
  clearWordClip();
  if(!a.paused)a.pause();
  waiting=true;
  waitStatus='재생 완료 · 답안 입력 대기';
  $('status').textContent=clipText(failed?4:2);
  syncTransport()
}
function checkWordClip(){
  const token=wordClip;
  if(token?.engine!=='element')return;
  const now=performance.now();
  if(!a.seeking && a.currentTime>token.from && (!a.paused||a.ended))token.progressed=true;
  if(token.progressed&&!a.seeking&&(a.ended||a.currentTime>=token.end)){endWordClip();return;}
  if(a.error){endWordClip(true);return;}
  // Network/seek or output interruption must not leave a clip running indefinitely.
  if(now>token.deadline)endWordClip(true);
}
function playElementWord(token,from,rate){
  if(wordClip!==token)return;
  if(document.hidden||$('studyWorkspace').hidden){endWordClip(true);return;}
  preparePlaybackSession(navigator.audioSession);
  token.engine='element';
  token.phase='starting';
  token.from=from;
  token.progressed=false;
  token.deadline=performance.now()+8000+(token.end-from)*1000/Math.max(0.1,rate);
  wordPosition=null;
  try{
    a.playbackRate=rate;
    a.currentTime=from;
    const promise=a.play();
    if(promise)promise.then(()=>{if(wordClip===token){token.phase='playing';$('status').textContent=clipText(3);}}).catch(()=>{if(wordClip===token)endWordClip(true)});
    else {token.phase='playing';$('status').textContent=clipText(3);}
    wordClipTimer=setInterval(checkWordClip,20);
    wordVisual();
  }catch{endWordClip(true)}
}
function playWord(i){
  const timing=wordTimes[idx]?.[i];
  if(!timing||(!shown&&gradedDraft===null)||document.hidden||$('studyWorkspace').hidden)return;
  mediaControls.release();
  // Set iOS playback category within the tap, before creating/resuming AudioContext.
  const outputConfigured=preparePlaybackSession(navigator.audioSession);
  const allowBuffer=allowsWordBuffer(navigator,outputConfigured);
  const [start,end]=timing;
  cancelRun();
  waiting=true;
  waitStatus='재생 완료 · 답안 입력 대기';
  if(!a.paused)a.pause();
  const duration=Number.isFinite(a.duration)?a.duration:Infinity;
  const from=Math.max(0,start-.045),to=Math.min(duration,end+.06);
  if(!(to>from))return;
  const rate=+$('speed').value;
  const token={index:i,end:to,engine:'buffer',phase:'starting'};
  wordClip=token;
  wordPosition=from;
  paintClip();
  $('status').textContent=tr('준비');
  syncTransport();
  const played=wordAudio.play({from,to,rate,allowBuffer,
    onStart:()=>{if(wordClip===token){token.phase='playing';$('status').textContent=clipText(3);}},
    onEnd:()=>{if(wordClip===token){wordPosition=to;endWordClip();}},
    onFallback:()=>playElementWord(token,from,rate),
    onError:()=>{if(wordClip===token)endWordClip(true);}
  });
  if(!played)playElementWord(token,from,rate);
  else if(wordClip===token&&token.engine==='buffer')wordVisual();
  if(allowBuffer&&!document.hidden)wordAudio.prepare();
}
a.addEventListener('timeupdate',checkWordClip);
a.addEventListener('error',()=>{if(wordClip?.engine==='element')endWordClip(true);});
navigator.audioSession?.addEventListener?.('statechange',()=>{
  if(navigator.audioSession.state==='interrupted'&&wordClip){endWordClip(true);wordAudio.resetOutput();}
});
$('language').addEventListener('change',refreshWordLabels);

function renderTranscript(text){

 const root=$('english');
  const fragment=document.createDocumentFragment();
  transcriptWords=[];
  transcriptState=[];
  let charIndex=0;
 for(const piece of text.split(/(\s+)/)){
    if(!piece)continue;
    if(/^\s+$/.test(piece)){
      if(studyMode==='typing'){for(const c of Array.from(piece)){const part=document.createElement('span');part.dataset.typingChar=String(charIndex++);part.textContent=c;fragment.append(part);}}else fragment.append(document.createTextNode(piece));
      continue
    }
    const span=document.createElement('button');
    span.className='sync-word';
    if(studyMode==='typing'){for(const c of Array.from(piece)){const part=document.createElement('span');part.dataset.typingChar=String(charIndex++);part.textContent=c;span.append(part);}}else span.textContent=piece;
    wordButton(span,transcriptWords.length,piece);
    fragment.append(span);
    transcriptWords.push(span)
  }
 root.replaceChildren(fragment);
  refreshWordLabels();
}
function syncTranscript(){

 if(!shown||document.hidden)return;
  const timing=wordTimes[idx];
  if(!timing||timing.length!==transcriptWords.length)return;
 const t=playerPosition();
 for(let i=0;i<timing.length;i++){
    const [start,end]=timing[i];
    const state=t>=end?2:t>=start?1:0;
    if(transcriptState[i]===state)continue;
    transcriptState[i]=state;
    const w=transcriptWords[i];
    w.classList.toggle('spoken',state===2);
    w.classList.toggle('current',state===1)
  }
}
buildDays();
try{
  $('dayLoop').checked=localStorage.getItem('wfd191_dayLoop')==='1'
}catch(e){}
;
$('dayLoop').addEventListener('change',()=>{
  try{
    localStorage.setItem('wfd191_dayLoop',$('dayLoop').checked?'1':'0')
  }catch(e){}
});
function planSummary(n){return tr('하루 {n}문장').replace('{n}',n);}
function refreshPlanDraft(){
  const raw=$('goal').value.trim(),n=Number(raw),valid=!!raw&&isValidGoal(n,data.length);
  $('planApply').disabled=!valid;
  $('goal').setAttribute('aria-invalid',String(!valid));
  $('planPreview').textContent=valid?tr('약 {d}일').replace('{d}',getDayCount(n,data.length)):'—';
  $('planDetail').textContent=valid?tr('전체 {n}문장 · 총 {d}회차').replace('{n}',data.length).replace('{d}',getDayCount(n,data.length)):'';
  $('planError').hidden=valid;
  $('planError').textContent=tr('1~191 사이의 정수를 입력하세요.');
  for(const b of document.querySelectorAll('[data-goal]')){b.textContent=tr('{n}문장').replace('{n}',b.dataset.goal);b.setAttribute('aria-pressed',String(valid&&n===Number(b.dataset.goal)));}
  $('planClose').setAttribute('aria-label',tr('닫기'));
  document.querySelector('.plan-presets').setAttribute('aria-label',tr('하루 학습량'));
}
$('goal').addEventListener('input',refreshPlanDraft);
$('planChange').onclick=()=>{ $('goal').value=goal; refreshPlanDraft(); $('planDialog').showModal(); $('planClose').focus(); };
for(const b of document.querySelectorAll('[data-goal]'))b.onclick=()=>{$('goal').value=b.dataset.goal;refreshPlanDraft();};
$('planCancel').onclick=$('planClose').onclick=()=> $('planDialog').close();
$('planDialog').addEventListener('close',()=>{$('goal').value=goal;$('planChange').focus({preventScroll:true});});
$('planForm').addEventListener('submit',e=>{e.preventDefault();if(!isValidGoal(Number($('goal').value),data.length))return;changeGoal();$('planDialog').close();});
// Defer sentence buttons until the user opens the list; retain nodes within a day.
function renderSentenceGrid(){
  const g=$('grid'),begin=first(),end=last(),key=begin+':'+end;
  if(g.dataset.range!==key){
    const fragment=document.createDocumentFragment();
    for(let i=begin;i<=end;i++){
      const b=document.createElement('button');
      b.onclick=()=>{
        navigateTo(i);
        if(idx===i){
          showSentenceList(false);
          $('sentenceListToggle').focus({preventScroll:true});
        }
      };
      fragment.append(b);
    }
    g.replaceChildren(fragment);
    g.dataset.range=key;
  }
  for(let i=begin;i<=end;i++){
    const b=g.children[i-begin],label=String(i+1)+(done[i]?' ✓':'');
    if(b.textContent!==label)b.textContent=label;
    b.classList.toggle('active',i===idx);
    b.classList.toggle('done',!!done[i]);
    b.setAttribute('aria-label',tr('문장 {n}').replace('{n}',i+1)+(done[i]?' · '+tr('암기 완료'):''));
    const current=String(i===idx);
    if(b.getAttribute('aria-current')!==current)b.setAttribute('aria-current',current);
  }
}
function completionText(done,total){return tr('{total}문장 중 {done}문장 암기 완료').replace('{total}',total).replace('{done}',done);}
function updateSentenceNumber(){ $('number').dataset.index=String(idx+1); $('number').textContent='#'+pad(idx+1); $('number').setAttribute('aria-label',tr('문장 {n}').replace('{n}',idx+1)); }
function paintGrid(){
  updateSentenceNumber();
  if(!$('sentenceList').hidden)renderSentenceGrid();
  let c=0;
  for(let i=first();i<=last();i++)if(done[i])c++;
  $('progress').max=last()-first()+1;
  $('progress').value=c;
  $('progressText').textContent=completionText(c,last()-first()+1);
  iconButton('mark','check',done[idx]?tr('완료 취소'):tr('암기 완료 표시'));
  const total=data.reduce((sum,_,i)=>sum+(done[i]?1:0),0);
  $('overallProgress').max=data.length;
  $('overallProgress').value=total;
  $('overallText').textContent=completionText(total,data.length);
  $('mark').setAttribute('aria-pressed',String(!!done[idx]));
  $('day').setAttribute('aria-label',tr('학습 회차'));
  $('sentenceListLabel').textContent=tr('문장 목록');
  $('overallProgress').setAttribute('aria-label',tr('전체 문장'));
  $('progress').setAttribute('aria-label',tr('이번 회차')+' · '+tr('암기 완료'));
  $('overallProgress').setAttribute('aria-label',tr('전체 문장')+' · '+tr('암기 완료'));
  updateDayOptions();

  $('nextStudyDay').textContent=tr('다음 회차 학습')+' ›';
  $('nextStudyDay').hidden=reviewActive||c!==last()-first()+1||day>=dayCount()-1;
}
function reveal(v){
  if(studyMode!=='dictation')v=true;
  if(!v&&wordClip)endWordClip();
  shown=v;
  $('reveal').setAttribute('aria-expanded',String(v));
  $('answer').classList.toggle('hidden',!v);
  if(v){syncTranscript();if(!document.hidden&&(!needsPlaybackCategory(navigator)||navigator.audioSession))wordAudio.prepare();}
  iconButton('reveal',v?'eyeoff':'eye',v?tr('원문 · 해석 가리기'):tr('원문 · 해석 보기'))
}
function refreshStudyUI(){
  const memorising=studyMode==='memorize', typingMode=studyMode==='typing', reading=memorising||typingMode;
  const hasTranslation=lang!=='en';
  document.querySelector('.question-panel').dataset.studyMode=studyMode;
  $('studyMode').setAttribute('aria-label',tr('학습 모드'));
  $('studyMode').hidden=reviewActive;
  $('memorizeMode').setAttribute('aria-pressed',String(reading));
  $('dictationMode').setAttribute('aria-pressed',String(!reading));
  $('typingToggle').checked=typingMode;
  $('typingToggleRow').hidden=!reading;
  $('typingToggle').disabled=!reading;
  $('typingArea').hidden=!typingMode;
  $('typingCount').hidden=!typingMode;
  $('typingProgress').hidden=!typingMode;
  $('typingSettings').hidden=!typingMode;
  $('dictationArea').hidden=reading;
  $('typed').disabled=reading;
  $('check').disabled=reading;
  $('reveal').hidden=reading;
  $('reveal').disabled=reading;
  $('mark').hidden=reviewActive;
  $('memorizeHeading').hidden=false;
  $('translationToggleRow').hidden=!hasTranslation||!reading;
  $('translationToggle').disabled=!reading||!hasTranslation;
  $('translationToggle').checked=translationVisible;
  $('korean').lang=lang;
  $('korean').hidden=!hasTranslation||(reading&&!translationVisible);
  typing.refresh();
}
function toggleStudyTranslation(){
  if(studyMode==='dictation'||lang==='en')return;
  translationVisible=!translationVisible;
  try{
    localStorage.setItem('wfd191_showTranslation',translationVisible?'1':'0')
  }catch(e){}
  refreshStudyUI()
}
function selectStudyMode(next){
  if(studyMode===next)return;
  if(wordClip)endWordClip();
  const changingTyping=studyMode==='typing'||next==='typing';
  if(changingTyping){halt();}
  studyMode=next;
  if(changingTyping){
    applyPlaybackPrefs(next==='typing'?typingPlayback():readStored(PLAY_PREF)||{scope:'single',repeat:'3',infinite:false,speed:'1.0',gap:'1.5'});
    a.playbackRate=+$('speed').value;
    renderTranscript(data[idx].en);
  }
  if(!reviewActive)try{
    localStorage.setItem('wfd191_studyMode',next)
  }catch(e){}
  if(next==='dictation'&&pending===advanceDay)waitForAnswer();
  if(next!=='dictation'&&waiting)$('status').textContent=tr('반복 완료');
  refreshStudyUI();
  reveal(next!=='dictation'||(gradedDraft!==null&&gradedDraft===$('typed').value));
  refreshModeControls();
}
function chooseStudyMode(next){
  if(reviewActive||next===studyMode)return;
  if(studyMode==='dictation'&&$('typed').value.trim()!==''&&$('typed').value!==gradedDraft&&!window.confirm(tr('작성 중인 답안이 지워집니다. 이동할까요?')))return;
  // Keep a typing draft when hiding the optional input or changing learning mode.
  if(studyMode==='dictation'&&$('typed').value.trim()!==''&&$('typed').value!==gradedDraft){$('typed').value='';gradedDraft=null;$('result').replaceChildren();}
  selectStudyMode(next);
}
$('memorizeMode').onclick=()=>chooseStudyMode(typingEnabled?'typing':'memorize');
$('typingToggle').onchange=()=>{
  if(reviewActive||studyMode==='dictation')return;
  typingEnabled=$('typingToggle').checked;
  try{localStorage.setItem('wfd191_typingEnabled',typingEnabled?'1':'0');}catch(e){}
  chooseStudyMode(typingEnabled?'typing':'memorize');
};
$('dictationMode').onclick=()=>chooseStudyMode('dictation');
$('translationToggle').onchange=toggleStudyTranslation;
function load(i){
  clearWordClip();
  resetWordPosition();
  wordAudio.select(audioUrl(i));
  idx=i;
  storePosition();
  const e=data[i];
  a.src=audioUrl(i);
  a.playbackRate=+$('speed').value;
  updateSentenceNumber();
  $('meta').textContent=e.meta.map(tr).join(' · ');
  renderTranscript(e.en);
  typing.resetDraft();
  $('korean').textContent=answerTranslation(e);
  $('typed').value='';
  gradedDraft=null;
  $('result').textContent='';
  reveal(false);
  paintGrid();
  refreshNavigation();
  syncMediaControls();
  document.dispatchEvent(new Event('wfd-loaded'))
}
function syncTransport(){
  $('play').setAttribute('aria-pressed',String(selectedMode==='single'));
  $('dayPlay').setAttribute('aria-pressed',String(selectedMode==='day'));
  refreshNavigation();
  const active=!!wordClip||(!waiting&&!paused&&(!!mode||(!a.paused&&!a.ended)));
  iconButton('stop',active?'pause':'play',tr(active?'Ⅱ 일시정지':(waiting||gradedDraft!==null)?'다시 듣기':'▶ 재생').replace(/^[▶Ⅱ]\s*/,''));
  refreshUXStage();
  syncMediaControls();
}
function refreshModeControls(){

 const all=selectedMode==='day',rep=$('repeat');
 rep.querySelector('option[value="0"]').disabled=all;
 rep.value=!all&&singleInfinite?'0':finiteRepeat;
 for(const id of ['dayOrder','dayLoop']){
    const control=$(id);
    control.disabled=!all;
    (id==='dayOrder'?$('orderRow'):control.closest('label')).hidden=!all
  }
 $('dayOrderHelp').textContent=tr($('dayOrder').value==='shuffle'?'셔플 안내':'순차 안내');
  $('orderSequential').setAttribute('aria-pressed',String($('dayOrder').value==='sequential'));
  $('orderShuffle').setAttribute('aria-pressed',String($('dayOrder').value==='shuffle'));
  $('gap').disabled=rep.value==='1'&&(selectedMode==='single'||studyMode==='dictation');
  $('scopeLabel').hidden=reviewActive||studyMode==='typing';
  $('play').closest('.scope-options').hidden=reviewActive||studyMode==='typing';
  $('dayPlay').disabled=studyMode==='typing';
 $('dayLoopHelp').textContent=tr('회차 반복 안내');
 syncTransport();
  refreshPlaybackSummary();
}
function selectMode(m){
  selectedMode=m;
  storePlayback();
  refreshModeControls()
}
function chooseScope(m){
  if(reviewActive||studyMode==='typing'||m===selectedMode)return;
  halt();
  selectMode(m);
  $('status').textContent=''
}
function refreshUXStage(){

 const q=$('studyPanel'),typed=$('typed'),checked=studyMode==='dictation'&&gradedDraft!==null&&gradedDraft===typed.value;
 const stage=studyMode==='typing'?'typing':studyMode==='memorize'?'memorize':checked?'checked':typed.value.trim()?'writing':'ready';
  q.dataset.stage=stage;
 const wordCount=typed.value.trim()?typed.value.trim().split(/\s+/u).length:0;
 $('wordCount').textContent=tr(wordCount===1?'입력 단어 1개':'입력 단어 {n}개').replace('{n}',String(wordCount));
 $('check').hidden=studyMode!=='dictation'||checked;
 $('typed').readOnly=checked;
 $('reveal').hidden=studyMode!=='dictation'||checked;
 $('attemptSummary').hidden=checked||!reviewActive||!$('attemptSummary').textContent;
 $('originalTitle').textContent=checked?tr('정답'):tr('영어 원문');
  $('check').disabled=studyMode!=='dictation'||checked||!typed.value.trim();
 $('mark').hidden=reviewActive;
 $('studyHome').textContent=tr('학습');
  $('appNav').setAttribute('aria-label',tr('학습 메뉴'));
  $('scopeLabel').textContent=tr('재생 범위');
  $('reveal').setAttribute('aria-expanded',String(shown));
  $('reveal').setAttribute('aria-controls','answer');
 $('stop').classList.toggle('is-secondary',studyMode==='dictation'&&stage!=='ready');
 const reviewing=!$('reviewSession').hidden;
 $('redoAttempt').hidden=!checked;
  const reviewNext=$('reviewNext'),destination=reviewing&&!checked?q.querySelector('.utility'):q.querySelector('.nav-main');
  if(reviewNext.parentElement!==destination)destination.append(reviewNext);
  reviewNext.hidden=!reviewing;
  // Move the shared utility row before the primary grading action only during ungraded review.
  const utility=q.querySelector('.utility'),practice=q.querySelector('.practice-actions'),answer=q.querySelector('.answer');
  if(reviewing&&!checked){if(utility.parentElement!==practice.parentElement)practice.before(utility);}
  else if(utility.parentElement!==answer)answer.prepend(utility);
 for(const id of ['prev','shuffle','next'])$(id).hidden=reviewing;
 q.dataset.reviewing=String(reviewing);
  q.dataset.canNext=String(reviewing||!$('next').disabled);
}
function hasDraft(){
  return typing.hasDraft()||(studyMode==='dictation'&&$('typed').value.trim()!==''&&$('typed').value!==gradedDraft)
}
function allowLeave(){
  return !hasDraft()||window.confirm(tr('작성 중인 답안이 지워집니다. 이동할까요?'))
}
function queuedDictation(){
  return studyMode==='dictation'&&mode==='day'&&dayQueue.length>0
}
function refreshNavigation(){
  const queued=queuedDictation();
  $('prev').disabled=queued?dayPosition===0:idx===first();
  $('next').disabled=queued?(dayPosition===dayQueue.length-1&&!$('dayLoop').checked):idx===last();
  $('shuffle').disabled=first()===last();
  const hint=queued&&dayPosition===dayQueue.length-1?( $('dayLoop').checked?'다음 버튼으로 이번 회차를 다시 시작합니다.':'현재 회차의 마지막 문장입니다.'):'답안을 충분히 작성하고 다음 문장으로 직접 이동하세요.';
  $('dictationHint').textContent=queued?tr(hint):tr('문장을 입력하세요')
}
function navigateTo(i){
  if(reviewActive||i===idx)return;
  if(!allowLeave())return;
  halt();
  load(i);
  $('status').textContent=''
}
function stepNavigation(direction){
  if(!queuedDictation()){
    navigateTo(Math.max(first(),Math.min(last(),idx+direction)));
    return
  }
  if(direction<0&&dayPosition===0)return;
  if(direction>0&&dayPosition===dayQueue.length-1&&!$('dayLoop').checked)return;
  if(!allowLeave())return;
  cancelRun();
  a.pause();
  if(direction<0){
    dayPosition--;
    load(dayQueue[dayPosition]);
    count=1;
    play()
  }else advanceDay()
}

$('repeat').addEventListener('change',()=>{
  const value=$('repeat').value;
  if(value==='0'){
    if(selectedMode==='single')singleInfinite=true
  }else{
    finiteRepeat=value;
    if(selectedMode==='single')singleInfinite=false
  }
  storePlayback();
  refreshModeControls()
});
let dayQueue=[],dayPosition=0,dayRandom=false;
let waiting=false,waitStatus='재생 완료 · 답안 입력 대기',gradedDraft=null;
let gapDeadline=0, endedHandled=true;
const mediaControls = createMediaControls({
  session: navigator.mediaSession,
  audioSession: navigator.audioSession,
  Metadata: globalThis.MediaMetadata,
  artwork: [{ src: new URL('./icon-192.png', document.baseURI).href, sizes: '192x192', type: 'image/png' },
    { src: new URL('./icon-512.png', document.baseURI).href, sizes: '512x512', type: 'image/png' }],
}, {
  play: resumePractice,
  pause: pausePractice,
  stop: halt,
  previous: () => mediaStep(-1),
  next: () => mediaStep(1),
  seek: ({ seekTime }) => {
    if (!canMediaNavigate() || !Number.isFinite(seekTime) || !Number.isFinite(a.duration)) return;
    a.currentTime = Math.min(a.duration, Math.max(0, seekTime));
  },
});
function canMediaNavigate() {
  return !$('studyWorkspace').hidden && studyMode === 'memorize' && !reviewActive && !wordClip && !hasDraft();
}
function canMediaStep(direction) {
  if (!canMediaNavigate()) return false;
  if (mode === 'day' && dayQueue.length) {
    return direction < 0 ? dayPosition > 0 : dayPosition + 1 < dayQueue.length || $('dayLoop').checked;
  }
  return direction < 0 ? idx > first() : idx < last();
}
function syncMediaControls() {
  if ($('studyWorkspace').hidden) {
    mediaControls.release();
    return;
  }
  mediaControls.sync({
    index: idx,
    playing: !paused && !waiting && (!!mode || !a.paused && !a.ended),
    canPrevious: canMediaStep(-1),
    canNext: canMediaStep(1),
    canSeek: canMediaNavigate() && !pending,
    duration: a.duration,
    position: a.currentTime,
    rate: a.playbackRate,
  });
}
function mediaStep(direction) {
  if (!canMediaStep(direction)) return;
  if (mode === 'day' && dayQueue.length) {
    cancelRun();
    a.pause();
    if (direction < 0) {
      dayPosition--;
      load(dayQueue[dayPosition]);
      count=1;
      play();
    } else advanceDay();
  } else {
    halt();
    load(idx + direction);
    start('single', true);
  }
}

function makeDayQueue(random,previous=-1){
  const queue=Array.from({length:last()-first()+1},(_,i)=>first()+i);
  if(random){
    for(let i=queue.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [queue[i],queue[j]]=[queue[j],queue[i]]
    }
    if(queue.length>1&&queue[0]===previous){
      const j=1+Math.floor(Math.random()*(queue.length-1));
      [queue[0],queue[j]]=[queue[j],queue[0]]
    }
  }
  return queue
}
function dayPrefix(){
  return tr(dayRandom?'랜덤 재생 · ':'하루 전체 · ')
}
function cancelRun(){
  clearWordClip();
  run++;
  clearTimeout(timer);
  timer=null;
  pending=null;
  gapDeadline=0;
  endedHandled=true;
  paused=false;
  waiting=false
}
function waitForAnswer(status='재생 완료 · 답안 입력 대기'){
  cancelRun();
  waiting=true;
  waitStatus=status;
  a.pause();
  $('status').textContent=tr(status);
  syncTransport()
}
function finishPlayback(){
  waiting=false;
  mode='';
  mediaControls.release();
  $('status').textContent=tr('반복 완료');
  syncTransport()
}
function replayCurrent(){
  if(wordClip)endWordClip();
  if(!mode){
    start(selectedMode,true);
    return
  }
  cancelRun();
  count=1;
  play()
}
$('replayCurrent').onclick=replayCurrent;

function advanceDay(){
  if(dayPosition+1<dayQueue.length){
    dayPosition++
  }else if($('dayLoop').checked){
    dayQueue=makeDayQueue(dayRandom,idx);
    dayPosition=0
  }else{
    finishPlayback();
    return
  }
  load(dayQueue[dayPosition]);
  count=1;
  play()
}
function halt(){
  mediaControls.release();
  dayQueue=[];
  dayPosition=0;
  cancelRun();
  mode='';
  a.pause();
  $('status').textContent='';
  syncTransport()
}
function play(reset=true){
  waiting=false;
  endedHandled=false;
  mediaControls.activate();
  const token=run;
  a.playbackRate=+$('speed').value;
  const position=wordPosition;
  resetWordPosition();
  if(reset||a.ended)a.currentTime=0;
  else if(position!==null)a.currentTime=position;
  syncTranscript();
  a.play().catch(()=>{
    if(token!==run||paused)return;
    endedHandled=true;
    paused=true;
    $('status').textContent=tr('재생 버튼을 다시 눌러 주세요');
    syncTransport()
  });
  $('status').textContent=paused?tr('일시정지'):mode?(mode==='day'?dayPrefix():'')+tr('반복 ')+count+tr('회'):tr('▶ 재생');
  syncTransport()
}
function start(m,resume=false){
  if(reviewActive||studyMode==='typing')m='single';
  const random=$('dayOrder').value==='shuffle';
  let queue=m==='day'?makeDayQueue(random):[];
  if(resume&&queue.length){
    queue=random?[idx,...queue.filter(i=>i!==idx)]:queue.slice(queue.indexOf(idx));
  }
  if(queue.length&&queue[0]!==idx&&!allowLeave())return;
  halt();
  selectMode(m);
  mode=m;
  count=1;
  if(m==='day'){
    dayRandom=random;
    dayQueue=queue;
    dayPosition=0;
    if(dayQueue[0]!==idx)load(dayQueue[0])
  }
  play()
}

// Keep the deadline independently of the browser's background timer cadence.
function runPending() {
  if (!pending || paused) return;
  clearTimeout(timer);
  timer=null;
  const fn=pending;
  pending=null;
  gapDeadline=0;
  fn();
}
function schedule(action){
  pending=action;
  gapDeadline=Date.now()+Number($('gap').value)*1000;
  const token=run;
  timer=setTimeout(()=>{
    if(token===run)runPending();
  },Math.max(0,gapDeadline-Date.now()));
  syncTransport();
}
function pausePractice(){
  if(wordClip){endWordClip();return;}
  if(paused||(!mode&&a.paused))return;
  paused=true;
  run++;
  clearTimeout(timer);
  timer=null;
  a.pause();
  $('status').textContent=tr('일시정지');
  syncTransport();
}
function resumePractice(){
  if($('studyWorkspace').hidden||wordClip)return;
  if(waiting||(!mode&&studyMode==='dictation'&&gradedDraft!==null)){
    replayCurrent();
    return;
  }
  if(paused){
    paused=false;
    if(pending)runPending();else play(false);
    syncTransport();
    return;
  }
  if(mode){
    if(pending)runPending();
    else if(a.paused)play(false);
    return;
  }
  if(a.paused)start(selectedMode,true);
}
function toggleTransport(){
  if(wordClip){endWordClip();return;}
  if(!waiting&&!paused&&(mode||(!a.paused&&!a.ended)))pausePractice();
  else resumePractice();
}
a.addEventListener('play',()=>{
  if(paused){
    paused=false;
    if(pending){
      clearTimeout(timer);
      timer=null;
      pending=null;
      gapDeadline=0;
    }
  }
  syncTransport()
});
a.addEventListener('pause',()=>{
  if(a.paused&&!a.ended&&mode&&!paused&&!pending&&!waiting){
    paused=true;
    run++;
    clearTimeout(timer);
    timer=null;
    $('status').textContent=tr('일시정지')
  }
  syncTransport()
});
function handleEnded(){
  if(wordClip?.engine==='buffer')return;
  if(wordClip){
    if(a.ended)checkWordClip();
    return
  }
  if(!mode){
    paused=false;
    syncTransport();
    return
  }
  if(paused||waiting||endedHandled)return;
  endedHandled=true;
  let rep=mode==='day'?Number(finiteRepeat):Number($('repeat').value);
  if(rep===0||count<rep){
    count++;
    schedule(()=>play())
  }else if(studyMode==='dictation'){
    waitForAnswer()
  }else if(mode==='day'&&(dayPosition+1<dayQueue.length||$('dayLoop').checked)){
    schedule(advanceDay)
  }else{
    finishPlayback()
  }
}
a.addEventListener('ended',handleEnded);
for(const event of ['loadedmetadata','timeupdate','ratechange','seeked'])a.addEventListener(event,syncMediaControls);
function recoverPlayback(){
  if(document.hidden)return;
  if(wordClip){checkWordClip();return;}
  if(!mode||paused||waiting)return;
  if(a.ended&&!endedHandled&&!pending)handleEnded();
  if(pending&&Date.now()>=gapDeadline)runPending();
  syncMediaControls();
}
document.addEventListener('visibilitychange',()=>{
  // Word clips rely on a short timer; do not accidentally reveal the full answer in background.
  if(document.hidden){
    if(wordClip)endWordClip();
    wordAudio.resetOutput();
  }else {if(shown&&(!needsPlaybackCategory(navigator)||navigator.audioSession))wordAudio.prepare();recoverPlayback();}
});
window.addEventListener('pagehide',()=>{if(wordClip)endWordClip();wordAudio.resetOutput();});
window.addEventListener('pageshow',recoverPlayback);
try{
  $('dayOrder').value=localStorage.getItem('wfd191_dayOrder')==='shuffle'?'shuffle':'sequential'
}catch(e){}
;
$('dayOrder').addEventListener('change',()=>{
  try{
    localStorage.setItem('wfd191_dayOrder',$('dayOrder').value)
  }catch(e){}
  ;
  if(mode==='day'){
    halt();
    $('status').textContent=''
  }
  refreshModeControls()
});
function goDay(target){
  if(reviewActive||target===day||target<0||target>=dayCount())return;
  if(!allowLeave()){
    $('day').value=String(day);
    return
  }
  halt();
  day=target;
  load(first());
  $('status').textContent=''
}
function showSentenceList(open){
  if(open){renderSentenceGrid();$('playbackFold').open=false;}
  $('sentenceList').hidden=!open;
  $('sentenceListToggle').setAttribute('aria-expanded',String(open))
}
$('sentenceListToggle').onclick=()=>showSentenceList($('sentenceList').hidden);
$('playbackFold').addEventListener('toggle',()=>{if($('playbackFold').open)showSentenceList(false);});
$('day').onchange=()=>{
  const before=day;
  goDay(+$('day').value);
  if(day!==before)showSentenceList(false)
};
$('nextStudyDay').onclick=()=>{
  goDay(day+1);
  $('day').focus()
};
$('speed').onchange=()=>{
  if(wordClip)endWordClip();
  a.playbackRate=+$('speed').value;
  storePlayback()
};
$('gap').addEventListener('change',storePlayback);
$('play').onclick=()=>chooseScope('single');
$('dayPlay').onclick=()=>chooseScope('day');
for(const [id,v] of [['orderSequential','sequential'],['orderShuffle','shuffle']])$(id).onclick=()=>{
  if($('dayOrder').value===v)return;
  $('dayOrder').value=v;
  $('dayOrder').dispatchEvent(new Event('change'))
};
$('stop').onclick=toggleTransport;
$('prev').onclick=()=>stepNavigation(-1);
$('next').onclick=()=>stepNavigation(1);
$('shuffle').onclick=()=>{
  const choices=Array.from({length:last()-first()+1},(_,i)=>first()+i).filter(i=>i!==idx);
  if(choices.length)navigateTo(choices[Math.floor(Math.random()*choices.length)])
};
$('reveal').onclick=()=>reveal(!shown);
$('mark').onclick=()=>{
  done[idx]=!done[idx];
  save();
  paintGrid();
  document.dispatchEvent(new CustomEvent('wfd-mark',{detail:{index:idx,marked:!!done[idx]}}));
};
const gradeLabels={"ko":["맞힌 단어","모든 단어 정답!","정답","누락","잘못 입력 / 추가","단어 순서와 철자를 기준으로 채점합니다. Pearson 공식 점수가 아닙니다.","답안 비교","오답","추가 입력"],"en":["Correct words","All words match!","Correct","Missing","Incorrect / extra","Practice score based on word order and spelling, not an official Pearson score.","Answer comparison","Incorrect","Extra"],"ceb":["Saktong mga pulong","Sakto ang tanang pulong!","Sakto","Kulang","Sayop / sobra","Puntos sa praktis base sa han-ay ug spelling sa mga pulong, dili opisyal nga puntos sa Pearson.","Pagtandi sa tubag","Sayop","Sobra"],"ja":["正解した単語","すべての単語が一致しました！","正解","抜けた単語","誤入力・余分な単語","語順とスペルに基づく練習用スコアです。Pearsonの公式スコアではありません。","解答の比較","誤入力","余分な単語"],"zh":["正确单词","所有单词均正确！","正确","漏写","错误 / 多写","根据单词顺序和拼写计算的练习分数，并非 Pearson 官方分数。","答案对比","错误","多写"],"hi":["सही शब्द","सभी शब्द सही हैं!","सही","छूटे हुए","गलत / अतिरिक्त","शब्द क्रम और वर्तनी पर आधारित अभ्यास स्कोर, Pearson का आधिकारिक स्कोर नहीं।","उत्तर की तुलना","गलत","अतिरिक्त"],"es":["Palabras correctas","¡Todas las palabras coinciden!","Correcta","Omitida","Incorrecta / extra","Puntuación de práctica según el orden y la ortografía; no es una puntuación oficial de Pearson.","Comparación de respuestas","Incorrecta","Extra"],"vi":["Từ đúng","Tất cả các từ đều khớp!","Đúng","Thiếu","Sai / thừa","Điểm luyện tập dựa trên thứ tự từ và chính tả, không phải điểm chính thức của Pearson.","So sánh câu trả lời","Sai","Thừa"],"ne":["सही शब्दहरू","सबै शब्द मिल्यो!","सही","छुटेको","गलत / थप","शब्दक्रम र हिज्जेमा आधारित अभ्यास अङ्क हो, Pearson को आधिकारिक अङ्क होइन।","उत्तरको तुलना","गलत","थप"],"fil":["Mga tamang salita","Tugma ang lahat ng salita!","Tama","Kulang","Mali / sobra","Iskor sa pagsasanay batay sa ayos at baybay ng mga salita, hindi opisyal na iskor ng Pearson.","Paghahambing ng sagot","Mali","Sobra"]};

function renderGrade(){
  const out=$('result');
  out.replaceChildren();
  if(gradedDraft===null)return null;
 const g=alignDictation(data[idx].en,gradedDraft),t=gradeLabels[lang]||gradeLabels.en;
 renderGradeContent(out,g,true);
 paintClip();
  return g;
}
export function renderGradeContent(out,g,playable=false,{compact=false}={}){
 const t=gradeLabels[lang]||gradeLabels.en;
 const make=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;};
 const groups=[['missing',t[3],g.missing],['wrong',t[7],g.wrong],['extra',t[8],g.extra]];
 if(!compact){
   const top=make('div','grade-top'),stat=make('div');stat.append(make('div','grade-label',t[0]),make('div','grade-score',g.correct+' / '+g.total));top.append(stat);
   if(g.perfect)top.append(make('span','grade-perfect',t[1]));out.append(top);
   if(playable){const answer=make('div','flow-answer');answer.append(make('small','',tr('내 답안')),make('p','',gradedDraft||''));out.append(answer);}
 }
 if(g.perfect){if(compact)out.append(make('p','grade-perfect',t[1]));}
 else {
   const errors=make('div','flow-errors');
   for(const [kind,label,n] of groups){
     if(!n)continue;
     const row=make('div','flow-error-row'),head=make('div','flow-error-label',lang==='ko'?`${label} ${n}단어`:`${label} · ${n}`),line=make('div','flow-error-words');
     row.append(head,line);
     for(const op of g.ops.filter(x=>x.kind===kind)){
       const entry=make('span','flow-error-token');
       if(op.got){const e=make('s','grade-extra',op.got);e.setAttribute('aria-label',label+': '+op.got);entry.append(e);}
       if(op.ref){if(op.got)entry.append(make('span','flow-arrow',' → '));const cls=kind==='wrong'?'grade-wrong':'grade-missing';const e=playable?wordButton(make('button',cls,op.ref),op.refIndex,op.ref):make('span',cls,op.ref);e.setAttribute('aria-label',label+': '+op.ref);entry.append(e);}
       line.append(entry);
     }
     errors.append(row);
   }
   out.append(errors);
 }
 if(!compact)out.append(make('div','grade-note',t[5]));
}
$('typed').addEventListener('input',()=>{
  if(gradedDraft!==null&&gradedDraft!==$('typed').value){
    gradedDraft=null;
    $('result').replaceChildren();
    reveal(false)
  }
});
$('check').onclick=()=>{
  if(studyMode!=='dictation'||!$('typed').value.trim()||gradedDraft===$('typed').value)return;
  const newAttempt=gradedDraft!==$('typed').value;
  gradedDraft=$('typed').value;
  if(mode)waitForAnswer('채점 완료');else $('status').textContent='';
  const g=renderGrade();
  if(newAttempt)document.dispatchEvent(new CustomEvent('wfd-attempt',{detail:{index:idx,answer:gradedDraft,grade:g}}));
  reveal(true);
  if(g.perfect){
    done[idx]=true;
    save();
    paintGrid()
  }
};
load(resumeIndex);
updateLanguage();
paintGrid();
refreshStudyUI();
refreshGoalLabels();
$('status').textContent='';
refreshModeControls();
$('language').value=lang;
$('language').onchange=()=>{
  const old=lang;
  const oldStatus=$('status').textContent;setLanguage($('language').value);
  updateLanguage();
  refreshStudyUI();
  refreshGoalLabels();
  refreshPlanDraft();
  $('meta').textContent=data[idx].meta.map(tr).join(' · ');
  $('korean').textContent=answerTranslation(data[idx]);
  paintGrid();
  reveal(shown);
  const translateOld=(value)=>{
    if(!value.trim())return "";
    for(const [key,values] of Object.entries(translations)){
      if(value===(old==='ko'?(uiKo[key]??key):values[languageIndex[old]]))return tr(key)
    }
    return value
  };
  $('status').textContent=waiting?tr(studyMode==='dictation'?waitStatus:'반복 완료'):paused?tr('일시정지'):mode?(mode==='day'?dayPrefix():'')+tr('반복 ')+count+tr('회'):translateOld(oldStatus);
  refreshModeControls();
  if(gradedDraft!==null)renderGrade();
  refreshWordLabels();
  if(wordClip)$('status').textContent=wordClip.phase==='playing'?clipText(3):tr('준비')
};
function labelControls(){
  for(const [id,key] of [['prev','이전'],['next','다음'],['shuffle','랜덤'],['play','문장 반복 ▶'],['dayPlay','하루 전체 ▶']]){
    const b=$(id);
    b.setAttribute('aria-label',tr(key));
    b.title=tr(key);
    const t=b.querySelector('.button-label');
    if(t)t.textContent=tr(key).replace(/\s*▶$/,'')
  }
  $('language').setAttribute('aria-label',({ko:'언어',en:'Language',ceb:'Pinulongan',ja:'言語',zh:'语言',hi:'भाषा',es:'Idioma',vi:'Ngôn ngữ',ne:'भाषा',fil:'Wika'})[lang]);
}
labelControls();
$('language').addEventListener('change',labelControls);



function refreshPlaybackSummary(){

 const rep=$('repeat'),gap=$('gap');
 const repeatText=rep.value==='0'?tr('무한'):tr(rep.value+'회');
 const gapText=tr(gap.value+'초');
 $('playbackSummary').textContent=[...(reviewActive?[]:[tr(selectedMode==='day'?'하루 전체 ▶':'문장 반복 ▶')]),repeatText,...(gap.disabled?[]:[gapText]),...(selectedMode==='day'&&$('dayOrder').value==='shuffle'?[tr('랜덤 재생')]:[]),...(selectedMode==='day'&&$('dayLoop').checked?[tr('하루 전체 무한 반복')]:[])].join(' · ');
}


// Mutable study state is owned here; review uses explicit transitions.
function setReviewActive(value) { reviewActive = value; }
function setNormalSnapshot(value) { normalSnapshot = value; }
function setStudyDay(value) { day = value; }
function clearGradedDraft() { gradedDraft = null; }
function clearDone() { done = {}; }
function clearTyping() { return typing.clear(); }

export {
  $, a, idx, studyMode, goal, day, done, wordClip, reviewActive, normalSnapshot,
  gradedDraft, gradeLabels, clipText, syncTranscript, endWordClip, playerPosition, resetWordPosition, refreshPlaybackSummary,
  refreshNavigation, refreshUXStage, cancelRun, reveal, replayCurrent, halt,
  applyPlaybackPrefs, buildDays, selectStudyMode, load, refreshModeControls,
  allowLeave, selectMode, playbackPrefs, storePosition, storePlayback,
  showSentenceList, start, pad, answerTranslation,
  setReviewActive, setNormalSnapshot, setStudyDay, clearGradedDraft, clearDone, clearTyping
};
