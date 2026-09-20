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
 const report=await collect(keyword,names[0],limit,options);
 return {keyword:report.keyword,limit:report.limit,checkedCount:report.checkedCount,checkedAt:report.checkedAt,basis:report.basis,
  observedResults:report.results.slice(0,limit).map((r,i)=>({rank:i+1,title:r.title,url:r.url,kind:r.kind,names:r.names})),
  blogs:names.map(blogName=>({blogName,...calculateRank(report.results,blogName,limit)}))};
}

