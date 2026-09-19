import test from 'node:test';
import assert from 'node:assert/strict';
import {collectForBlogs,parseNames} from '../src/batch.mjs';
test('each keyword collected once, all blogs compared using mixed result positions',async()=>{
 let calls=0;
 const collect=async(keyword)=>{calls++;return {keyword,limit:20,checkedCount:4,results:[{kind:'웹사이트',names:['a']},{kind:'블로그',names:['a']},{kind:'블로그',names:['b']},{kind:'블로그',names:['a']}]};};
 const result=await collectForBlogs(collect,'키워드',[' a ','b','없음','a'],20);
 assert.equal(calls,1);assert.deepEqual(result.blogs.map(x=>x.rank),[2,3,null]);assert.deepEqual(result.blogs[0].matches.map(x=>x.rank),[2,4]);
});
test('reject invalid/oversized blog lists',()=>{
 for(const input of [null,[],[1],Array.from({length:21},(_,i)=>String(i)),['x'.repeat(101)]])assert.throws(()=>parseNames(input),{code:'INPUT'});
});
