// Maximize ordered exact word matches, then minimize edits to produce clear feedback.
function gradeTokens(text){return text.trim().split(/\s+/u).map((raw,sourceIndex)=>({raw,sourceIndex,key:raw.toLowerCase().replace(/[’‘]/gu,"'").replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu,'')})).filter(x=>x.key)}
function alignDictation(reference,submitted){
 const ref=gradeTokens(reference),got=gradeTokens(submitted),n=ref.length,m=got.length,W=n+m+1;
 const dp=Array.from({length:n+1},()=>new Float64Array(m+1));
 for(let i=n;i>=0;i--)for(let j=m;j>=0;j--){if(i===n){dp[i][j]=-(m-j);continue}if(j===m){dp[i][j]=-(n-i);continue}const same=ref[i].key===got[j].key;dp[i][j]=Math.max(dp[i+1][j+1]+(same?W:-1),dp[i+1][j]-1,dp[i][j+1]-1)}
 let i=0,j=0,correct=0,missing=0,extra=0,wrong=0;const ops=[];
 while(i<n||j<m){const v=dp[i][j];if(i<n&&j<m&&ref[i].key===got[j].key&&v===dp[i+1][j+1]+W){ops.push({kind:'correct',refIndex:ref[i].sourceIndex,ref:ref[i++].raw,got:got[j++].raw});correct++}
 else if(i<n&&j<m&&v===dp[i+1][j+1]-1){ops.push({kind:'wrong',refIndex:ref[i].sourceIndex,ref:ref[i++].raw,got:got[j++].raw});wrong++}
 else if(i<n&&v===dp[i+1][j]-1){ops.push({kind:'missing',refIndex:ref[i].sourceIndex,ref:ref[i++].raw});missing++}
 else{ops.push({kind:'extra',got:got[j++].raw});extra++}}
 return {ops,correct,total:n,missing,extra,wrong,perfect:correct===n&&extra===0&&wrong===0};
}

// Export only the pure scoring functions for Node unit tests.
if (typeof module !== "undefined" && module.exports) module.exports = { gradeTokens, alignDictation };
