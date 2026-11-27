// Actual audio amplitudes, not a decorative waveform. Native range is keyboard and touch accessible.
const seek=$('seek'),wave=$('wave');
const fill=document.createElement('div');fill.className='wave-fill';fill.setAttribute('aria-hidden','true');
const bars=Array.from({length:48},()=>{const b=document.createElement('i');b.setAttribute('aria-hidden','true');wave.insertBefore(b,seek);return b});
const fillBars=bars.map(()=>{const b=document.createElement('i');fill.append(b);return b});wave.insertBefore(fill,seek);
let frameId=null;
function timeLabel(n){n=Number.isFinite(n)?Math.max(0,Math.floor(n)):0;return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
function syncPlayer(){syncTranscript();const dur=Number.isFinite(a.duration)?a.duration:0;const current=a.currentTime||0;const ratio=dur?Math.max(0,Math.min(1,current/dur)):0;wave.style.setProperty('--played',`${ratio*100}%`);seek.value=ratio;seek.disabled=!dur;const elapsed=timeLabel(current),duration=timeLabel(dur);if($('elapsed').textContent!==elapsed)$('elapsed').textContent=elapsed;if($('duration').textContent!==duration)$('duration').textContent=duration;const aria=elapsed+' / '+duration;if(seek.getAttribute('aria-valuetext')!==aria)seek.setAttribute('aria-valuetext',aria);const speed=Number($('speed').value).toFixed(1)+'×';if($('audioSpeed').textContent!==speed)$('audioSpeed').textContent=speed;}
function tick(){frameId=null;syncPlayer();if(!a.paused&&!a.ended&&!document.hidden)frameId=requestAnimationFrame(tick)}
function stopVisual(){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;syncPlayer()}
function startVisual(){if(frameId===null)tick()}
function drawWave(values){bars.forEach((b,i)=>{const h=(values?Math.max(3,Math.round(values[i]*30)):3)+'px';b.style.setProperty('--h',h);fillBars[i].style.setProperty('--h',h)})}
function updateWave(){drawWave(waveforms[idx]);syncPlayer()}
seek.addEventListener('input',()=>{if(wordClip)endWordClip();if(Number.isFinite(a.duration)){a.currentTime=Number(seek.value)*a.duration;syncPlayer()}});for(const event of ['loadedmetadata','durationchange','timeupdate','seeking','seeked','ratechange','ended','emptied'])a.addEventListener(event,syncPlayer);a.addEventListener('loadstart',()=>{stopVisual();updateWave()});for(const e of ['play','playing'])a.addEventListener(e,startVisual);for(const e of ['pause','ended','emptied'])a.addEventListener(e,stopVisual);document.addEventListener('visibilitychange',()=>{if(document.hidden||a.paused||a.ended)stopVisual();else startVisual()});$('speed').addEventListener('change',syncPlayer);function playerLabels(){seek.setAttribute('aria-label',({ko:'재생 위치',en:'Playback position',ceb:'Posisyon sa playback',ja:'再生位置',zh:'播放位置',hi:'प्लेबैक स्थिति',es:'Posición de reproducción',vi:'Vị trí phát',ne:'प्लेब्याक स्थिति',fil:'Posisyon ng playback'})[lang])}$('language').addEventListener('change',playerLabels);playerLabels();updateWave();
for(const id of ['repeat','speed','gap','dayOrder','dayLoop','language'])$(id).addEventListener('change',refreshPlaybackSummary);$('dayLoop').addEventListener('change',refreshNavigation);
$('dayPlay').addEventListener('click',refreshPlaybackSummary);refreshPlaybackSummary();


