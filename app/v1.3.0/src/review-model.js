import { gradeTokens } from './scoring.js';

const DAY = 86_400_000;
const INTERVALS = [1, 3, 7, 14, 30];
const HISTORY_LIMIT = 30;
const ANSWER_LIMIT = 1000;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function isIndex(key, total) {
  const index = Number(key);
  return String(index) === key && Number.isInteger(index) && index >= 0 && index < total;
}

export function normalizeDone(value, total) {
  const done = {};
  if (!isRecord(value)) return done;
  for (const [key, marked] of Object.entries(value)) {
    if (isIndex(key, total) && marked === true) done[key] = true;
  }
  return done;
}

export function normalizeLearning(value, total) {
  const state = { sentences: {}, weak: {} };
  if (!isRecord(value)) return state;

  if (isRecord(value.sentences)) {
    for (const [key, record] of Object.entries(value.sentences)) {
      if (!isIndex(key, total) || !isRecord(record) || !count(record.attempts)) continue;
      const history = Array.isArray(record.history)
        ? record.history.filter(isRecord).slice(0, HISTORY_LIMIT)
        : [];
      state.sentences[key] = {
        attempts: count(record.attempts),
        correct: count(record.correct),
        total: count(record.total),
        streak: Math.min(count(record.streak), INTERVALS.length),
        lastCorrect: count(record.lastCorrect),
        lastTotal: count(record.lastTotal),
        lastPerfect: record.lastPerfect === true,
        lastAt: count(record.lastAt),
        due: count(record.due),
        history: history.map((attempt) => ({
          at: count(attempt.at),
          correct: count(attempt.correct),
          total: count(attempt.total),
          perfect: attempt.perfect === true,
          source: attempt.source === 'exam' ? 'exam' : 'practice',
          answer: typeof attempt.answer === 'string' ? attempt.answer.slice(0, ANSWER_LIMIT) : '',
        })),
      };
    }
  }

  if (isRecord(value.weak)) {
    for (const [key, record] of Object.entries(value.weak)) {
      if (!isRecord(record) || typeof record.word !== 'string' || key !== 'w:' + record.word) {
        continue;
      }
      if (!isRecord(record.sentences)) continue;
      const sentences = {};
      for (const [index, hits] of Object.entries(record.sentences)) {
        if (isIndex(index, total) && count(hits)) sentences[index] = hits;
      }
      if (Object.keys(sentences).length) {
        state.weak[key] = { word: record.word, count: count(record.count), sentences };
      }
    }
  }
  return state;
}

// A perfect answer advances the schedule only when the current review is due.
export function recordAttempt(state, index, answer, grade, source, now = Date.now()) {
  const key = String(index);
  const record = state.sentences[key] || { attempts: 0, correct: 0, total: 0, streak: 0, history: [] };
  record.attempts++;
  record.correct += grade.correct;
  record.total += grade.total;
  record.lastCorrect = grade.correct;
  record.lastTotal = grade.total;
  record.lastPerfect = grade.perfect;
  record.lastAt = now;

  if (!grade.perfect) {
    record.streak = 0;
    record.due = now;
  } else if (!record.due || record.due <= now || record.streak === 0) {
    record.due = now + DAY * INTERVALS[Math.min(record.streak, INTERVALS.length - 1)];
    record.streak = Math.min(record.streak + 1, INTERVALS.length);
  }

  record.history.unshift({
    at: now,
    correct: grade.correct,
    total: grade.total,
    perfect: grade.perfect,
    source,
    answer: answer.slice(0, ANSWER_LIMIT),
  });
  record.history = record.history.slice(0, HISTORY_LIMIT);
  state.sentences[key] = record;

  for (const operation of grade.ops) {
    if (operation.kind !== 'missing' && operation.kind !== 'wrong') continue;
    const word = gradeTokens(operation.ref)[0]?.key;
    if (!word) continue;
    const wordKey = 'w:' + word;
    const weak = state.weak[wordKey] || { word, count: 0, sentences: {} };
    weak.count++;
    weak.sentences[key] = (weak.sentences[key] || 0) + 1;
    state.weak[wordKey] = weak;
  }
}

export function dueIndices(state, now = Date.now()) {
  return Object.entries(state.sentences)
    .filter(([, record]) => record.attempts > 0 && record.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([index]) => Number(index));
}
