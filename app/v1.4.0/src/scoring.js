// Prefer exact words in order; among equal matches, minimize edit operations.
export function gradeTokens(text) {
  return text.trim().split(/\s+/u)
    .map((raw, sourceIndex) => ({
      raw,
      sourceIndex,
      key: raw.toLowerCase().replace(/[’‘]/gu, "'")
        .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ''),
    }))
    .filter(token => token.key);
}

export function alignDictation(reference, submitted) {
  const ref = gradeTokens(reference);
  const got = gradeTokens(submitted);
  const n = ref.length;
  const m = got.length;
  const matchWeight = n + m + 1;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));

  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n) {
        dp[i][j] = -(m - j);
      } else if (j === m) {
        dp[i][j] = -(n - i);
      } else {
        const same = ref[i].key === got[j].key;
        dp[i][j] = Math.max(
          dp[i + 1][j + 1] + (same ? matchWeight : -1),
          dp[i + 1][j] - 1,
          dp[i][j + 1] - 1,
        );
      }
    }
  }

  let i = 0, j = 0;
  let correct = 0, missing = 0, extra = 0, wrong = 0;
  const ops = [];
  while (i < n || j < m) {
    const value = dp[i][j];
    if (i < n && j < m && ref[i].key === got[j].key &&
        value === dp[i + 1][j + 1] + matchWeight) {
      ops.push({ kind: 'correct', refIndex: ref[i].sourceIndex, ref: ref[i++].raw, got: got[j++].raw });
      correct++;
    } else if (i < n && j < m && value === dp[i + 1][j + 1] - 1) {
      ops.push({ kind: 'wrong', refIndex: ref[i].sourceIndex, ref: ref[i++].raw, got: got[j++].raw });
      wrong++;
    } else if (i < n && value === dp[i + 1][j] - 1) {
      ops.push({ kind: 'missing', refIndex: ref[i].sourceIndex, ref: ref[i++].raw });
      missing++;
    } else {
      ops.push({ kind: 'extra', got: got[j++].raw });
      extra++;
    }
  }
  return { ops, correct, total: n, missing, extra, wrong, perfect: correct === n && extra === 0 && wrong === 0 };
}
