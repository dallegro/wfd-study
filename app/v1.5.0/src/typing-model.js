// Exact sentence transcription: case, punctuation and spaces are intentional.
export const validGoals = [0,3,5,10];
export function compareTyping(reference, input) {
  const canonical=value=>value.replace(/’/g,"'");
  const expected=Array.from(canonical(reference)), actual=Array.from(canonical(input));
  const states=expected.map((c,i)=>i>=actual.length?'pending':actual[i]===c?'correct':'incorrect');
  const mismatch=states.indexOf('incorrect');
  return {states, length:actual.length, total:expected.length, mismatch:mismatch>=0?mismatch:actual.length>expected.length?expected.length:-1, complete:canonical(reference)===canonical(input)&&reference.length>0};
}
export function normalizeTyping(value, length) {
  const counts={};
  if(value?.counts&&typeof value.counts==='object')for(const [key,n] of Object.entries(value.counts)){
    const i=Number(key);if(Number.isInteger(i)&&String(i)===key&&i>=0&&i<length&&Number.isSafeInteger(n)&&n>0)counts[i]=n;
  }
  return {goal:validGoals.includes(value?.goal)?value.goal:5,counts};
}
export function recordTyping(state,index){
  state.counts[index]=Math.min(Number.MAX_SAFE_INTEGER,(state.counts[index]||0)+1);
  return state.counts[index];
}
