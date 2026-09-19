import assert from 'node:assert/strict';
import {launchBrowser} from '../src/browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('debug',{recursive:true});
const invalid=await fetch('http://127.0.0.1:3210/api/rank',{method:'POST',body:JSON.stringify({keyword:'',blogName:'test',limit:20})});
assert.equal(invalid.status,400);
const browser=await launchBrowser();
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:3210');
 await page.getByRole('button',{name:'순위 확인'}).click();
 assert.equal(await page.locator('#keyword').evaluate(e=>e.validationMessage),'검색 키워드를 입력해주세요.');
 await page.getByLabel('검색 키워드',{exact:true}).fill('창원 불면증');
 await page.getByLabel('찾을 블로그명',{exact:true}).fill('존재하지않는블로그_검증_20260919');
 await page.getByText('50위까지',{exact:true}).click();
 await page.getByRole('button',{name:'순위 확인'}).click();
 await page.getByText('50위 내 없음',{exact:true}).waitFor({timeout:90000});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'debug/mobile.png',fullPage:true});
 await writeFile('debug/qa.txt','PASS: API 빈 입력 400 / 한국어 입력 안내 / 실제 50위 조회 / 미발견 메시지 / 390px 화면 가로 넘침 없음\n');
 console.log('PASS: API validation, live 50 results, not found UI, mobile layout');
}finally{await browser.close();}
