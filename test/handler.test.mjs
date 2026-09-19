import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createRankHandler} from '../src/handler.mjs';
async function request(handler,body,{parsed=false,origin='https://example.vercel.app'}={}){
 const req=Readable.from(parsed?[]:[body]);req.method='POST';req.headers={host:'example.vercel.app',origin};if(parsed)req.body=body;
 const res=new EventEmitter();res.writeHead=(status)=>{res.status=status;};res.end=(text)=>{res.data=JSON.parse(text);res.writableEnded=true;};
 await handler(req,res);return res;
}
test('API supports raw local requests and Vercel parsed requests',async()=>{
 const handler=createRankHandler(async()=>({keyword:'키워드',results:[{kind:'블로그',names:['블로그'],title:'글'}],checkedCount:20}));
 for(const parsed of [false,true]){
  const input={keyword:'키워드',blogNames:['블로그'],limit:20};
  const res=await request(handler,parsed?input:JSON.stringify(input),{parsed});assert.equal(res.status,200);assert.equal(res.data.blogs[0].rank,1);
 }
});
test('API rejects malformed, oversized and cross-origin requests before collecting',async()=>{
 const handler=createRankHandler(()=>{throw new Error('must not collect');});
 assert.equal((await request(handler,'{')).status,400);
 assert.equal((await request(handler,'x'.repeat(17000))).status,400);
 assert.equal((await request(handler,'{}',{origin:'https://other.example'})).status,403);
});
