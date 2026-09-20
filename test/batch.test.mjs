import test from 'node:test';
import assert from 'node:assert/strict';
import {collectForBlogs,parseNames} from '../src/batch.mjs';
test('all blogs use shared snapshots, absence triggers only one recheck',async()=>{
 let calls=0;
 const collect=async(keyword)=>{calls++;return {keyword,limit:20,checkedCount:4,results:[{kind:'웹사이트',names:['a']},{kind:'블로그',names:['a']},{kind:'블로그',names:['b']},{kind:'블로그',names:['a']}]};};
 const result=await collectForBlogs(collect,'키워드',[' a ','b','없음','a'],20);
 assert.equal(calls,2);assert.deepEqual(result.blogs.map(x=>x.rank),[2,3,null]);assert.deepEqual(result.blogs[0].matches.map(x=>x.rank),[2,4]);
});
test('reject invalid/oversized blog lists',()=>{
 for(const input of [null,[],[1],Array.from({length:21},(_,i)=>String(i)),['x'.repeat(101)]])assert.throws(()=>parseNames(input),{code:'INPUT'});
});

test('recheck finds an intermittently absent blog without merging result positions',async()=>{
 let calls=0;
 const reports=[{keyword:'k',limit:20,checkedAt:'first',results:[{kind:'블로그',names:['b']}]},{keyword:'k',limit:20,checkedAt:'second',results:[{kind:'웹사이트',names:['x']},{kind:'블로그',names:['a']}]}];
 const r=await collectForBlogs(async()=>reports[calls++],'k',['a','b'],20);
 assert.equal(calls,2);assert.equal(r.snapshots.length,2);
 assert.equal(r.blogs[0].rank,2);assert.deepEqual(r.blogs[0].observedRanks,[null,2]);assert.equal(r.blogs[0].changed,true);
 assert.equal(r.blogs[1].rank,1);assert.equal(r.blogs[1].checkedAt,'first');assert.deepEqual(r.blogs[1].observedRanks,[1,null]);
});
test('all found needs one collection; failed verification preserves first snapshot and warning',async()=>{
 const report={results:[{kind:'블로그',names:['a']}],checkedAt:'first'};
 let calls=0;const found=await collectForBlogs(async()=>{calls++;return report;},'k',['a'],20);assert.equal(calls,1);assert.equal(found.blogs[0].rank,1);
 calls=0;const partial=await collectForBlogs(async()=>{if(calls++)throw new Error('unavailable');return report;},'k',['a','b'],20);
 assert.equal(partial.snapshots.length,1);assert.ok(partial.verificationError);assert.equal(partial.blogs[0].rank,1);assert.equal(partial.blogs[1].rank,null);
});
