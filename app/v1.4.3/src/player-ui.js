import { $, syncTranscript, a, idx, wordClip, endWordClip, playerPosition, resetWordPosition, refreshPlaybackSummary, refreshNavigation } from './study.js';
import { waveforms } from './waveforms.js';
import { lang } from './locales.js';
import { createFrameGovernor } from './adaptive-performance.js';

// Actual audio amplitudes, not a decorative waveform. Native range is keyboard and touch accessible.
const seek=$('seek'),wave=$('wave');
const fill=document.createElement('div');
fill.className='wave-fill';
fill.setAttribute('aria-hidden','true');
const bars=Array.from({length:48},()=>{
  const b=document.createElement('i');
  b.setAttribute('aria-hidden','true');
  wave.insertBefore(b,seek);
  return b
});
const fillBars=bars.map(()=>{
  const b=document.createElement('i');
  fill.append(b);
  return b
});
wave.insertBefore(fill,seek);
let frameId=null,waveDirty=true;
const frameGovernor=createFrameGovernor();
function timeLabel(n){
  n=Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
  return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')
}
function syncPlayer(){
  if(document.hidden)return;
  syncTranscript();
  const dur=Number.isFinite(a.duration)?a.duration:0;
  const current=playerPosition();
  const ratio=dur?Math.max(0,Math.min(1,current/dur)):0;
  wave.style.setProperty('--played',`${ratio*100}%`);
  seek.value=ratio;
  seek.disabled=!dur;
  const elapsed=timeLabel(current),duration=timeLabel(dur);
  if($('elapsed').textContent!==elapsed)$('elapsed').textContent=elapsed;
  if($('duration').textContent!==duration)$('duration').textContent=duration;
  const aria=elapsed+' / '+duration;
  if(seek.getAttribute('aria-valuetext')!==aria)seek.setAttribute('aria-valuetext',aria);
  const speed=Number($('speed').value).toFixed(1)+'×';
  if($('audioSpeed').textContent!==speed)$('audioSpeed').textContent=speed;
}
function tick(now){
  frameId=null;
  if(document.hidden||(wordClip?.engine!=='buffer'&&(a.paused||a.ended)))return;
  if(frameGovernor.shouldPaint(now))syncPlayer();
  frameId=requestAnimationFrame(tick);
}
function stopVisual(){
  if(frameId!==null)cancelAnimationFrame(frameId);
  frameId=null;
  if(!document.hidden)syncPlayer();
}
function startVisual(){
  if(document.hidden||frameId!==null)return;
  frameGovernor.reset();
  frameId=requestAnimationFrame(tick);
}
function drawWave(values){
  bars.forEach((b,i)=>{
    const h=(values?Math.max(3,Math.round(values[i]*30)):3)+'px';
    b.style.setProperty('--h',h);
    fillBars[i].style.setProperty('--h',h)
  })
}
function updateWave(){
  waveDirty=true;
  if(document.hidden)return;
  drawWave(waveforms[idx]);
  waveDirty=false;
  syncPlayer();
}
seek.addEventListener('input',()=>{
  const ratio=Number(seek.value);
  if(wordClip)endWordClip();
  resetWordPosition();
  if(Number.isFinite(a.duration)){
    a.currentTime=ratio*a.duration;
    syncPlayer()
  }
});
for(const event of ['loadedmetadata','durationchange','seeking','seeked','ratechange','ended','emptied'])a.addEventListener(event,syncPlayer);
a.addEventListener('timeupdate',()=>{if(frameId===null)syncPlayer();});
a.addEventListener('loadstart',()=>{
  stopVisual();
  updateWave()
});
for(const e of ['play','playing'])a.addEventListener(e,startVisual);
for(const e of ['pause','ended','emptied'])a.addEventListener(e,()=>{if(wordClip?.engine==='buffer')startVisual();else stopVisual();});
document.addEventListener('wfd-word-visual',()=>{syncPlayer();if(wordClip?.engine==='buffer'||!a.paused&&!a.ended)startVisual();else stopVisual();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopVisual();return;}
  if(waveDirty)updateWave();else syncPlayer();
  if(!a.paused&&!a.ended)startVisual();
});
$('speed').addEventListener('change',syncPlayer);
function playerLabels(){
  seek.setAttribute('aria-label',({ko:'재생 위치',en:'Playback position',ceb:'Posisyon sa playback',ja:'再生位置',zh:'播放位置',hi:'प्लेबैक स्थिति',es:'Posición de reproducción',vi:'Vị trí phát',ne:'प्लेब्याक स्थिति',fil:'Posisyon ng playback'})[lang])
}
$('language').addEventListener('change',playerLabels);
playerLabels();
updateWave();
for(const id of ['repeat','speed','gap','dayOrder','dayLoop','language'])$(id).addEventListener('change',refreshPlaybackSummary);
$('dayLoop').addEventListener('change',refreshNavigation);
$('dayPlay').addEventListener('click',refreshPlaybackSummary);
refreshPlaybackSummary();
