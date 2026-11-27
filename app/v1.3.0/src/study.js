import { translations, lang, tr, uiKo, languageIndex, setLanguage } from './locales.js';
import { data, audioUrl } from './sentences.js';
import { wordTimes } from './word-timings.js';
import { alignDictation } from './scoring.js';
import { readStored, writeStored } from './storage.js';
import { normalizeDone } from './review-model.js';
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
  document.getElementById('typed').placeholder=tr('음성을 듣고 영어 문장을 입력해 보세요.');
  for(const o of document.getElementById('day').options)o.textContent=(lang==='ko'?'DAY ':lang==='ceb'?'ADLAW ':'DAY ')+String(Number(o.value)+1).padStart(2,'0');
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
let studyMode='memorize',translationVisible=true;
try{
  if(localStorage.getItem('wfd191_studyMode')==='dictation')studyMode='dictation';
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
const POSITION='wfd191_position',PLAY_PREF='wfd191_playPrefs';
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
  if(!reviewActive)writeStored(PLAY_PREF,playbackPrefs())
}
function applyPlaybackPrefs(p){
  if(!p)return;
  selectedMode=p.scope==='day'?'day':'single';
  if(['1','3','5','10'].includes(p.repeat))finiteRepeat=p.repeat;
  singleInfinite=p.infinite===true;
  for(const id of ['speed','gap'])if([...$(id).options].some(o=>o.value===p[id]))$(id).value=p[id]
}
applyPlaybackPrefs(readStored(PLAY_PREF));
const first = () => getDayRange(day, goal, data.length).first;
const last = () => getDayRange(day, goal, data.length).last;
const dayCount = () => getDayCount(goal, data.length);
function goalText(n,d,sub){
  const t={zh:[`每天 ${n} 句 · 内置音频`,`每天 ${n} 句 · ${d} 天学习计划`],hi:[`प्रतिदिन ${n} वाक्य · अंतर्निहित ऑडियो`,`प्रतिदिन ${n} वाक्य · ${d} दिन की योजना`],es:[`${n} frases/día · Audio integrado`,`${n} frases al día · Plan de ${d} días`],vi:[`${n} câu/ngày · Âm thanh tích hợp`,`${n} câu mỗi ngày · Kế hoạch ${d} ngày`],ne:[`दैनिक ${n} वाक्य · अन्तर्निहित अडियो`,`दैनिक ${n} वाक्य · ${d} दिनको योजना`],fil:[`${n} pangungusap/araw · May audio`,`${n} pangungusap bawat araw · ${d} araw na plano`]};
  return t[lang]?.[sub?0:1]||''
}
function answerTranslation(e){
  if(lang==='en')return '';
  if(e[lang])return e[lang];
  const note={zh:'本句译文尚未提供。',hi:'इस वाक्य का अनुवाद अभी उपलब्ध नहीं है।',es:'Traducción de esta frase aún no disponible.',vi:'Bản dịch câu này chưa có.',ne:'यस वाक्यको अनुवाद अझै उपलब्ध छैन।',fil:'Wala pang salin para sa pangungusap na ito.'};
  return note[lang]||''
}
function refreshGoalLabels(){
  const days=dayCount();
  const subtitles={ko:`하루 ${goal}문장 · 원본 내장 음원`,en:`${goal} sentences a day · Embedded audio`,ceb:`${goal} ka sentence matag adlaw · Audio nga naka-embed`,ja:`1日${goal}文 · オリジナル音声内蔵`};
  const summaries={ko:`하루 ${goal}문장씩 · ${days}일 학습 계획`,en:`${goal} ${goal===1?"sentence":"sentences"} a day · ${days}-day plan`,ceb:`${goal} ka sentence kada adlaw · ${days} ka adlaw nga plano`,ja:`1日${goal}文ずつ · ${days}日間の学習計画`};
  $('goalSubtitle').textContent=subtitles[lang]||goalText(goal,days,true);
  $('goalSummary').textContent=summaries[lang]||goalText(goal,days,false);
  $('goal').setAttribute('aria-label',tr('일일 학습량'))
}
function dayOption(d){
  const start=d*goal,end=Math.min(start+goal,data.length),c=data.slice(start,end).reduce((n,_,j)=>n+(done[start+j]?1:0),0);
  return (lang==='ceb'?'ADLAW ':'DAY ')+String(d+1).padStart(2,'0')+' · '+c+'/'+(end-start)+(c===end-start?' ✓':'')
}
function updateDayOptions(){
  for(const o of $('day').options)o.textContent=dayOption(+o.value);
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

let transcriptWords=[],transcriptState=[],wordClip=null,wordClipTimer=null;
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
  wordClip=null;
  paintClip()
}
function endWordClip(failed=false){
  if(!wordClip)return;
  clearWordClip();
  a.pause();
  waiting=true;
  waitStatus='재생 완료 · 답안 입력 대기';
  $('status').textContent=clipText(failed?4:2);
  syncTransport()
}
function checkWordClip(){
  if(wordClip&&(a.ended||a.currentTime>=wordClip.end))endWordClip()
}
function playWord(i){
  const timing=wordTimes[idx]?.[i];
  if(!timing||(!shown&&gradedDraft===null))return;
  const [start,end]=timing;
  cancelRun();
  waiting=true;
  waitStatus='재생 완료 · 답안 입력 대기';
  a.pause();
  const duration=Number.isFinite(a.duration)?a.duration:Infinity;
  const from=Math.max(0,start-.045),to=Math.min(duration,end+.06);
  if(!(to>from))return;
  const token={index:i,end:to};
  wordClip=token;
  paintClip();
  a.playbackRate=+$('speed').value;
  try{
    a.currentTime=from;
    const promise=a.play();
    if(promise)promise.catch(()=>{
      if(wordClip===token)endWordClip(true)
    });
    wordClipTimer=setInterval(checkWordClip,20);
    $('status').textContent=clipText(3);
    syncTransport()
  }catch(e){
    endWordClip(true)
  }
}
a.addEventListener('timeupdate',checkWordClip);
$('language').addEventListener('change',refreshWordLabels);

function renderTranscript(text){

 const root=$('english');
  const fragment=document.createDocumentFragment();
  transcriptWords=[];
  transcriptState=[];
 for(const piece of text.split(/(\s+)/)){
    if(!piece)continue;
    if(/^\s+$/.test(piece)){
      fragment.append(document.createTextNode(piece));
      continue
    }
    const span=document.createElement('button');
    span.className='sync-word';
    span.textContent=piece;
    wordButton(span,transcriptWords.length,piece);
    fragment.append(span);
    transcriptWords.push(span)
  }
 root.replaceChildren(fragment);
  refreshWordLabels();
}
function syncTranscript(){

 if(!shown)return;
  const timing=wordTimes[idx];
  if(!timing||timing.length!==transcriptWords.length)return;
 const t=Number.isFinite(a.currentTime)?a.currentTime:0;
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
$('goal').addEventListener('input',()=>{
  const n=Number($('goal').value);
  if(isValidGoal(n, data.length)){
    const d=Math.ceil(data.length/n);
    $('goalSummary').textContent=({ko:`하루 ${n}문장씩 · ${d}일 학습 계획`,en:`${n} ${n===1?'sentence':'sentences'} a day · ${d}-day plan`,ceb:`${n} ka sentence kada adlaw · ${d} ka adlaw nga plano`,ja:`1日${n}文ずつ · ${d}日間の学習計画`})[lang]||goalText(n,d,false)
  }else{
    refreshGoalLabels()
  }
});
$('goal').addEventListener('change',changeGoal);
$('goal').addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    e.preventDefault();
    changeGoal();
    $('goal').blur()
  }
});
function paintGrid(){
  let g=$('grid');
  g.innerHTML='';
  let c=0;
  for(let i=first();i<=last();i++){
    let b=document.createElement('button');
    b.textContent=pad(i+1)+(done[i]?' ✓':'');
    b.className=(i===idx?'active ':'')+(done[i]?'done':'');
    b.onclick=()=>{
      navigateTo(i);
      if(idx===i){
        showSentenceList(false);
        $("sentenceListToggle").focus({preventScroll:true})
      }
    };
    g.append(b);
    if(done[i])c++
  }
  $('range').textContent=pad(first()+1)+'–'+pad(last()+1);
  $('dayContext').textContent=(lang==='ceb'?'ADLAW ':'DAY ')+String(day+1).padStart(2,'0')+' · '+$('range').textContent;
  $('progress').max=last()-first()+1;
  $('progress').value=c;
  $('progressText').textContent=c+' / '+(last()-first()+1);
  iconButton('mark','check',done[idx]?tr('완료 취소'):tr('암기 완료 표시'));
  const total=data.reduce((sum,_,i)=>sum+(done[i]?1:0),0);
  $('overallProgress').max=data.length;
  $('overallProgress').value=total;
  $('overallText').replaceChildren(Object.assign(document.createElement('span'),{textContent:total+' / '+data.length+' '+({ko:'문장',en:'sentences',ceb:'ka sentence',ja:'文',zh:'句',hi:'वाक्य',es:'frases',vi:'câu',ne:'वाक्य',fil:'pangungusap'}[lang])}),Object.assign(document.createElement('span'),{textContent:Number((100*total/data.length).toFixed(1))+'%'}));
  $('mark').setAttribute('aria-pressed',String(!!done[idx]));
  $('day').setAttribute('aria-label',tr('학습 날짜'));
  $('sentenceListLabel').textContent=tr('문장 목록');
  $('overallProgress').setAttribute('aria-label',tr('전체 진행률'));
  $('progress').setAttribute('aria-label',tr('암기 완료'));
  updateDayOptions();
  $('progressText').textContent=tr('암기 완료')+' '+c+' / '+(last()-first()+1);
  $('nextStudyDay').textContent=tr('다음 회차 학습')+' ›';
  $('nextStudyDay').hidden=reviewActive||c!==last()-first()+1||day>=dayCount()-1;
  for(const b of g.children)b.setAttribute('aria-current',b.classList.contains('active')?'true':'false')
}
function reveal(v){
  if(studyMode==='memorize')v=true;
  if(!v&&wordClip)endWordClip();
  shown=v;
  $('reveal').setAttribute('aria-expanded',String(v));
  $('answer').classList.toggle('hidden',!v);
  if(v)syncTranscript();
  iconButton('reveal',v?'eyeoff':'eye',v?tr('원문 · 해석 가리기'):tr('원문 · 해석 보기'))
}
function refreshStudyUI(){
  const memorising=studyMode==='memorize';
  const hasTranslation=lang!=='en';
  document.querySelector('.question-panel').dataset.studyMode=studyMode;
  $('studyMode').setAttribute('aria-label',tr('학습 모드'));
  $('studyMode').hidden=reviewActive;
  $('memorizeMode').setAttribute('aria-pressed',String(memorising));
  $('dictationMode').setAttribute('aria-pressed',String(!memorising));
  $('dictationArea').hidden=memorising;
  $('typed').disabled=memorising;
  $('check').disabled=memorising;
  $('reveal').hidden=memorising;
  $('reveal').disabled=memorising;
  $('memorizeHeading').hidden=!memorising;
  $('translationToggle').hidden=!hasTranslation;
  $('translationToggle').disabled=!memorising||!hasTranslation;
  $('translationToggle').textContent=tr(translationVisible?'해석 숨기기':'해석 보기');
  $('translationToggle').setAttribute('aria-pressed',String(translationVisible));
  $('korean').lang=lang;
  $('korean').hidden=!hasTranslation||(memorising&&!translationVisible);
}
function toggleStudyTranslation(){
  if(studyMode!=='memorize'||lang==='en')return;
  translationVisible=!translationVisible;
  try{
    localStorage.setItem('wfd191_showTranslation',translationVisible?'1':'0')
  }catch(e){}
  refreshStudyUI()
}
function selectStudyMode(next){
  if(studyMode===next)return;
  if(wordClip)endWordClip();
  studyMode=next;
  if(!reviewActive)try{
    localStorage.setItem('wfd191_studyMode',next)
  }catch(e){}
  if(next==='dictation'&&pending===advanceDay)waitForAnswer();
  if(next==='memorize'&&waiting)$('status').textContent=tr('반복 완료');
  refreshStudyUI();
  reveal(next==='memorize'||(gradedDraft!==null&&gradedDraft===$('typed').value));
  refreshModeControls();
}
$('memorizeMode').onclick=()=>{
  if(!reviewActive)selectStudyMode('memorize')
};
$('dictationMode').onclick=()=>selectStudyMode('dictation');
$('translationToggle').onclick=toggleStudyTranslation;
function load(i){
  idx=i;
  storePosition();
  const e=data[i];
  a.src=audioUrl(i);
  a.playbackRate=+$('speed').value;
  $('number').textContent='#'+pad(i+1);
  $('meta').textContent=e.meta.map(tr).join(' · ');
  renderTranscript(e.en);
  $('korean').textContent=answerTranslation(e);
  $('typed').value='';
  gradedDraft=null;
  $('result').textContent='';
  reveal(false);
  paintGrid();
  refreshNavigation();
  document.dispatchEvent(new Event('wfd-loaded'))
}
function syncTransport(){
  $('play').setAttribute('aria-pressed',String(selectedMode==='single'));
  $('dayPlay').setAttribute('aria-pressed',String(selectedMode==='day'));
  refreshNavigation();
  const active=!!wordClip||(!waiting&&!paused&&(!!mode||(!a.paused&&!a.ended)));
  iconButton('stop',active?'pause':'play',tr(active?'Ⅱ 일시정지':(waiting||gradedDraft!==null)?'다시 듣기':'▶ 재생').replace(/^[▶Ⅱ]\s*/,''));
  refreshUXStage()
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
  $('scopeLabel').hidden=reviewActive;
  $('play').closest('.scope-options').hidden=reviewActive;
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
  if(reviewActive||m===selectedMode)return;
  halt();
  selectMode(m);
  $('status').textContent=tr('준비')
}
function refreshUXStage(){

 const q=$('studyPanel'),typed=$('typed'),checked=studyMode==='dictation'&&gradedDraft!==null&&gradedDraft===typed.value;
 const stage=studyMode==='memorize'?'memorize':checked?'checked':typed.value.trim()?'writing':'ready';
  q.dataset.stage=stage;
 $('wordCount').textContent=tr('단어 수')+': '+(typed.value.trim()?typed.value.trim().split(/\s+/u).length:0);
 $('check').hidden=studyMode==='memorize'||checked;
  $('check').disabled=studyMode==='memorize'||checked;
 $('studyHome').textContent=tr('학습');
  $('appNav').setAttribute('aria-label',tr('학습 메뉴'));
  $('scopeLabel').textContent=tr('재생 범위');
  $('reveal').setAttribute('aria-expanded',String(shown));
  $('reveal').setAttribute('aria-controls','answer');
 $('stop').classList.toggle('is-secondary',studyMode==='dictation'&&stage!=='ready');
 const reviewing=!$('reviewSession').hidden;
 $('redoAttempt').hidden=!checked;
  $('reviewNext').hidden=!reviewing;
 for(const id of ['prev','shuffle','next'])$(id).hidden=reviewing;
 q.dataset.reviewing=String(reviewing);
  q.dataset.canNext=String(reviewing||!$('next').disabled);
}
function hasDraft(){
  return studyMode==='dictation'&&$('typed').value.trim()!==''&&$('typed').value!==gradedDraft
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
  $('dictationHint').textContent=tr(hint)
}
function navigateTo(i){
  if(reviewActive||i===idx)return;
  if(!allowLeave())return;
  halt();
  load(i);
  $('status').textContent=tr('준비')
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
  dayQueue=[];
  dayPosition=0;
  cancelRun();
  mode='';
  a.pause();
  $('status').textContent=tr('정지');
  syncTransport()
}
function play(reset=true){
  waiting=false;
  const token=run;
  a.playbackRate=+$('speed').value;
  if(reset||a.ended)a.currentTime=0;
  syncTranscript();
  a.play().catch(()=>{
    if(token!==run||paused)return;
    if(studyMode==='dictation'){
      waiting=true;
      waitStatus='재생 버튼을 다시 눌러 주세요'
    }else mode='';
    $('status').textContent=tr('재생 버튼을 다시 눌러 주세요');
    syncTransport()
  });
  $('status').textContent=paused?tr('일시정지'):mode?(mode==='day'?dayPrefix():'')+tr('반복 ')+count+tr('회'):tr('▶ 재생');
  syncTransport()
}
function start(m,resume=false){
  if(reviewActive)m='single';
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

function schedule(action){
  pending=action;
  const token=run;
  timer=setTimeout(()=>{
    if(token!==run||paused)return;
    timer=null;
    const fn=pending;
    pending=null;
    if(fn)fn()
  },+$('gap').value*1000)
}
function toggleTransport(){
  if(wordClip){
    endWordClip();
    return
  }
  if(waiting||(!mode&&studyMode==='dictation'&&gradedDraft!==null)){
    replayCurrent();
    return
  }
  if(!paused&&(mode||(!a.paused&&!a.ended))){
    paused=true;
    run++;
    clearTimeout(timer);
    timer=null;
    a.pause();
    $('status').textContent=tr('일시정지');
    syncTransport();
    return
  }
  if(paused){
    paused=false;
    if(pending){
      const fn=pending;
      pending=null;
      fn()
    }else play(false);
    syncTransport();
    return
  }
  start(selectedMode,true)
}
a.addEventListener('play',()=>{
  if(paused){
    paused=false;
    if(pending){
      pending=null
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
a.addEventListener('ended',()=>{
  if(wordClip){
    endWordClip();
    return
  }
  if(!mode){
    paused=false;
    syncTransport();
    return
  }
  if(paused||waiting)return;
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
});
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
    $('status').textContent=tr('준비')
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
  $('status').textContent=tr('준비')
}
function showSentenceList(open){
  $('sentenceList').hidden=!open;
  $('sentenceListToggle').setAttribute('aria-expanded',String(open))
}
$('sentenceListToggle').onclick=()=>showSentenceList($('sentenceList').hidden);
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
  paintGrid()
};
const gradeLabels={"ko":["맞힌 단어","모든 단어 일치!","정답","누락","잘못 입력 / 추가","단어 순서와 철자를 비교한 연습용 점수입니다. Pearson 공식 점수가 아닙니다.","입력한 답안 비교","오타·잘못된 단어","추가 입력"],"en":["Correct words","All words match!","Correct","Missing","Incorrect / extra","Practice score based on word order and spelling, not an official Pearson score.","Answer comparison","Incorrect","Extra"],"ceb":["Saktong mga pulong","Sakto ang tanang pulong!","Sakto","Kulang","Sayop / sobra","Puntos sa praktis base sa han-ay ug spelling sa mga pulong, dili opisyal nga puntos sa Pearson.","Pagtandi sa tubag","Sayop","Sobra"],"ja":["正解した単語","すべての単語が一致しました！","正解","抜けた単語","誤入力・余分な単語","語順とスペルに基づく練習用スコアです。Pearsonの公式スコアではありません。","解答の比較","誤入力","余分な単語"],"zh":["正确单词","所有单词均正确！","正确","漏写","错误 / 多写","根据单词顺序和拼写计算的练习分数，并非 Pearson 官方分数。","答案对比","错误","多写"],"hi":["सही शब्द","सभी शब्द सही हैं!","सही","छूटे हुए","गलत / अतिरिक्त","शब्द क्रम और वर्तनी पर आधारित अभ्यास स्कोर, Pearson का आधिकारिक स्कोर नहीं।","उत्तर की तुलना","गलत","अतिरिक्त"],"es":["Palabras correctas","¡Todas las palabras coinciden!","Correcta","Omitida","Incorrecta / extra","Puntuación de práctica según el orden y la ortografía; no es una puntuación oficial de Pearson.","Comparación de respuestas","Incorrecta","Extra"],"vi":["Từ đúng","Tất cả các từ đều khớp!","Đúng","Thiếu","Sai / thừa","Điểm luyện tập dựa trên thứ tự từ và chính tả, không phải điểm chính thức của Pearson.","So sánh câu trả lời","Sai","Thừa"],"ne":["सही शब्दहरू","सबै शब्द मिल्यो!","सही","छुटेको","गलत / थप","शब्दक्रम र हिज्जेमा आधारित अभ्यास अङ्क हो, Pearson को आधिकारिक अङ्क होइन।","उत्तरको तुलना","गलत","थप"],"fil":["Mga tamang salita","Tugma ang lahat ng salita!","Tama","Kulang","Mali / sobra","Iskor sa pagsasanay batay sa ayos at baybay ng mga salita, hindi opisyal na iskor ng Pearson.","Paghahambing ng sagot","Mali","Sobra"]};

function renderGrade(){
  const out=$('result');
  out.replaceChildren();
  if(gradedDraft===null)return null;
 const g=alignDictation(data[idx].en,gradedDraft),t=gradeLabels[lang]||gradeLabels.en;
 const make=(tag,cls,value)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=value;
    return e
  };
 const top=make('div','grade-top'),stat=make('div'),num=make('div','grade-score',g.correct+' / '+g.total);
  stat.append(make('div','grade-label',t[0]),num);
  top.append(stat);
  if(g.perfect)top.append(make('span','grade-perfect',t[1]));
  out.append(top);
 const line=make('div','grade-words');
  line.lang='en';
  line.setAttribute('aria-label',t[6]);
 for(const op of g.ops){
    if(line.childNodes.length)line.append(document.createTextNode(' '));
    if(op.kind==='correct'){
      const e=wordButton(make('button','grade-correct',op.got),op.refIndex,op.ref);
      line.append(e)
    }else{
      if(op.got){
        const e=make('s','grade-extra',op.got);
        e.title=op.kind==='wrong'?t[7]:t[8];
        e.setAttribute('aria-label',e.title+': '+op.got);
        line.append(e)
      }
      if(op.ref){
        if(op.got)line.append(document.createTextNode(' '));
        const e=wordButton(make('button','grade-missing','('+op.ref+')'),op.refIndex,op.ref);
        line.append(e)
      }
    }
  }
 out.append(line);
  paintClip();
  const legend=make('div','grade-legend');
  legend.append(make('span','grade-correct','✓ '+t[2]+' '+g.correct),make('span','grade-missing','('+t[3]+') '+g.missing),make('span','',t[7]+' '+g.wrong),make('span','',t[8]+' '+g.extra));
  out.append(legend,make('div','grade-note',t[5]));
  return g;
}
$('typed').addEventListener('input',()=>{
  if(gradedDraft!==null&&gradedDraft!==$('typed').value){
    gradedDraft=null;
    $('result').replaceChildren();
    reveal(false)
  }
});
$('check').onclick=()=>{
  if(studyMode!=='dictation')return;
  const newAttempt=gradedDraft!==$('typed').value;
  gradedDraft=$('typed').value;
  if(mode)waitForAnswer('채점 완료');else $('status').textContent=tr('채점 완료');
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
$('status').textContent=tr(resumeIndex?'이어서 학습':'준비');
refreshModeControls();
$('language').value=lang;
$('language').onchange=()=>{
  const old=lang;
  const oldStatus=$('status').textContent;setLanguage($('language').value);
  updateLanguage();
  refreshStudyUI();
  refreshGoalLabels();
  $('meta').textContent=data[idx].meta.map(tr).join(' · ');
  $('korean').textContent=answerTranslation(data[idx]);
  paintGrid();
  reveal(shown);
  const translateOld=(value)=>{
    for(const [key,values] of Object.entries(translations)){
      if(value===(old==='ko'?(uiKo[key]??key):values[languageIndex[old]]))return tr(key)
    }
    return value
  };
  $('status').textContent=waiting?tr(studyMode==='dictation'?waitStatus:'반복 완료'):paused?tr('일시정지'):mode?(mode==='day'?dayPrefix():'')+tr('반복 ')+count+tr('회'):translateOld(oldStatus);
  refreshModeControls();
  if(gradedDraft!==null)renderGrade();
  refreshWordLabels();
  if(wordClip)$('status').textContent=clipText(3)
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
 const speedText=Number($('speed').value).toFixed(1)+'×';
 const gapText=tr(gap.value+'초');
 $('playbackSummary').textContent=[tr(selectedMode==='day'?'하루 전체 ▶':'문장 반복 ▶'),repeatText,speedText,...(gap.disabled?[]:[gapText]),...(selectedMode==='day'&&$('dayOrder').value==='shuffle'?[tr('랜덤 재생')]:[]),...(selectedMode==='day'&&$('dayLoop').checked?[tr('하루 전체 무한 반복')]:[])].join(' · ');
}


// Mutable study state is owned here; review uses explicit transitions.
function setReviewActive(value) { reviewActive = value; }
function setNormalSnapshot(value) { normalSnapshot = value; }
function setStudyDay(value) { day = value; }
function clearGradedDraft() { gradedDraft = null; }
function clearDone() { done = {}; }

export {
  $, a, idx, studyMode, goal, day, done, wordClip, reviewActive, normalSnapshot,
  gradedDraft, gradeLabels, clipText, syncTranscript, endWordClip, refreshPlaybackSummary,
  refreshNavigation, refreshUXStage, cancelRun, reveal, replayCurrent, halt,
  applyPlaybackPrefs, buildDays, selectStudyMode, load, refreshModeControls,
  allowLeave, selectMode, playbackPrefs, storePosition, storePlayback,
  showSentenceList, start, pad, answerTranslation,
  setReviewActive, setNormalSnapshot, setStudyDay, clearGradedDraft, clearDone
};
