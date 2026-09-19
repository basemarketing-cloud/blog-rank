import assert from 'node:assert/strict';
import {launchBrowser} from '../src/browser.mjs';
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const seen=[];
 await page.route('**/api/rank',async route=>{
  const input=route.request().postDataJSON();seen.push(input);
  if(input.keyword==='3')return route.fulfill({status:502,json:{error:'테스트용 조회 실패'}});
  return route.fulfill({json:{keyword:input.keyword,checkedCount:20,checkedAt:new Date().toISOString(),blogs:input.blogNames.map((blogName,i)=>({blogName,rank:i?null:2,match:i?null:{title:'테스트 글',url:'https://blog.naver.com/example/123'}}))}});
 });
 await page.goto('http://127.0.0.1:3210');
 await page.locator('#keyword').fill('1\n2\n3\n4\n5\n1\n ');
 await page.locator('#blogName').fill('a\nb\na');
 await page.locator('#submit').click();
 await page.getByText('5개 키워드 조회 완료 · 블로그 2개 비교 · 1개 키워드 조회 실패',{exact:true}).waitFor();
 assert.equal(seen.length,5);assert.deepEqual(seen[0].blogNames,['a','b']);
 assert.equal(await page.locator('tbody tr').count(),5);
 assert.equal(await page.getByText('2위',{exact:true}).count(),4);
 assert.equal(await page.getByText('조회 실패',{exact:true}).count(),2);
 assert.equal(await page.getByText('20위 내 없음',{exact:true}).count(),4);
 assert.ok(await page.locator('#submit').isEnabled());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'debug/batch-mobile.png',fullPage:true});
 console.log('PASS: 5 keywords × 2 blogs, duplicates removed, row failure isolated, mobile layout');
}finally{await browser.close();}
