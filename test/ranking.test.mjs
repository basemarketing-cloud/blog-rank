import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName,orderResults,calculateRank} from '../src/ranking.mjs';
import {launchBrowser} from '../src/browser.mjs';
import {extractPage} from '../src/extract.mjs';
import {browserRules} from '../src/exclusions.mjs';
import {collect} from '../src/collector.mjs';
test('exact names: whitespace only; title text must not match',()=>{
 assert.equal(normalizeName('  휴한의원   창원  '),'휴한의원 창원');
 const rows=[{kind:'웹사이트',names:['휴한의원 창원']},{kind:'블로그',names:['휴한의원 대전'],title:'휴한의원 창원'},{kind:'블로그',names:[' 휴한의원  창원 ']},{kind:'블로그',names:['휴한의원 창원']}];
 assert.deepEqual(calculateRank(rows,'휴한의원 창원',20).matches.map(x=>x.rank),[3,4]);
 assert.equal(calculateRank(rows,'없는 블로그',20).rank,null);
 assert.equal(calculateRank(rows,'휴한의원 창원',2).rank,null);
});
test('visual top/left order independent from DOM order',()=>assert.deepEqual(orderResults([{top:50,left:10},{top:10,left:30},{top:10,left:5}]),[{top:10,left:5},{top:10,left:30},{top:50,left:10}]));
test('missing input rejected before browser launch',async()=>{
 await assert.rejects(collect('  ','블로그',20),{code:'INPUT'});
 await assert.rejects(collect('키워드','',20),{code:'INPUT'});
 await assert.rejects(collect('키워드','블로그',21),{code:'INPUT'});
});
test('DOM parser excludes ad/place, preserves general websites, reads visible profile',async()=>{
 const browser=await launchBrowser();
 try{
  const page=await browser.newPage();
  const card=(url,name,title)=>`<article><div class="sds-comps-profile"><span class="sds-comps-profile-info-title-text"><a><span class="sds-comps-text">${name}</span><span>새 창 열림</span></a></span></div><a href="${url}"><span class="sds-comps-text-type-headline1">${title}</span></a></article>`;
  await page.setContent(`<div id="main_pack"><section><h2>관련 광고</h2>${card('https://ader.naver.com/x','휴한의원 창원','광고')}</section><div id="place-app-root">${card('https://place.naver.com/1','장소','플레이스')}</div><section>${card('https://example.com','웹사이트','플레이스 광고 설명 글')}${card('https://blog.naver.com/a/123','휴한의원 창원','글 제목')}</section></div>`);
  const data=await page.evaluate(extractPage,browserRules);
  assert.equal(data.results.length,2);assert.equal(data.results[1].blogName,'휴한의원 창원');assert.equal(data.results[0].title,'플레이스 광고 설명 글');assert.equal(data.unresolved.length,0);
  // A separate Mate service must not abort valid results or change their ranks.
  await page.setContent(`<div id="main_pack"><div data-collection="fender_renderer" data-slog-container="apB_ugC" data-block-id="aipick/prs_template_v2_aipick_basic_desk.ts"><h2>건강 주제 네이버 메이트</h2><a href="https://blog.naver.com/creator">추천 크리에이터</a></div><section>${card('https://example.com','웹사이트','하지불안증후군')}${card('https://blog.naver.com/a/123','휴한의원 창원','네이버 메이트를 소개하는 일반 글')}</section></div>`);
  const mate=await page.evaluate(extractPage,browserRules);
  assert.deepEqual(mate.unknown,[]);
  assert.equal(mate.results.length,2);
  assert.equal(calculateRank(orderResults(mate.results),'휴한의원 창원',20).rank,2);
  assert.ok(mate.excludedBlocks.includes('건강 주제 네이버 메이트'));
  await page.setContent(`<div id="main_pack"><div data-block-id="ai-briefing/prs_template_aib_answer_desk.ts"><h2>AI 브리핑</h2>${card('https://blog.naver.com/source/123','요약 출처','요약 인용 글')}</div><section>${card('https://example.com','웹사이트','AI 브리핑에 관한 일반 글')}${card('https://blog.naver.com/a/123','휴한의원 창원','글 제목')}</section></div>`);
  const briefing=await page.evaluate(extractPage,browserRules);
  assert.equal(briefing.results.length,2);assert.deepEqual(briefing.unknown,[]);
  assert.equal(calculateRank(orderResults(briefing.results),'휴한의원 창원',20).rank,2);
  // Observed Clip/video carousels are separate services, including blog-sourced videos.
  for(const template of ['clip/prs_template_v2_clip_overlaytext_desk.ts','video/prs_template_v2_video_desk.ts']){
   await page.setContent(`<div id="main_pack"><div data-block-id="${template}"><h2>동영상</h2><a href="https://blog.naver.com/clip/123">영상 링크</a>${card('https://blog.naver.com/video/123','휴한의원 창원','영상 제목')}</div><section>${card('https://example.com','일반 웹사이트','네이버 클립과 동영상 소개')}${card('https://blog.naver.com/a/123','휴한의원 창원','일반 블로그 글')}</section></div>`);
   const media=await page.evaluate(extractPage,browserRules);
   assert.deepEqual(media.unknown,[]);assert.deepEqual(media.unresolved,[]);
   assert.equal(media.results.length,2);assert.equal(calculateRank(orderResults(media.results),'휴한의원 창원',20).rank,2);
  }
  // Unknown real result blocks still fail closed; do not disable the guard.
  await page.setContent('<div id="main_pack"><section><a href="https://example.com/article">새로운 형태의 일반 결과</a></section></div>');
  assert.equal((await page.evaluate(extractPage,browserRules)).unknown.length,1);
  await page.setContent('<h1>접근 확인</h1>');assert.equal((await page.evaluate(extractPage,browserRules)).error,'STRUCTURE');
 }finally{await browser.close();}
});

