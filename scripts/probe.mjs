import {collect} from '../src/collector.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const keyword=process.argv[2]||'창원 불면증',blogName=process.argv[3]||'창원휴한의원',limit=Number(process.argv[4]||20);
await mkdir('debug',{recursive:true});
try {
 const report=await collect(keyword,blogName,limit,{onPage:async({page,pageNumber,data})=>{
   await page.screenshot({path:`debug/page-${pageNumber}.png`,fullPage:true});
   await writeFile(`debug/page-${pageNumber}.json`,JSON.stringify(data,null,2));
   if(data.error||data.unresolved?.length||data.unknown?.length) await writeFile(`debug/page-${pageNumber}.html`,await page.content());
 }});
 for(const [i,r] of report.results.entries()) console.log(`${i+1}위 | ${r.kind} | ${r.title} | ${r.blogName||''} | ${r.url.split('?')[0]}`);
 console.log('대표 순위:',report.rank,'확인한 결과:',report.checkedCount);
 await writeFile('debug/report.json',JSON.stringify(report,null,2));
} catch(e) {console.error(e.message);process.exitCode=1;}
