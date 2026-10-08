import {launchBrowser} from './browser.mjs';
import {extractPage} from './extract.mjs';
import {browserRules} from './exclusions.mjs';
import {orderResults,calculateRank,normalizeName} from './ranking.mjs';
import {SearchError,messages} from './errors.mjs';

export async function collect(keyword,blogName,limit,{onPage,signal}={}) {
  const fail=code=>{throw new SearchError(code,messages[code]);};
  if(typeof keyword!=='string'||!normalizeName(keyword)||keyword.length>100) throw new SearchError('INPUT','검색 키워드를 1~100자로 입력해주세요.');
  const target=blogName==null?null:normalizeName(blogName);
  if(blogName!=null&&(!target||target.length>100)) throw new SearchError('INPUT','찾을 블로그명을 1~100자로 입력해주세요.');
  if(![20,50,100].includes(limit)) throw new SearchError('INPUT','검색 범위를 20위, 50위, 100위 중 선택해주세요.');
  let browser;
  try {
    browser=await launchBrowser();
    const close=()=>browser.close().catch(()=>{});
    signal?.addEventListener('abort',close,{once:true});
    if(signal?.aborted) {await close();fail('LOAD');}
    const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'ko-KR',timezoneId:'Asia/Seoul'});
    let next='https://search.naver.com/search.naver?where=nexearch&query='+encodeURIComponent(normalizeName(keyword));
    const visited=new Set(),results=[],audit=[];
    for(let pageNumber=1;pageNumber<=8 && results.length<limit;pageNumber++) {
      if(!next || visited.has(next)) fail('RANGE');
      const u=new URL(next);
      if(u.origin!=='https://search.naver.com'||u.pathname!=='/search.naver'||!['nexearch',null].includes(u.searchParams.get('where'))||/blog|view/.test(u.searchParams.get('ssc')||'')) fail('STRUCTURE');
      visited.add(next);
      const response=await page.goto(next,{waitUntil:'domcontentloaded',timeout:35000});
      if(!response?.ok()) fail(response?.status()===403||response?.status()===429?'BLOCKED':'LOAD');
      await page.locator('#main_pack').waitFor({timeout:15000});
      await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=850){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});
      await page.waitForTimeout(700);
      const data=await page.evaluate(extractPage,browserRules);
      await onPage?.({page,pageNumber,data,results:orderResults(data.results)});
      if(data.error||data.unresolved.length||data.unknown.length||!data.results.length) fail('STRUCTURE');
      const ordered=orderResults(data.results);
      if(ordered.some(x=>x.kind==='블로그'&&!x.blogName)) fail('NAME');
      const fingerprint=ordered.map(x=>x.url).join('|');
      if(audit.some(x=>x.fingerprint===fingerprint)) fail('RANGE');
      results.push(...ordered.map(x=>({...x,page:pageNumber})));
      audit.push({page:pageNumber,count:ordered.length,excludedBlocks:data.excludedBlocks,clip:data.clip,fingerprint});
      next=data.pages.find(x=>x.number===pageNumber+1)?.url;
    }
    const rank=target?calculateRank(results,target,limit):{rank:null,match:null,matches:[],checkedCount:results.slice(0,limit).length};
    if(rank.checkedCount<limit) fail('RANGE');
    const clips=audit.map(x=>x.clip).filter(Boolean);
    const clip={visible:clips.some(x=>x.visible),labels:[...new Set(clips.flatMap(x=>x.labels||[]))]};
    return {...rank,keyword:normalizeName(keyword),blogName:target,limit,checkedAt:new Date().toISOString(),basis:'네이버 통합검색 일반 결과',clip,audit:audit.map(({fingerprint,...a})=>a),results:results.slice(0,limit)};
  } catch(error) {
    if(error instanceof SearchError) throw error;
    console.error('수집 오류:',error.message);
    throw new SearchError('LOAD',messages.LOAD);
  } finally {await browser?.close().catch(()=>{});}
}
