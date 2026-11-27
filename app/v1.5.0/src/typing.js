import {tr} from './locales.js';
import {readStored,writeStored} from './storage.js';
import {compareTyping,normalizeTyping,recordTyping,validGoals} from './typing-model.js';
const STORE='wfd191_typing';
export function createTyping({getIndex,getSentence,isActive,length}){
  const $=id=>document.getElementById(id), input=$('typingInput');
  let state=normalizeTyping(readStored(STORE),length), composing=false, message='', saved=true;
  const save=()=>{saved=writeStored(STORE,state);};
  function refresh(){
    if(!isActive())return;
    const count=state.counts[getIndex()]||0, goal=state.goal;
    $('typingTitle').textContent=tr('타이핑');
    $('typingGoalLabel').textContent=tr('타이핑 반복 목표');
    $('typingGoal').value=String(goal);
    $('typingHint').textContent=tr('원문을 보며 그대로 입력하세요. 대소문자와 문장부호까지 일치하면 자동으로 다시 시작합니다.');
    input.placeholder=tr('문장을 입력하세요');
    $('typingProgress').setAttribute('aria-label',tr('타이핑 반복 목표'));
    for(const option of $('typingGoal').options)option.textContent=tr(option.value==='0'?'무제한':option.value+'회');
    $('typingCount').textContent=count+' / '+(goal||'∞')+(goal?' '+tr('회'):'')+(goal&&count>=goal?' ✓':'');
    $('typingProgress').hidden=!goal;
    $('typingProgress').max=goal||1;$('typingProgress').value=Math.min(count,goal);
    const result=compareTyping(getSentence(),input.value);
    for(const el of document.querySelectorAll('#english [data-typing-char]')){
      const next=result.states[Number(el.dataset.typingChar)]||'pending';
      if(el.dataset.typingState!==next)el.dataset.typingState=next;
    }
    $('typingFeedback').textContent=!saved?tr('타이핑 기록 저장 불가'):message?tr(message):!input.value?'':result.mismatch===result.total?tr('추가 입력을 확인하세요'):result.mismatch>=0?tr('틀린 글자를 확인하세요'):'';
    input.setAttribute('aria-invalid',String(result.mismatch>=0));
  }
  function handleInput(){
    if(!isActive()||composing)return;
    message='';
    if(compareTyping(getSentence(),input.value).complete){
      recordTyping(state,getIndex());save();input.value='';message='';
    }
    refresh();
  }
  input.addEventListener('compositionstart',()=>{composing=true;});
  input.addEventListener('compositionend',()=>{composing=false;handleInput();});
  input.addEventListener('input',e=>{if(!e.isComposing)handleInput();});
  $('typingGoal').addEventListener('change',()=>{const n=Number($('typingGoal').value);if(validGoals.includes(n)){state.goal=n;save();refresh();}});
  return {refresh,resetDraft(){input.value='';composing=false;message='';refresh();},hasDraft(){return input.value.length>0;},clear(){state=normalizeTyping({goal:state.goal},length);save();refresh();return saved;}};
}
