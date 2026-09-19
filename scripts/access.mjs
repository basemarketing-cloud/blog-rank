import { launchBrowser } from '../src/browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await launchBrowser();
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}, locale:'ko-KR'});
  const response = await page.goto('https://search.naver.com/search.naver?where=nexearch&query='+encodeURIComponent('창원 불면증'), {waitUntil:'domcontentloaded',timeout:45000});
  console.log('HTTP',response.status());
  await page.waitForTimeout(2500);
  console.log((await page.locator('body').innerText()).slice(0,1800));
  await mkdir('debug',{recursive:true});
  await writeFile('debug/access.html',await page.content());
} finally {await browser.close();}
