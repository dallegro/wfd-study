import { tr, languageCodes, lang } from './locales.js';
import { data, audioUrl } from './sentences.js';
import { alignDictation } from './scoring.js';
import { normalizeTyping } from './typing-model.js';
import { readStored, writeStored } from './storage.js';
import { normalizeLearning, normalizeDone, recordAttempt, dueIndices, migratePositions, scheduleMemorised } from './review-model.js';
import {
  $, idx, reviewActive, refreshUXStage, wordClip, endWordClip, cancelRun, a,
  gradedDraft, reveal, replayCurrent, halt, normalSnapshot, applyPlaybackPrefs,
  goal, buildDays, selectStudyMode, load, refreshModeControls, allowLeave, selectMode,
  studyMode, playbackPrefs, storePosition, storePlayback, showSentenceList, start,
  pad, done, renderGradeContent, gradeLabels, answerTranslation, setReviewActive, setNormalSnapshot,
  setStudyDay, clearGradedDraft, clearDone, clearTyping
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
examSaved:['연습 결과가 복습 기록에 저장되었습니다.','Results added to your review history.','Gidugang ang resulta sa rekord.','結果を復習履歴に追加しました。','结果已加入复习记录。','परिणाम इतिहास में जोड़े गए।','Resultados añadidos al historial.','Đã thêm kết quả vào lịch sử.','नतिजा इतिहासमा थपियो।','Nadagdag ang resulta sa tala.'],
blank:['미입력','No answer','Walay tubag','未回答','未作答','कोई उत्तर नहीं','Sin respuesta','Chưa trả lời','उत्तर छैन','Walang sagot'],
reviewDone:['복습 목록 완료','Review queue complete','Nahuman ang pagbalik','復習リスト完了','复习列表完成','दोहराव सूची पूरी','Lista de repaso completada','Hoàn thành danh sách ôn','पुनरावृत्ति सूची पूरा','Tapos ang listahan'],
};
Object.assign(lex,{"resetAll": ["전체 학습 기록 초기화", "Reset all learning history", "I-reset ang tanang rekord sa pagtuon", "すべての学習履歴をリセット", "重置所有学习记录", "सभी अध्ययन रिकॉर्ड रीसेट करें", "Restablecer todo el historial", "Đặt lại toàn bộ lịch sử học", "सबै अध्ययन रेकर्ड रिसेट गर्नुहोस्", "I-reset ang lahat ng tala ng pag-aaral"], "resetConfirm": ["암기 완료, 받아쓰기·실전 채점 이력, 오답, 복습 일정, 취약 단어 기록을 모두 삭제할까요? 현재 답안도 지워집니다. 설정은 유지되며 이 작업은 되돌릴 수 없습니다.", "Delete all memorised marks, dictation and exam history, mistakes, review schedules and weak-word records? The current answer will also be cleared. Settings will be kept. This cannot be undone.", "Papason ang tanang marka sa memorya, rekord sa dictation ug exam, sayop, iskedyul sa pagbalik ug lisod nga mga pulong? Papason usab ang tubag karon. Magpabilin ang settings. Dili kini mabawi.", "暗記済みの印、書き取り・試験履歴、誤答、復習予定、苦手単語をすべて削除しますか？現在の回答も消去します。設定は保持され、元に戻せません。", "删除所有已记忆标记、听写和模拟考试记录、错题、复习计划及薄弱单词？当前答案也将清除。设置保留，此操作无法撤销。", "सभी याद किए गए चिह्न, श्रुतलेख और परीक्षा इतिहास, गलतियाँ, पुनरावृत्ति कार्यक्रम और कमजोर शब्द हटाएँ? वर्तमान उत्तर भी मिटेगा। सेटिंग्स बनी रहेंगी। इसे वापस नहीं किया जा सकता।", "¿Borrar todas las marcas de memorización, el historial de dictados y exámenes, los errores, el calendario de repaso y las palabras difíciles? También se borrará la respuesta actual. Se conservarán los ajustes. No se puede deshacer.", "Xóa mọi dấu đã ghi nhớ, lịch sử nghe chép và thi thử, lỗi sai, lịch ôn và từ yếu? Câu trả lời hiện tại cũng sẽ bị xóa. Giữ nguyên cài đặt. Không thể hoàn tác.", "कण्ठ गरेका चिन्ह, श्रुतलेखन र परीक्षा इतिहास, गल्ती, पुनरावृत्ति तालिका र कमजोर शब्द सबै मेटाउने? हालको उत्तर पनि मेटिनेछ। सेटिङ यथावत् रहनेछ। यो उल्टाउन मिल्दैन।", "Burahin ang lahat ng marka ng pagsasaulo, kasaysayan ng diktasyon at pagsusulit, mga mali, iskedyul ng balik-aral at mahihinang salita? Mabubura rin ang kasalukuyang sagot. Mananatili ang settings. Hindi ito mababawi."], "resetFailed": ["저장된 기록 초기화에 실패했어요. 현재 화면만 초기화되었으며 새로고침하면 이전 기록이 남아 있을 수 있습니다.", "Could not reset saved records. This session is cleared, but previous records may return after reload.", "Dili ma-reset ang gitipig nga rekord. Posibleng mobalik kini human sa reload.", "保存済みの履歴をリセットできませんでした。再読み込みすると以前の記録が戻る場合があります。", "无法重置已保存记录。刷新后旧记录可能恢复。", "सहेजे गए रिकॉर्ड रीसेट नहीं हुए। रीलोड के बाद पुराने रिकॉर्ड लौट सकते हैं।", "No se pudo borrar el historial guardado. Puede reaparecer al recargar.", "Không thể xóa dữ liệu đã lưu. Dữ liệu cũ có thể trở lại khi tải lại.", "सुरक्षित रेकर्ड रिसेट भएन। पुनः लोड गर्दा पुराना रेकर्ड फर्कन सक्छन्।", "Hindi nabura ang naka-save na tala. Maaaring bumalik ang mga ito kapag ni-reload."]});
Object.assign(lex,{"dueStat": ["복습할 문장", "Due sentences", "Mga sentence nga balikon", "復習する文", "待复习句子", "दोहराने वाले वाक्य", "Frases pendientes", "Câu cần ôn", "दोहोर्‍याउने वाक्य", "Mga pangungusap na babalikan"], "attempts": ["채점 횟수", "Graded attempts", "Nasusi nga pagsulay", "採点回数", "评分次数", "जाँचे गए प्रयास", "Intentos corregidos", "Lượt chấm", "जाँचिएका प्रयास", "Mga na-check na sagot"], "accuracy": ["누적 단어 정답률", "Overall word accuracy", "Kinatibuk-ang katukma", "累計単語正答率", "累计单词正确率", "कुल शब्द सटीकता", "Acierto global de palabras", "Độ chính xác từ tích lũy", "कुल शब्द शुद्धता", "Kabuuang katumpakan ng salita"], "last": ["최근 정답", "Last correct", "Kataposang sakto", "前回正解", "上次正确", "पिछले सही", "Últimos aciertos", "Số từ đúng gần nhất", "पछिल्लो सही", "Huling tama"], "open": ["연습하기", "Practise", "Praktis", "練習する", "练习", "अभ्यास करें", "Practicar", "Luyện tập", "अभ्यास गर्नुहोस्", "Magsanay"], "notGraded": ["아직 채점 기록 없음", "Not graded yet", "Wala pa masusi", "未採点", "尚未评分", "अभी जाँचा नहीं", "Sin corregir", "Chưa chấm", "अझै जाँचिएको छैन", "Hindi pa na-check"], "wordErrors": ["누적 오류", "Total errors", "Tanang sayop", "累計エラー", "累计错误", "कुल त्रुटियाँ", "Errores acumulados", "Tổng lỗi", "कुल गल्ती", "Kabuuang mali"], "weakStart": ["취약 문장 연습", "Practise weak sentences", "Praktis sa lisod nga sentence", "苦手な文を練習", "练习薄弱句子", "कमज़ोर वाक्यों का अभ्यास", "Practicar frases difíciles", "Luyện câu còn yếu", "कमजोर वाक्य अभ्यास", "Sanayin ang mahihinang pangungusap"], "weakEmpty": ["최근 채점에서 틀린 단어가 없습니다.", "No words missed in the latest graded answers.", "Walay sayop sa kataposang tubag.", "前回の採点で間違えた単語はありません。", "最近评分中没有错误单词。", "पिछले जाँचे उत्तरों में कोई गलत शब्द नहीं।", "Sin palabras erróneas en las últimas respuestas corregidas.", "Không có từ sai trong các câu vừa chấm.", "पछिल्ला जाँचिएका उत्तरमा गलत शब्द छैन।", "Walang maling salita sa mga huling na-check na sagot."], "position": ["단어 위치", "Word position", "Posisyon sa pulong", "単語の位置", "单词位置", "शब्द की स्थिति", "Posición de palabra", "Vị trí từ", "शब्दको स्थान", "Posisyon ng salita"], "skip": ["건너뛰기", "Skip", "Laktawi", "スキップ", "跳过", "छोड़ें", "Omitir", "Bỏ qua", "छोड्नुहोस्", "Laktawan"], "complete": ["복습 완료", "Finish review", "Humanon ang pagbalik", "復習完了", "完成复习", "दोहराव पूरा करें", "Finalizar repaso", "Hoàn tất ôn tập", "पुनरावृत्ति पूरा", "Tapusin ang balik-aral"], "skipped": ["건너뛴 문장", "Skipped sentences", "Gilaktawang sentence", "スキップした文", "跳过的句子", "छोड़े गए वाक्य", "Frases omitidas", "Câu đã bỏ qua", "छोडिएका वाक्य", "Mga nilaktawang pangungusap"], "manage": ["기록 관리", "Manage records", "Pagdumala sa rekord", "記録管理", "记录管理", "रिकॉर्ड प्रबंधन", "Gestionar registros", "Quản lý dữ liệu", "रेकर्ड व्यवस्थापन", "Pamahalaan ang tala"], "export": ["기록 내보내기", "Export records", "I-export ang rekord", "記録を書き出す", "导出记录", "रिकॉर्ड निर्यात", "Exportar registros", "Xuất dữ liệu", "रेकर्ड निर्यात", "I-export ang tala"], "import": ["기록 불러오기", "Import records", "I-import ang rekord", "記録を読み込む", "导入记录", "रिकॉर्ड आयात", "Importar registros", "Nhập dữ liệu", "रेकर्ड आयात", "I-import ang tala"], "importConfirm": ["현재 학습 기록을 백업 파일의 기록으로 교체할까요?", "Replace current learning records with this backup?", "Ilisan ang rekord sa backup?", "現在の学習記録をバックアップで置き換えますか？", "用备份替换当前学习记录？", "मौजूदा रिकॉर्ड को बैकअप से बदलें?", "¿Reemplazar los registros actuales con la copia?", "Thay dữ liệu hiện tại bằng bản sao lưu?", "हालको रेकर्ड ब्याकअपबाट बदल्ने?", "Palitan ang kasalukuyang tala ng backup?"], "importFailed": ["기록을 불러오지 못했습니다. 파일과 저장 공간을 확인하세요.", "Import failed. Check the file and storage.", "Napakyas ang import. Susiha ang file ug storage.", "読み込みに失敗しました。ファイルと容量を確認してください。", "导入失败，请检查文件和存储空间。", "आयात विफल। फ़ाइल और संग्रहण जाँचें।", "No se pudo importar. Comprueba el archivo y el almacenamiento.", "Không thể nhập. Kiểm tra tệp và bộ nhớ.", "आयात असफल। फाइल र भण्डारण जाँच्नुहोस्।", "Hindi na-import. Suriin ang file at storage."], "examStart": ["실전 연습 시작", "Start practice", "Sugdi ang praktis", "実戦練習を開始", "开始实战练习", "परीक्षा अभ्यास शुरू", "Iniciar simulación", "Bắt đầu luyện thi", "परीक्षा अभ्यास सुरु", "Simulan ang pagsasanay"], "finish": ["제출하기", "Submit", "Isumite", "提出する", "提交", "जमा करें", "Enviar", "Nộp bài", "पेश गर्नुहोस्", "Ipasa"], "results": ["실전 연습 결과", "Practice results", "Resulta sa praktis", "実戦練習結果", "实战练习结果", "अभ्यास परिणाम", "Resultados de práctica", "Kết quả luyện thi", "अभ्यास नतिजा", "Resulta ng pagsasanay"], "again": ["다시 연습하기", "Practise again", "Praktis pag-usab", "もう一度練習", "再次练习", "फिर अभ्यास करें", "Practicar de nuevo", "Luyện lại", "फेरि अभ्यास", "Magsanay muli"], "audioFailed": ["음원 재생이 중단되었습니다. 공정한 연습을 위해 이번 실전 연습은 저장하지 않습니다.", "Audio was interrupted. This practice session will not be saved.", "Naputol ang audio. Dili i-save ang session.", "音声が中断されました。今回の練習は保存されません。", "音频播放中断，本次练习不会保存。", "ऑडियो बाधित हुआ। यह अभ्यास सहेजा नहीं जाएगा।", "El audio se interrumpió. No se guardará esta sesión.", "Âm thanh bị gián đoạn. Lượt này không được lưu.", "अडियो रोकियो। यो अभ्यास सुरक्षित हुँदैन।", "Naputol ang audio. Hindi ise-save ang session."], "perfectSentences": ["완벽한 문장", "Perfect sentences", "Saktong mga sentence", "完全正解の文", "完全正确句子", "पूर्ण सही वाक्य", "Frases perfectas", "Câu đúng hoàn toàn", "पूर्ण सही वाक्य", "Ganap na tamang pangungusap"], "noAnswerConfirm": ["답안 없이 제출할까요?", "Submit without an answer?", "Isumite nga walay tubag?", "未回答のまま提出しますか？", "提交空白答案？", "बिना उत्तर जमा करें?", "¿Enviar sin respuesta?", "Nộp khi chưa trả lời?", "उत्तर बिना पेश गर्ने?", "Ipasa nang walang sagot?"]});
Object.assign(lex,{"accuracy": ["누적 단어 정답률", "Overall word accuracy", "Kinatibuk-ang katukma", "累計単語正答率", "累计单词正确率", "कुल शब्द सटीकता", "Acierto acumulado", "Độ chính xác tích lũy", "कुल शब्द शुद्धता", "Kabuuang katumpakan"], "sessionAccuracy": ["이번 연습 정답률", "Session accuracy", "Katukma niining praktis", "今回の正答率", "本次正确率", "इस अभ्यास की सटीकता", "Acierto de esta práctica", "Độ chính xác lượt này", "यस अभ्यासको शुद्धता", "Katumpakan sa pagsasanay"], "open": ["연습하기", "Practise", "Praktis", "練習する", "练习", "अभ्यास करें", "Practicar", "Luyện tập", "अभ्यास गर्नुहोस्", "Magsanay"], "wordErrors": ["누적 오류", "Total errors", "Tanang sayop", "累計誤答", "累计错误", "कुल गलतियाँ", "Errores acumulados", "Lỗi tích lũy", "कुल त्रुटि", "Kabuuang mali"], "weakStart": ["취약 문장 연습", "Practise weak sentences", "Praktis sa lisod nga sentence", "苦手な文を練習", "练习薄弱句子", "कमज़ोर वाक्यों का अभ्यास", "Practicar frases difíciles", "Luyện câu còn yếu", "कमजोर वाक्य अभ्यास", "Magsanay sa mahirap na pangungusap"], "weakCount": ["오류가 남은 문장", "Sentences with mistakes", "Sentence nga naay sayop", "誤答が残る文", "仍有错误的句子", "गलतियों वाले वाक्य", "Frases con errores", "Câu còn lỗi", "त्रुटि भएका वाक्य", "Mga pangungusap na may mali"], "reviewDone": ["복습 결과", "Review summary", "Resulta sa pagbalik", "復習結果", "复习结果", "दोहराव का परिणाम", "Resultado del repaso", "Kết quả ôn tập", "पुनरावृत्ति नतिजा", "Resulta ng balik-aral"], "checkedSentences": ["채점한 문장", "Sentences checked", "Nasusi nga sentence", "採点した文", "已评分句子", "जाँचे गए वाक्य", "Frases corregidas", "Câu đã chấm", "जाँचिएका वाक्य", "Mga nasuring pangungusap"], "noWrong": ["최근 채점에서 틀린 문장이 없습니다.", "No mistakes in your latest answers.", "Walay sayop sa kataposang tubag.", "直近の解答に誤りはありません。", "最近的答案没有错误。", "हाल के उत्तरों में गलतियाँ नहीं हैं।", "No hay errores en tus últimas respuestas.", "Không có lỗi trong câu trả lời gần nhất.", "पछिल्ला उत्तरमा त्रुटि छैन।", "Walang mali sa mga huling sagot."], "notYet": ["아직 채점 기록이 없습니다.", "No graded answers yet.", "Wala pay nasusi nga tubag.", "まだ採点記録がありません。", "还没有评分记录。", "अभी कोई जाँचा गया उत्तर नहीं है।", "Aún no hay respuestas corregidas.", "Chưa có câu trả lời được chấm.", "अहिले जाँचिएका उत्तर छैनन्।", "Wala pang nasuring sagot."], "showMore": ["더 보기", "Show more", "Tan-awa pa", "もっと見る", "查看更多", "और देखें", "Ver más", "Xem thêm", "थप हेर्नुहोस्", "Tingnan pa"], "wordContext": ["해당 문장", "Related sentences", "Mga sentence", "関連する文", "相关句子", "संबंधित वाक्य", "Frases relacionadas", "Câu liên quan", "सम्बन्धित वाक्य", "Mga kaugnay na pangungusap"], "finish": ["제출", "Submit", "Isumite", "提出", "提交", "जमा करें", "Enviar", "Nộp", "पेश गर्नुहोस्", "Ipasa"], "examStart": ["시작하기", "Start", "Sugdi", "開始", "开始", "शुरू करें", "Empezar", "Bắt đầu", "सुरु गर्नुहोस्", "Magsimula"], "examIntroTitle": ["WFD 실전 연습", "WFD practice", "WFD praktis", "WFD実戦練習", "WFD 实战练习", "WFD अभ्यास", "Práctica WFD", "Luyện WFD", "WFD अभ्यास", "WFD pagsasanay"], "examQuestions": ["문장", "Sentences", "Mga sentence", "文", "句子", "वाक्य", "Frases", "Câu", "वाक्य", "Pangungusap"], "examPlayback": ["문장당 듣기", "Plays per sentence", "Playback matag sentence", "1文の再生回数", "每句播放", "प्रति वाक्य ऑडियो", "Reproducciones por frase", "Lượt nghe mỗi câu", "प्रति वाक्य अडियो", "Pakikinig bawat pangungusap"], "examTime": ["문장당 답안 시간", "Answer time per sentence", "Oras sa tubag", "1文の解答時間", "每句作答时间", "प्रति वाक्य उत्तर समय", "Tiempo por frase", "Thời gian mỗi câu", "प्रति वाक्य उत्तर समय", "Oras bawat sagot"], "examRule": ["무작위로 출제되며, 제출한 답안은 수정할 수 없습니다. 결과는 연습을 마친 후 확인하세요.", "Sentences are random. Answers cannot be edited after submission. Results appear at the end.", "Random ang sentence. Dili mausab ang gisumite. Resulta sa kataposan.", "文はランダムに出題されます。提出後は修正できません。結果は最後に表示します。", "随机出题，提交后不可修改，结束后查看结果。", "वाक्य यादृच्छिक हैं। जमा करने के बाद बदलाव नहीं। नतीजे अंत में।", "Frases al azar. No se pueden editar respuestas enviadas. Resultados al final.", "Câu được chọn ngẫu nhiên. Không sửa sau khi nộp. Xem kết quả cuối lượt.", "वाक्य अनियमित छन्। पेश गरेपछि सम्पादन हुँदैन। नतिजा अन्त्यमा।", "Random ang pangungusap. Hindi na mababago ang isinumite. Sa huli ang resulta."], "examDisclaimer": ["WFD 연습용이며 Pearson 공식 시험이 아닙니다.", "WFD practice, not an official Pearson test.", "WFD praktis, dili opisyal nga Pearson test.", "WFD練習用です。Pearson公式試験ではありません。", "仅供 WFD 练习，非 Pearson 官方考试。", "WFD अभ्यास है, आधिकारिक Pearson परीक्षा नहीं।", "Práctica WFD, no es un examen oficial de Pearson.", "Luyện WFD, không phải kỳ thi Pearson chính thức.", "WFD अभ्यास हो, आधिकारिक Pearson परीक्षा होइन।", "WFD practice, hindi opisyal na Pearson test."], "question": ["문제", "Question", "Pangutana", "問題", "题目", "प्रश्न", "Pregunta", "Câu hỏi", "प्रश्न", "Tanong"], "listening": ["음원을 듣고 답안을 작성하세요.", "Listen and type your answer.", "Paminaw ug isulat ang tubag.", "音声を聞いて解答してください。", "听音频并输入答案。", "ऑडियो सुनें और उत्तर लिखें।", "Escucha y escribe tu respuesta.", "Nghe và nhập câu trả lời.", "अडियो सुनेर उत्तर लेख्नुहोस्।", "Makinig at i-type ang sagot."], "answerTime": ["남은 시간", "Time remaining", "Nahibiling oras", "残り時間", "剩余时间", "शेष समय", "Tiempo restante", "Thời gian còn lại", "बाँकी समय", "Natitirang oras"], "answer": ["문장을 입력하세요", "Type the sentence", "Isulat ang sentence", "文を入力", "输入句子", "वाक्य लिखें", "Escribe la frase", "Nhập câu", "वाक्य लेख्नुहोस्", "I-type ang pangungusap"], "perfectSentences": ["완전 정답", "Perfect sentences", "Saktong sentence", "完全正解", "全对句子", "पूर्ण सही वाक्य", "Frases perfectas", "Câu đúng hoàn toàn", "पूर्ण सही वाक्य", "Ganap na tama"], "examDetails": ["문장별 결과", "Sentence results", "Resulta matag sentence", "文ごとの結果", "逐句结果", "वाक्यवार परिणाम", "Resultados por frase", "Kết quả từng câu", "वाक्यगत नतिजा", "Resulta bawat pangungusap"], "correctAnswer": ["정답", "Correct answer", "Saktong tubag", "正解", "正确答案", "सही उत्तर", "Respuesta correcta", "Đáp án đúng", "सही उत्तर", "Tamang sagot"], "completed": ["연습 완료", "Practice complete", "Human ang praktis", "練習完了", "练习完成", "अभ्यास पूरा", "Práctica completada", "Hoàn thành", "अभ्यास पूरा", "Tapos na ang pagsasanay"], "reviewSaved": ["채점한 문장은 복습 기록에 반영됩니다.", "Checked answers are saved to review history.", "Ang nasusi nga tubag i-save sa rekord.", "採点した解答は復習履歴に保存されます。", "已评分的答案会保存到复习记录。", "जाँचे गए उत्तर इतिहास में सहेजे जाते हैं।", "Las respuestas corregidas se guardan en el historial.", "Câu đã chấm được lưu vào lịch sử ôn tập.", "जाँचिएका उत्तर इतिहासमा सुरक्षित हुन्छन्।", "Naka-save sa tala ang mga nasuring sagot."]});
Object.assign(lex,{endPractice:["연습 종료", "End practice", "Taposa ang praktis", "練習終了", "结束练习", "अभ्यास समाप्त", "Salir de la práctica", "Kết thúc luyện tập", "अभ्यास अन्त्य", "Tapusin ang pagsasanay"]});
Object.assign(lex,{"singleReview": ["개별 연습", "Single sentence practice", "Usa ka sentence", "1文の練習", "单句练习", "एक वाक्य का अभ्यास", "Práctica de una frase", "Luyện một câu", "एक वाक्य अभ्यास", "Pagsasanay sa isang pangungusap"], "queueProgress": ["{total}문장 중 {current}번째", "Sentence {current} of {total}", "Sentence {current} sa {total}", "{total}文中{current}文目", "第{current}句，共{total}句", "{total} में से वाक्य {current}", "Frase {current} de {total}", "Câu {current}/{total}", "{total} मध्ये वाक्य {current}", "Pangungusap {current} sa {total}"], "needsReview": ["복습 필요", "Needs review", "Kinahanglang balikon", "要復習", "需要复习", "दोहराना आवश्यक", "Necesita repaso", "Cần ôn tập", "पुनरावृत्ति आवश्यक", "Kailangang balikan"], "listening": ["음원 재생 중", "Playing audio", "Nagpatukar", "音声再生中", "音频播放中", "ऑडियो चल रहा है", "Reproduciendo audio", "Đang phát âm thanh", "अडियो बज्दै छ", "Nagpe-play ang audio"], "results": ["연습 결과", "Practice results", "Resulta sa praktis", "練習結果", "练习结果", "अभ्यास परिणाम", "Resultados de práctica", "Kết quả luyện tập", "अभ्यास नतिजा", "Resulta ng pagsasanay"], "examIntroTitle": ["실전 연습", "Practice", "Praktis", "模擬練習", "模拟练习", "अभ्यास", "Práctica", "Luyện thi", "अभ्यास", "Pagsasanay"], "historyDue": ["다음 복습: {date}", "Next review: {date}", "Sunod nga balik: {date}", "次回復習: {date}", "下次复习：{date}", "अगला दोहराव: {date}", "Próximo repaso: {date}", "Lần ôn tiếp: {date}", "अर्को पुनरावृत्ति: {date}", "Susunod na balik: {date}"]});
Object.assign(lex,{"open": ["복습하기", "Review", "Balika", "復習する", "复习", "दोहराएँ", "Repasar", "Ôn tập", "दोहोर्‍याउनुहोस्", "Balikan"], "start": ["전체 복습", "Review all", "Balika tanan", "すべて復習", "全部复习", "सभी दोहराएँ", "Repasar todo", "Ôn tập tất cả", "सबै दोहोर्‍याउनुहोस्", "Balikan lahat"], "wordColumn": ["단어", "Word", "Pulong", "単語", "单词", "शब्द", "Palabra", "Từ", "शब्द", "Salita"], "weakEmpty": ["아직 단어 오류 기록이 없습니다.", "No word errors recorded yet.", "Wala pay natala nga sayop sa pulong.", "まだ単語の誤答記録がありません。", "暂无单词错误记录。", "अभी शब्दों की त्रुटियाँ दर्ज नहीं हैं।", "Aún no hay errores de palabras registrados.", "Chưa ghi nhận lỗi từ.", "अझै शब्दको गल्ती रेकर्ड छैन।", "Wala pang naitalang maling salita."]});
const L=k=>k==='exam'?tr('실전 연습'):k==='review'?tr('복습'):k==='detail'?tr('상세 기록'):k==='retryWrong'?tr('오답 다시 풀기'):(lex[k]?.[languageCodes.indexOf(lang)]||lex[k]?.[1]||k);
const STORE = 'wfd191_learning_v1';
let state = migratePositions(normalizeLearning(readStored(STORE), data.length),data);
for(const [id,marked] of Object.entries(done))if(marked)scheduleMemorised(state,Number(id),true);

let saveFailed = !writeStored(STORE,state);
let reviewSkipped=0,reviewChecked=0,reviewNotice='';

function record(index, answer, grade, source) {
  recordAttempt(state, index, answer, grade, source);
  saveFailed = !writeStored(STORE, state);
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
const recs=()=>Object.entries(state.sentences).filter(([i,r])=>Number.isInteger(+i)&&+i>=0&&+i<data.length&&r&&(r.attempts>0||r.scheduled)).map(([i,r])=>[+i,r]);
const due = () => dueIndices(state);
const wrong=()=>recs().filter(([,r])=>r.attempts>0&&!r.lastPerfect).sort((a,b)=>b[1].lastAt-a[1].lastAt).map(([i])=>i);
const locale=()=>lang==='ceb'?'en-PH':lang==='fil'?'fil-PH':lang;
const fmt=t=>{if(t<=Date.now())return L('now');const today=new Date(),target=new Date(t);const days=Math.round((Date.UTC(target.getFullYear(),target.getMonth(),target.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);if(days===0||days===1)return new Intl.RelativeTimeFormat(locale(),{numeric:'auto'}).format(days,'day');return target.toLocaleDateString(locale(),{month:'short',day:'numeric',year:'numeric'});};
const stamp=t=>new Date(t).toLocaleString(locale(),{dateStyle:'medium',timeStyle:'short'});
const number=i=>'#'+String(i+1).padStart(3,'0');
const scoreText=(r)=>r.attempts?`${r.lastCorrect}/${r.lastTotal}`:'—';
const counted=n=>lang==='ko'?`${n}문장`:lang==='ja'?`${n}文`:lang==='zh'?`${n}句`:`${n} ${L('examQuestions')}`;
const actionCount=(label,n)=>`${label} · ${counted(n)}`;
function paged(parent,items,render,limit=10){let offset=0;const more=btn(L('showMore'),add,'flow-more');function add(){const end=Math.min(offset+limit,items.length);for(;offset<end;offset++)parent.insertBefore(render(items[offset]),more);more.hidden=offset>=items.length;}parent.append(more);add();}
function onlyOneOpen(parent,selector){parent.addEventListener('toggle',e=>{if(e.target.matches(selector)&&e.target.open)for(const d of parent.querySelectorAll(selector+'[open]'))if(d!==e.target)d.open=false;},true);}
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
    $('attemptSummary').hidden=true;
    $('attemptSummary').textContent='';
$('reviewSession').hidden=!reviewQueue.length;
    $('studyMode').hidden=reviewActive;
    $('scopeLabel').hidden=reviewActive||studyMode==='typing';
    $('play').closest('.scope-options').hidden=reviewActive||studyMode==='typing';
    $('dayPlay').disabled=reviewActive||studyMode==='typing';
    const progressLabel=reviewQueue.length>1?L('queueProgress').replace('{total}',String(reviewQueue.length)).replace('{current}',String(reviewPos+1)):L('singleReview');
    $('reviewPosition').textContent=progressLabel;
    const meter=$('reviewMeter');meter.hidden=reviewQueue.length<=1;meter.max=Math.max(1,reviewQueue.length);meter.value=Math.min(reviewQueue.length,reviewPos+(gradedDraft!==null?1:0));
    $('reviewNext').textContent=gradedDraft===null?L('skip'):reviewPos+1>=reviewQueue.length?L('complete'):tr('다음 문장');
    $('mark').hidden=reviewActive;
    $('reviewPosition').setAttribute('aria-label',progressLabel);meter.setAttribute('aria-label',progressLabel);
    $('reviewExit').setAttribute('aria-label',tr('복습 종료'));
    $('reviewExit').title=tr('복습 종료');
    $('reviewExit').textContent=tr('복습 종료');
    $('reviewClose').setAttribute('aria-label',L('close'));
    $('examClose').setAttribute('aria-label',L('endPractice'));
    $('examClose').textContent=L('endPractice');
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
      setStudyDay(Math.floor(snap.index / goal));
      buildDays();
      selectStudyMode(snap.mode);
      applyPlaybackPrefs(snap.playback);
      load(snap.index);
      refreshModeControls();
      $('status').textContent=tr('이어서 학습')
    }
    refresh()
  }
function exitReview(){
    if(!allowLeave())return;
    endReview();
    setPage('review');
    renderReview()
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
    reviewQueue=[...new Set(ids)].filter(i=>data[i]);
    reviewSkipped=0;reviewChecked=0;reviewNotice='';
    reviewPos=0;
    setPage('review',false);
    enterSentence(reviewQueue[0]);
    window.scrollTo(0,0);$('reviewExit').focus({preventScroll:true});
    start('single')
  }
function moveReview(){
    if(!allowLeave())return;
    if(gradedDraft===null)reviewSkipped++;else reviewChecked++;
    if(reviewPos+1>=reviewQueue.length){
      reviewNotice=reviewQueue.length===1?(reviewSkipped?`${L('skipped')} 1`:L('completed')):`${L('reviewDone')} · ${L('checkedSentences')} ${reviewChecked}/${reviewQueue.length} · ${L('skipped')} ${reviewSkipped}`;
      endReview();
      setPage('review');
      renderReview();
      return
    }
    reviewPos++;
    enterSentence(reviewQueue[reviewPos]);
    window.scrollTo(0,0);$('reviewExit').focus({preventScroll:true});
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
    for(const [n,t] of [[due().length,L('dueStat')],[totals[0],L('attempts')],[percent(totals[1],totals[2]),L('accuracy')]]){
      const stat=el('div',undefined,'plus-stat');
      stat.append(el('strong',String(n)),el('small',t));
      summary.append(stat)
    }
    if(reviewNotice){const note=el('p',reviewNotice,'review-notice');note.setAttribute('role','status');body.append(note);}
    const tabs=el('div',undefined,'plus-tabs');
    for(const key of ['due','wrong','history','weak']){
      const b=btn(L(key),()=>{
        reviewTab=key;reviewNotice='';
        renderReview()
      });
      b.setAttribute('aria-pressed',String(reviewTab===key));
      tabs.append(b)
    }
    body.append(tabs);
    if(reviewTab==='due')body.append(summary);
const list=el('div',undefined,'plus-list');
    if(reviewTab==='weak'){
      const words=Object.values(state.weak).sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word));
      if(!words.length)list.append(el('p',L('weakEmpty'),'empty-state'));
      else{
        const head=el('div',undefined,'weak-column-head');head.append(el('span',L('wordColumn')),el('span',L('wordErrors')));list.append(head);
        const rows=el('div',undefined,'read-only-words');
        paged(rows,words,w=>{const row=el('div',undefined,'weak-history-row'),word=el('strong',w.word);word.lang='en';row.append(word,el('small',new Intl.NumberFormat(locale()).format(w.count)));return row;});list.append(rows);
      }
    }else{
      const ids=reviewTab==='due'?due():reviewTab==='wrong'?wrong():entries.filter(([,r])=>r.attempts>0).sort((a,b)=>b[1].lastAt-a[1].lastAt).map(([i])=>i);
      if(ids.length&&reviewTab!=='history')body.append(btn(actionCount(L('start'),ids.length),()=>startReview(ids),'plus-action'));
      if(!ids.length)list.append(el('p',reviewTab==='wrong'?(entries.some(([,r])=>r.attempts)?L('noWrong'):L('notYet')):reviewTab==='history'?L('notYet'):entries.length?L('allGood'):L('empty'),'empty-state'));
      paged(list,ids,i=>{
        const r=state.sentences[i];
        if(reviewTab==='history'){
          const d=el('details',undefined,'history-detail read-only-history'),head=el('summary');
          const score=el('span',`${scoreText(r)}${lang==='ko'?'단어 정답':''}`,'history-score'+(r.lastPerfect?' flow-perfect':''));
          head.append(el('strong',number(i)),score);d.append(head);
          const attempts=el('div',undefined,'history-attempts');
          paged(attempts,r.history,h=>{const line=el('div',undefined,'history-attempt'),meta=el('div',undefined,'history-attempt-meta');
            meta.append(el('small',`${stamp(h.at)} · ${h.source==='exam'?L('exam'):h.source==='review'?L('review'):tr('받아쓰기')}`),el('strong',`${h.correct}/${h.total}`,'history-attempt-score'+(h.perfect?' flow-perfect':'')));
            const answer=el('p',h.answer||L('blank'));if(h.answer)answer.lang='en';line.append(meta,answer);return line;},3);d.append(attempts);return d;
        }
        const row=el('div',undefined,'plus-item flow-sentence'),copy=el('div'),head=el('div',undefined,'flow-sentence-head');
        head.append(el('strong',number(i)),el('small',r.attempts?`${L('last')} ${scoreText(r)}${lang==='ko'?'단어':''}`:L('notGraded')));
        copy.append(head);
        if(r.attempts)copy.append(el('small',`${L('attempts')} ${r.attempts}`));
        row.append(copy,btn(L('open'),()=>startReview([i])));return row;
      });
      onlyOneOpen(list,'.history-detail');
    }
    body.append(list);
    if(saveFailed)body.append(el('p',L('unsaved'),'plus-note'));
    const manage=el('details',undefined,'record-manage');manage.append(el('summary',L('manage')));
    const actions=el('div',undefined,'record-actions');
    actions.append(btn(L('export'),exportRecords),btn(L('import'),()=>file.click()));
    const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.onchange=()=>{if(file.files[0])importRecords(file.files[0]);file.value='';};
    const reset=btn(L('resetAll'),resetAll,'plus-reset');reset.id='resetAllHistory';
    manage.append(actions,file,reset,el('p',L('local'),'plus-note record-storage-note'));body.append(manage);

  }
const datasetId=()=>{let h=2166136261;for(const c of data.map(x=>x.en).join('\n'))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);};
function exportRecords(){
  const payload={format:'wfd-learning',version:1,dataset:datasetId(),learning:state,done,typing:readStored('wfd191_typing')};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=el('a');link.href=url;link.download='wfd-learning-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importRecords(file){
  try{
    if(file.size>10*1024*1024)throw Error('size');
    const x=JSON.parse(await file.text());
    const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
    if(x?.format!=='wfd-learning'||x.version!==1||x.dataset!==datasetId()||!object(x.learning?.sentences)||!object(x.learning?.weak)||!object(x.done)||(x.typing!==null&&!object(x.typing)))throw Error('format');
    const next=[[STORE,migratePositions(normalizeLearning(x.learning,data.length),data)],['wfd191_done',normalizeDone(x.done,data.length)],['wfd191_typing',normalizeTyping(x.typing,data.length)]];
    if(!confirm(L('importConfirm')))return;
    const previous=next.map(([k])=>[k,localStorage.getItem(k)]);
    try{for(const [k,v] of next)if(!writeStored(k,v))throw Error('storage');}
    catch(e){for(const [k,v] of previous){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{}}throw e;}
    location.reload();
  }catch{alert(L('importFailed'));}
}
function resetAll(){
    if(!confirm(L('resetConfirm')+' '+tr('타이핑 기록도 삭제됩니다.')))return;
    halt();
    state={sentences:{},weak:{}};
    clearDone();
    reviewQueue=[];
    reviewPos=0;
    reviewTab='due';reviewNotice='';
    const historySaved = writeStored(STORE, state);
    const marksSaved = writeStored('wfd191_done', {});
    const typingSaved = clearTyping();
    const failed = !historySaved || !marksSaved || !typingSaved;
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
document.addEventListener('wfd-attempt',e=>record(e.detail.index,e.detail.answer,e.detail.grade,reviewActive?'review':'practice'));
document.addEventListener('wfd-mark',e=>{scheduleMemorised(state,e.detail.index,e.detail.marked);saveFailed=!writeStored(STORE,state);refresh();});
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
  $('typingToggle').addEventListener('change',refresh);
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
    ea.onended=null;ea.onerror=null;
    ea.pause();
    ea.removeAttribute('src');
    ea.load()
  }
function examLanding(){
    stopExamAudio();
    test=null;
    $('examClose').hidden=true;
    $('language').disabled=false;
    $('examDialog').dataset.phase='landing';
    $('examTitle').textContent=L('examIntroTitle');
    const facts=el('div',undefined,'plus-summary exam-facts');
    const seconds=new Intl.NumberFormat(locale(),{style:'unit',unit:'second',unitDisplay:'short'}).format(60);
    for(const [value,label] of [['4',L('examQuestions')],['1',L('examPlayback')],[seconds,L('examTime')]]){const stat=el('div',undefined,'plus-stat');stat.append(el('strong',value),el('small',label));facts.append(stat);}
    eb.replaceChildren(facts,el('p',L('examRule'),'exam-intro-copy'),btn(L('examStart'),beginExam,'plus-action'),el('p',L('examDisclaimer'),'plus-note'));

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
    $('examDialog').dataset.phase='question';
    $('examTitle').textContent=L('question')+` ${test.pos+1} / ${test.ids.length}`;
    const progress=el('progress',undefined,'flow-progress');progress.max=test.ids.length;progress.value=test.pos;progress.setAttribute('aria-label',L('question'));eb.append(progress);
    const status=el('div',L('listening'),'exam-status');
    status.setAttribute('role','status');
    const field=el('div',undefined,'dictation-field'),input=el('textarea'),meta=el('div',undefined,'input-meta'),counter=el('span');
    const updateCount=()=>{const n=input.value.trim()?input.value.trim().split(/\s+/u).length:0;counter.textContent=tr(n===1?'입력 단어 1개':'입력 단어 {n}개').replace('{n}',String(n));};
    input.maxLength=1000;input.addEventListener('input',updateCount);updateCount();meta.append(counter);field.append(input,meta);
    input.placeholder=L('answer');
    input.setAttribute('aria-label',L('answer'));
    input.spellcheck=false;
    input.autocapitalize='off';
    input.autocomplete='off';
    const submit=btn(test.pos===test.ids.length-1?L('finish'):L('submit'),()=>{if(input.value.trim()||confirm(L('noAnswerConfirm')))finishQuestion();},'plus-action');
    submit.disabled=true;
    eb.append(status,field,submit);window.scrollTo(0,0);
    let started=false,finished=false,starting=false,lastTime=0,lastProgress=Date.now();
    function abortAudio(){if(token!==epoch||finished)return;stopExamAudio();test=null;$('language').disabled=false;$('examClose').hidden=true;eb.replaceChildren(el('p',L('audioFailed'),'exam-status'),btn(L('again'),beginExam,'plus-action'));}
    function watch(){clearInterval(clock);lastProgress=Date.now();clock=setInterval(()=>{if(token!==epoch||finished)return;if(ea.currentTime>lastTime){lastTime=ea.currentTime;lastProgress=Date.now();}else if(Date.now()-lastProgress>15000)abortAudio();},500);}
    ea.onerror=abortAudio;
    ea.src=audioUrl(i);
    ea.playbackRate=1;
    ea.onended=()=>{
      if(token!==epoch||finished||!test||test.phase!=='active')return;
      finished=true;
      clearInterval(clock);
      submit.disabled=false;
      const deadline=Date.now()+60000;
      const tick=()=>{
        if(token!==epoch)return;
        const rem=Math.max(0,Math.ceil((deadline-Date.now())/1000));
        status.textContent=L('answerTime')+' · '+Math.floor(rem/60)+':'+String(rem%60).padStart(2,'0');
        if(!rem)finishQuestion()
      };
      tick();
      clock=setInterval(tick,250)
    };
function go(){
      if(token!==epoch||started||starting)return;
      starting=true;watch();
      status.textContent=L('listening');
      ea.play().then(()=>{
        if(token===epoch){started=true;starting=false;}
      }).catch(()=>{
        if(token!==epoch)return;
        starting=false;clearInterval(clock);clock=null;
        if(ea.currentTime>0){abortAudio();return;}
        status.replaceChildren(el('span',L('blocked')),btn(L('retry'),go))
      })
    }
    go();
function finishQuestion(){
      if(token!==epoch||!finished||!test||test.phase!=='active')return;
      finished=false;
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
    $('examDialog').dataset.phase='results';
    $('examTitle').textContent=L('results');
    eb.replaceChildren();
    const c=answers.reduce((a,r)=>a+r.grade.correct,0),n=answers.reduce((a,r)=>a+r.grade.total,0);
    const hero=el('div',undefined,'exam-result-hero');
    hero.append(el('small',L('sessionAccuracy')),el('div',percent(c,n),'exam-score'),el('p',lang==='ko'?`${n}단어 중 ${c}단어 정답`:`${c}/${n} ${gradeLabels[lang][0]}`,'plus-note'));
    const totals=el('div',undefined,'plus-summary');
    const perfect=answers.filter(r=>r.grade.perfect).length;
    const t=gradeLabels[lang]||gradeLabels.en;
    for(const [v,label] of [[`${perfect}/${answers.length}`,L('perfectSentences')],[answers.reduce((a,r)=>a+r.grade.missing,0),t[3]],[answers.reduce((a,r)=>a+r.grade.wrong,0),t[7]],[answers.reduce((a,r)=>a+r.grade.extra,0),t[8]]]){const stat=el('div',undefined,'plus-stat');stat.append(el('strong',String(v)),el('small',label));totals.append(stat);}totals.classList.add('exam-result-stats');hero.append(totals);eb.append(hero);
    const misses=answers.filter(r=>!r.grade.perfect).map(r=>r.i);
    const actions=el('div',undefined,'exam-result-actions');
    if(misses.length)actions.append(btn(actionCount(L('retryWrong'),misses.length),()=>{stopExamAudio();test=null;reviewTab='wrong';startReview(misses);},'plus-action'));
    actions.append(btn(L('again'),beginExam,misses.length?'exam-again':'plus-action'));
    eb.append(actions,el('p',saveFailed?L('unsaved'):L('examSaved'),'plus-note'),el('h3',L('examDetails'),'flow-section-title'));
    const details=el('div',undefined,'exam-detail-list');
    for(const {i,answer,grade} of answers){
      const card=el('details',undefined,'exam-answer'),summary=el('summary'),result=el('div',undefined,'shared-grade');
      summary.append(el('strong',number(i)),el('span',`${grade.correct}/${grade.total}`,grade.perfect?'flow-perfect':'flow-score'));
      card.append(summary);
      const your=el('div',undefined,'flow-answer');your.append(el('small',tr('내 답안')),el('p',answer||L('blank')));card.append(your);
      const reference=el('div',undefined,'flow-answer');reference.append(el('small',L('correctAnswer')),el('p',data[i].en));if(lang!=='en')reference.append(el('small',answerTranslation(data[i]),'plus-note'));card.append(reference);
      renderGradeContent(result,grade,false,{compact:true});card.append(result);details.append(card);
    }
    onlyOneOpen(details,'.exam-answer');eb.append(details,el('p',L('examDisclaimer'),'plus-note'));
    window.scrollTo(0,0);

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
    if(page==='study'&&next!=='study'&&!allowLeave())return;
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
  $('examClose').onclick=()=>{if(test?.phase==='active'&&!confirm(L('leave')))return;examLanding();$('examTitle').focus({preventScroll:true});window.scrollTo(0,0);};
// Keep due counts current when returning to the tab.
document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      refresh();
      if(!dialog.hidden)renderReview()
    }
  });
  refresh();
})();
