export const normalizeName = value => value.normalize('NFC').replace(/\s+/gu,' ').trim();
export function orderResults(results) {
  return [...results].sort((a,b)=>a.top-b.top || a.left-b.left);
}
export function calculateRank(results,blogName,limit) {
  const target=normalizeName(blogName);
  const ranked=results.slice(0,limit).map((item,i)=>({...item,rank:i+1}));
  const matches=ranked.filter(item=>item.kind==='블로그'&&item.names.some(name=>normalizeName(name)===target));
  return {rank:matches[0]?.rank ?? null,match:matches[0]??null,matches,checkedCount:ranked.length};
}
