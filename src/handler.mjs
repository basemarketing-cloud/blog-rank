import {collect} from './collector.mjs';
import {SearchError,messages} from './errors.mjs';
import {collectForBlogs} from './batch.mjs';
function json(res,status,data){if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export function createRankHandler(collector=collect){
 let busy=false;
 return async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST 요청만 가능합니다.'});
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host)return json(res,403,{error:'이 화면에서 다시 조회해주세요.'});}catch{return json(res,403,{error:'이 화면에서 다시 조회해주세요.'});}}
  if(busy)return json(res,429,{error:'다른 검색을 확인하고 있습니다. 잠시 후 다시 시도해주세요.'});
  busy=true;
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),150000);
  res.on('close',()=>{if(!res.writableEnded)abort.abort();});
  try{
   let body=req.body;
   if(body===undefined){body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)throw new SearchError('INPUT','입력 내용이 너무 깁니다.');}}
   if(Buffer.isBuffer(body))body=body.toString('utf8');
   if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body))>16384)throw new SearchError('INPUT','입력 내용이 너무 깁니다.');
   let input;try{input=typeof body==='string'?JSON.parse(body):body;}catch{throw new SearchError('INPUT','검색 내용을 다시 입력해주세요.');}
   if(!input||typeof input!=='object'||Array.isArray(input))throw new SearchError('INPUT','검색 내용을 다시 입력해주세요.');
   if(input.blogNames!==undefined)return json(res,200,await collectForBlogs(collector,input.keyword,input.blogNames,input.limit,{signal:abort.signal}));
   const {results,audit,...result}=await collector(input.keyword,input.blogName,input.limit,{signal:abort.signal});
   return json(res,200,result);
  }catch(e){if(!(e instanceof SearchError))console.error('rank request failed:',e.message);json(res,e.code==='INPUT'?400:502,{error:e instanceof SearchError?e.message:messages.LOAD});}
  finally{clearTimeout(timer);busy=false;}
 };
}
export default createRankHandler();
