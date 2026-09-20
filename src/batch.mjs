import {normalizeName,calculateRank} from './ranking.mjs';
import {SearchError} from './errors.mjs';
export function parseNames(values) {
 if(!Array.isArray(values)||values.some(x=>typeof x!=='string')) throw new SearchError('INPUT','블로그명을 한 줄에 하나씩 입력해주세요.');
 const names=[...new Set(values.map(normalizeName).filter(Boolean))];
 if(!names.length||names.length>20||names.some(x=>x.length>100)) throw new SearchError('INPUT','블로그명은 최대 20개, 각각 100자까지 입력해주세요.');
 return names;
}
export async function collectForBlogs(collect,keyword,values,limit,options) {
 const names=parseNames(values);
 const reports=[await collect(keyword,names[0],limit,options)];
 let verificationError;
 // Recheck absent names once; never merge the order of separate snapshots.
 if(names.some(name=>calculateRank(reports[0].results,name,limit).rank===null)){
  try{reports.push(await collect(keyword,names[0],limit,options));}
  catch{verificationError='추가 확인에 실패했습니다. 첫 조회 결과만 표시합니다.';}
 }
 const report=reports[reports.length-1];
 const snapshots=reports.map(r=>({checkedAt:r.checkedAt,results:r.results.slice(0,limit).map((item,i)=>({rank:i+1,title:item.title,url:item.url,kind:item.kind,names:item.names}))}));
 return {keyword:report.keyword,limit:report.limit,checkedCount:report.checkedCount,checkedAt:report.checkedAt,basis:report.basis,snapshots,verificationError,
  blogs:names.map(blogName=>{
   const observations=reports.map(r=>({...calculateRank(r.results,blogName,limit),checkedAt:r.checkedAt}));
   const last=observations[observations.length-1];
   const selected=last.rank!==null?last:observations.find(o=>o.rank!==null)||last;
   return {blogName,...selected,observedRanks:observations.map(o=>o.rank),changed:observations.length>1&&observations[0].rank!==last.rank};
  })};
}
