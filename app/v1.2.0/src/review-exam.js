import { tr, languageCodes, lang } from './locales.js';
import { data, audioUrl } from './sentences.js';
import { alignDictation, gradeTokens } from './scoring.js';
import {
  $, idx, reviewActive, refreshUXStage, wordClip, endWordClip, cancelRun, a,
  gradedDraft, reveal, replayCurrent, halt, normalSnapshot, applyPlaybackPrefs,
  goal, buildDays, selectStudyMode, load, refreshModeControls, allowLeave, selectMode,
  studyMode, playbackPrefs, storePosition, storePlayback, showSentenceList, start,
  pad, gradeLabels, answerTranslation, setReviewActive, setNormalSnapshot,
  setStudyDay, clearGradedDraft, clearDone
} from './study.js';

(()=>{

'use strict';
const lex={
review:['복습 · 학습 기록','Review & history','Balik & rekord','復習・学習履歴','复习与记录','दोहराव और इतिहास','Repaso e historial','Ôn tập & lịch sử','पुनरावृत्ति र इतिहास','Balik-aral at tala'],
exam:['실전 모드','Exam mode','Exam mode','模擬試験','模拟考试','परीक्षा मोड','Modo examen','Thi thử','परीक्षा मोड','Exam mode'],
due:['복습 예정','Due review','Balikon karon','復習予定','待复习','दोहराने योग्य','Pendientes','Đến hạn','पुनरावृत्ति बाँकी','Dapat balikan'],
wrong:['오답','Mistakes','Sayop','間違い','错题','गलतियाँ','Errores','Câu sai','गल्ती','Mali'],
history:['학습 이력','History','Rekord','学習履歴','学习记录','इतिहास','Historial','Lịch sử','इतिहास','Tala'],
weak:['취약 단어','Weak words','Lisod nga pulong','苦手な単語','薄弱单词','कमज़ोर शब्द','Palabras difíciles','Từ yếu','कमजोर शब्द','Mahirap na salita'],
attempts:['시도 횟수','Attempts','Mga pagsulay','挑戦回数','作答次数','प्रयास','Intentos','Số lần làm','प्रयास','Mga pagsubok'],
accuracy:['단어 정답률','Word accuracy','Saktong pulong','単語正答率','单词正确率','शब्द सटीकता','Acierto de palabras','Độ chính xác từ','शब्द शुद्धता','Tamang salita'],
last:['최근 결과','Last result','Kataposang resulta','前回の結果','上次结果','अंतिम परिणाम','Último resultado','Kết quả gần nhất','पछिल्लो नतिजा','Huling resulta'],
nextDue:['다음 복습','Next review','Sunod nga balik','次回復習','下次复习','अगला दोहराव','Próximo repaso','Lần ôn tiếp','अर्को पुनरावृत्ति','Susunod na balik'],
now:['지금','Now','Karon','今','现在','अभी','Ahora','Bây giờ','अहिले','Ngayon'],
start:['복습 시작','Start review','Sugdi ang pagbalik','復習開始','开始复习','दोहराना शुरू करें','Iniciar repaso','Bắt đầu ôn','पुनरावृत्ति सुरु','Simulan ang balik-aral'],
open:['풀기','Practise','Praktis','練習','练习','अभ्यास','Practicar','Luyện tập','अभ्यास','Magsanay'],
empty:['아직 기록이 없어요. 받아쓰기를 채점하면 여기에 표시됩니다.','No records here yet. Check a dictation answer to get started.','Wala pay rekord. Susiha ang dictation.','まだ記録がありません。書き取りを採点してください。','暂无记录。请先完成听写评分。','अभी रिकॉर्ड नहीं हैं। पहले श्रुतलेख जाँचें।','Aún no hay registros. Corrige un dictado para comenzar.','Chưa có dữ liệu. Hãy chấm một câu nghe chép.','अहिले रेकर्ड छैन। श्रुतलेखन जाँच गर्नुहोस्।','Wala pang tala. Mag-check muna ng diktasyon.'],
allGood:['현재 복습할 문장이 없어요.','No sentences to review right now.','Walay sentence nga balikon karon.','現在復習する文はありません。','目前没有需要复习的句子。','अभी दोहराने के लिए वाक्य नहीं हैं।','No hay frases pendientes ahora.','Hiện không có câu cần ôn.','अहिले पुनरावृत्ति गर्ने वाक्य छैन।','Walang pangungusap na dapat balikan ngayon.'],
schedule:['정답이면 1·3·7·14·30일 뒤 복습, 오답이면 즉시 복습 목록에 추가됩니다.','Perfect answers are scheduled in 1, 3, 7, 14 or 30 days; mistakes are due now.','Saktong tubag: 1, 3, 7, 14 o 30 ka adlaw; sayop: karon.','全問正解なら1・3・7・14・30日後、間違いはすぐ復習します。','全对后间隔1、3、7、14、30天，错题立即复习。','सही उत्तर: 1, 3, 7, 14, 30 दिन बाद; गलत: अभी।','Acierto total: 1, 3, 7, 14 o 30 días; error: ahora.','Đúng hết: ôn sau 1, 3, 7, 14 hoặc 30 ngày; sai: ôn ngay.','सही: 1, 3, 7, 14 वा 30 दिनपछि; गलत: अहिले।','Tama lahat: 1, 3, 7, 14 o 30 araw; mali: ngayon.'],
local:['학습 기록은 현재 브라우저에 저장됩니다.','Records are stored in this browser.','Ang rekord gitipigan sa browser.','記録はこのブラウザーに保存されます。','记录保存在此浏览器中。','रिकॉर्ड इस ब्राउज़र में सहेजे जाते हैं।','Los registros se guardan en este navegador.','Dữ liệu được lưu trong trình duyệt này.','रेकर्ड यस ब्राउजरमा सुरक्षित हुन्छ।','Naka-save ang tala sa browser na ito.'],
retry:['다시 풀기','Try again','Sulayi pag-usab','解き直す','重做','फिर प्रयास','Reintentar','Làm lại','फेरि प्रयास','Subukan muli'],
close:['닫기','Close','Sirado','閉じる','关闭','बंद करें','Cerrar','Đóng','बन्द','Isara'],
examIntro:['랜덤 4문장 · 원본 음원 1회 · 문장당 답안 작성 60초 · 제출 후 수정 불가 · 마지막에만 결과 확인. 실제 PTE 전체 시험과 다른 자체 WFD 연습입니다.','4 random sentences · one playback · 60 seconds to answer each · no edits after submission · results at the end. This is a WFD practice simulation, not the official PTE test.','4 random nga sentence · usa ka playback · 60 segundos · resulta sa kataposan. Dili opisyal nga PTE.','ランダム4文・再生1回・解答60秒・提出後修正不可・最後に結果表示。公式PTEではない練習です。','随机4句·播放一次·每题60秒·提交后不可修改·最后显示结果。非官方PTE考试。','4 यादृच्छिक वाक्य · एक बार ऑडियो · 60 सेकंड · अंत में परिणाम। आधिकारिक PTE नहीं।','4 frases aleatorias · una reproducción · 60 segundos · sin cambios tras enviar · resultados al final. Simulación no oficial.','4 câu ngẫu nhiên · nghe 1 lần · 60 giây mỗi câu · kết quả cuối bài. Không phải bài thi PTE chính thức.','4 अनियमित वाक्य · एक पटक अडियो · 60 सेकेन्ड · अन्त्यमा नतिजा। आधिकारिक PTE होइन।','4 random na pangungusap · isang playback · 60 segundo · resulta sa huli. Hindi opisyal na PTE.'],
examStart:['시험 시작','Start test','Sugdi ang test','試験開始','开始测试','परीक्षा शुरू','Iniciar prueba','Bắt đầu thi','परीक्षा सुरु','Simulan ang test'],
listening:['음원 재생 중 · 한 번만 들을 수 있어요','Playing audio · one playback','Nagpatukar · kausa ra','音声再生中・1回のみ','播放中·仅一次','ऑडियो चल रहा है · एक बार','Reproduciendo · una vez','Đang phát · một lần','अडियो बज्दै · एक पटक','Nagpe-play · isang beses'],
answer:['답안을 입력하세요','Type your answer','Isulat ang tubag','解答を入力','输入答案','उत्तर लिखें','Escribe tu respuesta','Nhập câu trả lời','उत्तर लेख्नुहोस्','I-type ang sagot'],
submit:['제출하고 다음','Submit & next','Isumite ug sunod','提出して次へ','提交并继续','जमा करें और आगे','Enviar y seguir','Nộp và tiếp tục','पेश गरी अगाडि','Ipasa at susunod'],
finish:['시험 제출','Finish test','Humanon ang test','試験終了','提交测试','परीक्षा समाप्त','Finalizar prueba','Nộp bài','परीक्षा समाप्त','Tapusin ang test'],
results:['시험 결과','Test results','Resulta sa test','試験結果','测试结果','परीक्षा परिणाम','Resultados','Kết quả thi','परीक्षा नतिजा','Resulta ng test'],
leave:['시험을 중단할까요? 미완료 시험은 저장되지 않습니다.','Leave this test? Unfinished tests are not saved.','Biyaa ang test? Dili matipigan ang wala mahuman.','試験を中断しますか？未完了の試験は保存されません。','退出测试？未完成的测试不会保存。','परीक्षा छोड़ें? अधूरी परीक्षा सहेजी नहीं जाएगी।','¿Salir? Las pruebas incompletas no se guardan.','Thoát bài thi? Bài chưa hoàn thành không được lưu.','परीक्षा छोड्ने? अधुरो परीक्षा सुरक्षित हुँदैन।','Umalis? Hindi mase-save ang hindi tapos na test.'],
blocked:['음원을 시작하지 못했습니다. 다시 시도하세요.','Audio could not start. Try again.','Wala nagsugod ang audio. Sulayi pag-usab.','音声を開始できません。再試行してください。','音频无法开始，请重试。','ऑडियो शुरू नहीं हुआ। फिर प्रयास करें।','No se pudo iniciar el audio. Reintenta.','Không phát được âm thanh. Hãy thử lại.','अडियो सुरु भएन। फेरि प्रयास गर्नुहोस्।','Hindi nagsimula ang audio. Subukan muli.'],
correct:['정답','Correct','Sakto','正解','正确','सही','Correcto','Đúng','सही','Tama'],
wordErrors:['누락·오답 횟수','Missed / incorrect count','Kulang / sayop','抜け・誤答回数','漏写／错误次数','छूटे / गलत','Omisiones / errores','Số lần thiếu / sai','छुटेका / गलत','Bilang ng kulang / mali'],
unsaved:['저장 공간에 기록하지 못했어요. 이 세션에서만 유지됩니다.','Could not save. Records last for this session only.','Dili ma-save ang rekord.','保存できません。今回のみ記録します。','无法保存，仅本次会话有效。','सहेज नहीं सके। रिकॉर्ड केवल इस सत्र में।','No se pudo guardar. Solo esta sesión.','Không lưu được. Chỉ giữ trong phiên này.','सुरक्षित भएन। यस सत्रमा मात्र।','Hindi na-save. Sa session lang.'],
examSaved:['시험 결과가 복습 기록에 반영됐어요.','Results added to your review history.','Gidugang ang resulta sa rekord.','結果を復習履歴に追加しました。','结果已加入复习记录。','परिणाम इतिहास में जोड़े गए।','Resultados añadidos al historial.','Đã thêm kết quả vào lịch sử.','नतिजा इतिहासमा थपियो।','Nadagdag ang resulta sa tala.'],
blank:['미입력','No answer','Walay tubag','未回答','未作答','कोई उत्तर नहीं','Sin respuesta','Chưa trả lời','उत्तर छैन','Walang sagot'],
reviewDone:['복습 목록 완료','Review queue complete','Nahuman ang pagbalik','復習リスト完了','复习列表完成','दोहराव सूची पूरी','Lista de repaso completada','Hoàn thành danh sách ôn','पुनरावृत्ति सूची पूरा','Tapos ang listahan'],
};
Object.assign(lex,{"resetAll": ["전체 학습 기록 초기화", "Reset all learning history", "I-reset ang tanang rekord sa pagtuon", "すべての学習履歴をリセット", "重置所有学习记录", "सभी अध्ययन रिकॉर्ड रीसेट करें", "Restablecer todo el historial", "Đặt lại toàn bộ lịch sử học", "सबै अध्ययन रेकर्ड रिसेट गर्नुहोस्", "I-reset ang lahat ng tala ng pag-aaral"], "resetConfirm": ["암기 완료, 받아쓰기·실전 채점 이력, 오답, 복습 일정, 취약 단어 기록을 모두 삭제할까요? 현재 답안도 지워집니다. 설정은 유지되며 이 작업은 되돌릴 수 없습니다.", "Delete all memorised marks, dictation and exam history, mistakes, review schedules and weak-word records? The current answer will also be cleared. Settings will be kept. This cannot be undone.", "Papason ang tanang marka sa memorya, rekord sa dictation ug exam, sayop, iskedyul sa pagbalik ug lisod nga mga pulong? Papason usab ang tubag karon. Magpabilin ang settings. Dili kini mabawi.", "暗記済みの印、書き取り・試験履歴、誤答、復習予定、苦手単語をすべて削除しますか？現在の回答も消去します。設定は保持され、元に戻せません。", "删除所有已记忆标记、听写和模拟考试记录、错题、复习计划及薄弱单词？当前答案也将清除。设置保留，此操作无法撤销。", "सभी याद किए गए चिह्न, श्रुतलेख और परीक्षा इतिहास, गलतियाँ, पुनरावृत्ति कार्यक्रम और कमजोर शब्द हटाएँ? वर्तमान उत्तर भी मिटेगा। सेटिंग्स बनी रहेंगी। इसे वापस नहीं किया जा सकता।", "¿Borrar todas las marcas de memorización, el historial de dictados y exámenes, los errores, el calendario de repaso y las palabras difíciles? También se borrará la respuesta actual. Se conservarán los ajustes. No se puede deshacer.", "Xóa mọi dấu đã ghi nhớ, lịch sử nghe chép và thi thử, lỗi sai, lịch ôn và từ yếu? Câu trả lời hiện tại cũng sẽ bị xóa. Giữ nguyên cài đặt. Không thể hoàn tác.", "कण्ठ गरेका चिन्ह, श्रुतलेखन र परीक्षा इतिहास, गल्ती, पुनरावृत्ति तालिका र कमजोर शब्द सबै मेटाउने? हालको उत्तर पनि मेटिनेछ। सेटिङ यथावत् रहनेछ। यो उल्टाउन मिल्दैन।", "Burahin ang lahat ng marka ng pagsasaulo, kasaysayan ng diktasyon at pagsusulit, mga mali, iskedyul ng balik-aral at mahihinang salita? Mabubura rin ang kasalukuyang sagot. Mananatili ang settings. Hindi ito mababawi."], "resetFailed": ["저장된 기록 초기화에 실패했어요. 현재 화면만 초기화되었으며 새로고침하면 이전 기록이 남아 있을 수 있습니다.", "Could not reset saved records. This session is cleared, but previous records may return after reload.", "Dili ma-reset ang gitipig nga rekord. Posibleng mobalik kini human sa reload.", "保存済みの履歴をリセットできませんでした。再読み込みすると以前の記録が戻る場合があります。", "无法重置已保存记录。刷新后旧记录可能恢复。", "सहेजे गए रिकॉर्ड रीसेट नहीं हुए। रीलोड के बाद पुराने रिकॉर्ड लौट सकते हैं।", "No se pudo borrar el historial guardado. Puede reaparecer al recargar.", "Không thể xóa dữ liệu đã lưu. Dữ liệu cũ có thể trở lại khi tải lại.", "सुरक्षित रेकर्ड रिसेट भएन। पुनः लोड गर्दा पुराना रेकर्ड फर्कन सक्छन्।", "Hindi nabura ang naka-save na tala. Maaaring bumalik ang mga ito kapag ni-reload."]});
const L=k=>k==='exam'?tr('실전 연습'):(lex[k]?.[languageCodes.indexOf(lang)]||lex[k]?.[1]||k);
const STORE='wfd191_learning_v1',DAY=86400000,intervals=[1,3,7,14,30];
let state={sentences:{},weak:{}};
  try{
    const old=JSON.parse(localStorage.getItem(STORE)||'null');
    if(old&&old.sentences&&old.weak)state=old
  }catch(e){}
let saveFailed=false;
function persist(){
    try{
      localStorage.setItem(STORE,JSON.stringify(state));
      saveFailed=false
    }catch(e){
      saveFailed=true
    }
  }
function record(i,answer,g,source){
    const k=String(i),r=state.sentences[k]||{attempts:0,correct:0,total:0,streak:0,history:[]};
    const at=Date.now();
    r.attempts++;
    r.correct+=g.correct;
    r.total+=g.total;
    r.lastCorrect=g.correct;
    r.lastTotal=g.total;
    r.lastPerfect=g.perfect;
    r.lastAt=at;
// A correct attempt advances the interval only when the current review is due; immediate repeat successes do not jump the schedule.
if(!g.perfect){
      r.streak=0;
      r.due=at
    }else if(!r.due||r.due<=at||r.streak===0){
      r.due=at+DAY*intervals[Math.min(r.streak,intervals.length-1)];
      r.streak=Math.min(r.streak+1,intervals.length)
    }
r.history.unshift({at,correct:g.correct,total:g.total,perfect:g.perfect,source,answer:answer.slice(0,1000)});
    r.history=r.history.slice(0,30);
    state.sentences[k]=r;
for(const op of g.ops){
      if(op.kind!=='missing'&&op.kind!=='wrong')continue;
      const word=gradeTokens(op.ref)[0]?.key;
      if(!word)continue;
      const key='w:'+word;
      const w=state.weak[key]||{word,count:0,sentences:{}};
      w.count++;
      w.sentences[k]=(w.sentences[k]||0)+1;
      state.weak[key]=w
    }
persist();
    refresh();
  }
const el=(tag,txt,cls)=>{
    const x=document.createElement(tag);
    if(txt!==undefined)x.textContent=txt;
    if(cls)x.className=cls;
    return x
  };
const btn=(txt,fn,cls)=>{
    const b=el('button',txt,cls);
    b.type='button';
    b.onclick=fn;
    return b
  };
const recs=()=>Object.entries(state.sentences).filter(([i,r])=>Number.isInteger(+i)&&+i>=0&&+i<data.length&&r&&r.attempts>0).map(([i,r])=>[+i,r]);
const due=()=>recs().filter(([,r])=>r.due<=Date.now()).sort((a,b)=>a[1].due-b[1].due).map(([i])=>i);
const wrong=()=>recs().filter(([,r])=>!r.lastPerfect).sort((a,b)=>b[1].lastAt-a[1].lastAt).map(([i])=>i);
const fmt=t=>t<=Date.now()?L('now'):new Date(t).toLocaleDateString(lang==='ceb'?'en-PH':lang==='fil'?'fil-PH':lang,{month:'short',day:'numeric',year:'numeric'});
const percent=(c,n)=>n?Math.round(c*100/n)+'%':'—';
const shortNav={"ko": ["복습", "실전"], "en": ["Review", "Exam"], "ceb": ["Balik", "Exam"], "ja": ["復習", "模擬試験"], "zh": ["复习", "模拟考试"], "hi": ["दोहराव", "परीक्षा"], "es": ["Repaso", "Examen"], "vi": ["Ôn tập", "Thi thử"], "ne": ["पुनरावृत्ति", "परीक्षा"], "fil": ["Balik-aral", "Exam"]};
let reviewQueue=[],reviewPos=0,reviewTab='due',reviewMoving=false;
function refresh(){

    $('reviewLabel').textContent=shortNav[lang]?.[0]||shortNav.en[0];
    $('examOpen').textContent=shortNav[lang]?.[1]||shortNav.en[1];
    $('reviewOpen').title=L('review');
    $('examOpen').title=tr('실전 연습');
    $('examOpen').textContent=tr('실전 연습');
    $('reviewCount').textContent=due().length;
    $('reviewCount').hidden=!due().length;
    const r=state.sentences[idx];
    $('attemptSummary').hidden=!r;
    $('attemptSummary').textContent=r?`${L('attempts')} ${r.attempts} · ${L('last')} ${r.lastCorrect}/${r.lastTotal} · ${L('nextDue')}: ${fmt(r.due)}`:'';
$('reviewSession').hidden=!reviewQueue.length;
    $('studyMode').hidden=reviewActive;
    $('scopeLabel').hidden=reviewActive;
    $('play').closest('.scope-options').hidden=reviewActive;
    $('dayPlay').disabled=reviewActive;
    $('reviewPosition').textContent=`${L('review')} ${reviewPos+1} / ${reviewQueue.length}`;
    $('reviewNext').textContent=reviewPos+1>=reviewQueue.length?tr('복습 마치기'):tr('다음');
    $('reviewExit').setAttribute('aria-label',tr('복습 종료'));
    $('reviewExit').title=tr('복습 종료');
    $('reviewExit').textContent=tr('복습 종료');
    $('reviewClose').setAttribute('aria-label',L('close'));
    $('examClose').setAttribute('aria-label',tr('시험 종료'));
    $('examClose').textContent=tr('시험 종료');
// a retry button is separate from the score box to keep the comparison uncluttered.
$('redoAttempt').textContent=L('retry');
    refreshUXStage();
  }
$('redoAttempt').onclick=()=>{
    if(wordClip)endWordClip();
    cancelRun();
    a.pause();
    $('typed').value='';
    clearGradedDraft();
    $('result').replaceChildren();
    reveal(false);
    $('status').textContent=tr('준비');
    refresh();
    $('typed').focus();
    replayCurrent()
  };
function endReview(){
    if(!reviewActive){
      reviewQueue=[];
      reviewPos=0;
      refresh();
      return
    }
    halt();
    const snap=normalSnapshot;
    reviewQueue=[];
    reviewPos=0;
    setReviewActive(false);
    setNormalSnapshot(null);
    $('studyNavigator').hidden=false;
    if(snap){
      applyPlaybackPrefs(snap.playback);
      setStudyDay(Math.floor(snap.index / goal));
      buildDays();
      selectStudyMode(snap.mode);
      load(snap.index);
      refreshModeControls();
      $('status').textContent=tr('이어서 학습')
    }
    refresh()
  }
function exitReview(){
    if(!allowLeave())return;
    endReview();
    setPage('study')
  }
$('studyHome').addEventListener('click',e=>{
    e.preventDefault();
    navigatePage('study')
  });
function enterSentence(i){
    reviewMoving=true;
    try{
      halt();
      setStudyDay(Math.floor(i / goal));
      buildDays();
      selectMode('single');
      selectStudyMode('dictation');
      load(i);
      $('status').textContent=tr('준비')
    }finally{
      reviewMoving=false
    }
    refresh()
  }
function startReview(ids){
    if(!ids.length||!allowLeave())return;
    if(!reviewActive){
      setNormalSnapshot({ index: idx, mode: studyMode, playback: playbackPrefs() });
      storePosition();
      storePlayback();
      setReviewActive(true)
    }
    showSentenceList(false);
    $('studyNavigator').hidden=true;
    reviewQueue=ids.slice();
    reviewPos=0;
    setPage('review',false);
    enterSentence(reviewQueue[0]);
    start('single')
  }
function moveReview(){
    if(!allowLeave())return;
    if(reviewPos+1>=reviewQueue.length){
      endReview();
      setPage('review');
      renderReview();
      return
    }
    reviewPos++;
    enterSentence(reviewQueue[reviewPos]);
    start('single')
  }
$('reviewNext').onclick=moveReview;
  $('reviewExit').onclick=exitReview;
const dialog=$('reviewDialog'),body=$('reviewBody');
  let page='study';
  function setPage(next,focus=true){
    page=next;
    const practice=next==='study'||(next==='review'&&reviewActive);
    $('studyWorkspace').hidden=!practice;
    dialog.hidden=next!=='review'||reviewActive;
    $('examDialog').hidden=next!=='exam';
    for(const [id,p] of [['studyHome','study'],['reviewOpen','review'],['examOpen','exam']]){
      if(next===p)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current')
    }
    if(focus){
      const target=next==='study'?'studyHome':next==='review'?(reviewActive?'reviewExit':'reviewTitle'):'examTitle';
      $(target).focus({preventScroll:true});
      window.scrollTo(0,0)
    }
  }
function renderReview(){

    $('reviewTitle').textContent=L('review');
    body.replaceChildren();
    const entries=recs(),totals=entries.reduce((a,[,r])=>[a[0]+r.attempts,a[1]+r.correct,a[2]+r.total],[0,0,0]);
    const summary=el('div',undefined,'plus-summary');
    for(const [n,t] of [[due().length,L('due')],[totals[0],L('attempts')],[percent(totals[1],totals[2]),L('accuracy')]]){
      const stat=el('div',undefined,'plus-stat');
      stat.append(el('strong',String(n)),el('small',t));
      summary.append(stat)
    }
    body.append(summary);
    const tabs=el('div',undefined,'plus-tabs');
    for(const key of ['due','wrong','history','weak']){
      const b=btn(L(key),()=>{
        reviewTab=key;
        renderReview()
      });
      b.setAttribute('aria-pressed',String(reviewTab===key));
      tabs.append(b)
    }
    body.append(tabs);
const list=el('div',undefined,'plus-list');
    if(reviewTab==='weak'){
      const words=Object.values(state.weak).sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word));
      if(!words.length)list.append(el('p',L('empty'),'plus-note'));
      for(const w of words){
        const row=el('div',undefined,'plus-item'),copy=el('div');
        copy.append(el('strong',w.word),el('small',`${L('wordErrors')}: ${w.count}`));
        const ids=Object.keys(w.sentences).map(Number).filter(i=>data[i]);
        row.append(copy,btn(L('open'),()=>startReview(ids)));
        list.append(row)
      }
    }else{
      const ids=reviewTab==='due'?due():reviewTab==='wrong'?wrong():entries.sort((a,b)=>b[1].lastAt-a[1].lastAt).map(([i])=>i);
      if(reviewTab==='due')body.append(el('p',L('schedule'),'plus-note'));
      if(ids.length&&reviewTab!=='history')body.append(btn(`${L('start')} (${ids.length})`,()=>startReview(ids),'plus-action'));
      if(!ids.length)list.append(el('p',entries.length?L('allGood'):L('empty'),'plus-note'));
      for(const i of ids){
        const r=state.sentences[i],row=el('div',undefined,'plus-item'),copy=el('div');
        copy.append(el('strong','#'+pad(i+1)),el('small',`${L('last')} ${r.lastCorrect}/${r.lastTotal} · ${L('attempts')} ${r.attempts} · ${L('nextDue')}: ${fmt(r.due)}`));
        if(reviewTab==='history'){
          const d=el('details'),summary=el('summary',L('history'));
          d.append(summary);
          for(const h of r.history){
            const line=el('small',`${new Date(h.at).toLocaleString()} · ${h.source==='exam'?L('exam'):tr('받아쓰기')} · ${h.correct}/${h.total} · ${h.answer||L('blank')}`);
            d.append(line)
          }
          copy.append(d)
        }
        row.append(copy,btn(L('open'),()=>startReview([i])));
        list.append(row)
      }
    }
    body.append(list,el('p',saveFailed?L('unsaved'):L('local'),'plus-note'));
    const reset=btn(L('resetAll'),resetAll,'plus-reset');
    reset.id='resetAllHistory';
    body.append(reset)
  }
function resetAll(){
    if(!confirm(L('resetConfirm')))return;
    halt();
    state={sentences:{},weak:{}};
    clearDone();
    reviewQueue=[];
    reviewPos=0;
    reviewTab='due';
    let failed=false;
    try{
      localStorage.setItem(STORE,JSON.stringify(state))
    }catch(e){
      failed=true
    }
    try{
      localStorage.setItem('wfd191_done','{}')
    }catch(e){
      failed=true
    }
    saveFailed=failed;
    if(reviewActive){
      const snap=normalSnapshot;
      setReviewActive(false);
      setNormalSnapshot(null);
      $('studyNavigator').hidden=false;
      if(snap){
        applyPlaybackPrefs(snap.playback);
        selectStudyMode(snap.mode)
      }
    }
    setStudyDay(0);
    buildDays();
    load(0);
    refreshModeControls();
    $('status').textContent=tr('준비');
    refresh();
    renderReview();
    if(failed)alert(L('resetFailed'))
  }
$('reviewOpen').onclick=()=>navigatePage('review');
  $('reviewClose').onclick=()=>navigatePage('study');
document.addEventListener('wfd-attempt',e=>record(e.detail.index,e.detail.answer,e.detail.grade,'practice'));
document.addEventListener('wfd-loaded',()=>{
    if(reviewQueue.length&&!reviewMoving&&idx!==reviewQueue[reviewPos])endReview();
    refresh()
  });
$('typed').addEventListener('input',refresh);
  $('check').addEventListener('click',()=>{
    refreshUXStage();
    if(gradedDraft!==null){
      $('result').setAttribute('tabindex','-1');
      $('result').focus({preventScroll:true})
    }
  });
  $('memorizeMode').addEventListener('click',()=>{
    if(reviewQueue.length)exitReview();else refresh()
  });
  $('dictationMode').addEventListener('click',refresh);
  $('language').addEventListener('change',()=>{
    refresh();
    if(!dialog.hidden)renderReview();
    if(!exam.hidden){
      if(test?.phase==='results')examResults();else if(!test)examLanding()
    }
  });
// Exam is isolated from the practice audio, controls, and shortcuts.
const exam=$('examDialog'),eb=$('examBody'),ea=$('examAudio');
  let test=null,clock=null,epoch=0;
function stopExamAudio(){
    epoch++;
    clearInterval(clock);
    clock=null;
    ea.pause();
    ea.removeAttribute('src');
    ea.load()
  }
function examLanding(){
    stopExamAudio();
    test=null;
    $('examClose').hidden=true;
    $('language').disabled=false;
    $('examTitle').textContent=L('exam');
    eb.replaceChildren(el('p',L('examIntro')),btn(L('examStart'),beginExam,'plus-action'))
  }
function beginExam(){
    $('examClose').hidden=false;
    $('language').disabled=true;
    const ids=Array.from({length:data.length},(_,i)=>i);
    for(let i=ids.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [ids[i],ids[j]]=[ids[j],ids[i]]
    }
    test={ids:ids.slice(0,4),pos:0,answers:[],phase:'active'};
    examQuestion()
  }
function examQuestion(){
    stopExamAudio();
    const token=epoch,i=test.ids[test.pos];
    eb.replaceChildren();
    $('examTitle').textContent=L('exam')+` · ${test.pos+1} / ${test.ids.length}`;
    const status=el('div',L('listening'),'exam-status');
    status.setAttribute('role','status');
    const input=el('textarea');
    input.placeholder=L('answer');
    input.setAttribute('aria-label',L('answer'));
    input.spellcheck=false;
    input.autocapitalize='off';
    input.autocomplete='off';
    const submit=btn(test.pos===test.ids.length-1?L('finish'):L('submit'),finishQuestion,'plus-action');
    submit.disabled=true;
    eb.append(status,input,submit);
    let started=false,finished=false;
    ea.src=audioUrl(i);
    ea.playbackRate=1;
    ea.onended=()=>{
      if(token!==epoch||finished||!test||test.phase!=='active')return;
      finished=true;
      submit.disabled=false;
      const deadline=Date.now()+60000;
      const tick=()=>{
        if(token!==epoch)return;
        const rem=Math.max(0,Math.ceil((deadline-Date.now())/1000));
        status.textContent=L('answer')+' · '+Math.floor(rem/60)+':'+String(rem%60).padStart(2,'0');
        if(!rem)finishQuestion()
      };
      tick();
      clock=setInterval(tick,250)
    };
function go(){
      if(token!==epoch||started)return;
      status.textContent=L('listening');
      ea.play().then(()=>{
        if(token===epoch)started=true
      }).catch(()=>{
        if(token!==epoch)return;
        status.replaceChildren(el('span',L('blocked')),btn(L('retry'),go))
      })
    }
    go();
function finishQuestion(){
      if(token!==epoch||!finished||!test||test.phase!=='active')return;
      const answer=input.value,grade=alignDictation(data[i].en,answer);
      test.answers.push({i,answer,grade});
      if(test.pos+1<test.ids.length){
        test.pos++;
        examQuestion()
      }else{
        test.phase='results';
        stopExamAudio();
        for(const r of test.answers)record(r.i,r.answer,r.grade,'exam');
        examResults()
      }
    }
}
function examResults(){
    $('examClose').hidden=true;
    $('language').disabled=false;
    const answers=test.answers;
    $('examTitle').textContent=L('results');
    eb.replaceChildren();
    const c=answers.reduce((a,r)=>a+r.grade.correct,0),n=answers.reduce((a,r)=>a+r.grade.total,0);
    eb.append(el('div',`${c} / ${n} · ${percent(c,n)}`,'exam-score'),el('p',gradeLabels[lang]?.[5]||gradeLabels.en[5],'plus-note'),el('p',saveFailed?L('unsaved'):L('examSaved'),'plus-note'));
    for(const {i,answer,grade} of answers){
      const card=el('div',undefined,'exam-answer');
      card.append(el('strong',`#${pad(i+1)} · ${grade.correct}/${grade.total}`),el('p',answer||L('blank'),'plus-note'));
      const line=el('p');
      for(const op of grade.ops){
        if(line.childNodes.length)line.append(' ');
        if(op.kind==='correct')line.append(el('span',op.got,'good'));else{
          if(op.got)line.append(el('s',op.got,'bad'));
          if(op.ref)line.append(' ',el('span','('+op.ref+')','bad'))
        }
      }
      card.append(line,el('p',data[i].en));
      if(lang!=='en')card.append(el('small',answerTranslation(data[i]),'plus-note'));
      eb.append(card)
    }
    eb.append(btn(L('examStart'),examLanding,'plus-action'))
  }
function navigatePage(next){
    if(next===page){
      if(next==='review'&&reviewActive){
        if(!allowLeave())return;
        endReview();
        renderReview();
        setPage('review')
      }
      return
    }
    if(page==='exam'&&test?.phase==='active'&&!confirm(L('leave')))return;
    if(reviewActive&&!allowLeave())return;
    if(page==='study'&&next==='exam'&&!allowLeave())return;
    if(page==='exam'){
      stopExamAudio();
      test=null;
      $('language').disabled=false
    }
    if(reviewActive)endReview();
    halt();
    if(next==='review')renderReview();
    if(next==='exam')examLanding();
    setPage(next)
  }
  $('examOpen').onclick=()=>navigatePage('exam');
  $('examClose').onclick=()=>navigatePage('study');
// Keep due counts current when returning to the tab.
document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      refresh();
      if(!dialog.hidden)renderReview()
    }
  });
  refresh();
})();
