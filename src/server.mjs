import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {collect} from './collector.mjs';
import {SearchError,messages} from './errors.mjs';
import {collectForBlogs} from './batch.mjs';
const port=Number(process.env.PORT||3210);
let busy=false;
const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
 if(req.method==='POST'&&req.url==='/api/rank') {
   const origin=req.headers.origin;
   if(origin&&origin!==`http://127.0.0.1:${port}`&&origin!==`http://localhost:${port}`) return json(res,403,{error:'이 화면에서 다시 조회해주세요.'});
   if(busy) return json(res,429,{error:'다른 검색을 확인하고 있습니다. 잠시 후 다시 시도해주세요.'});
   const abort=new AbortController();
   const timer=setTimeout(()=>abort.abort(),150000);
   res.on('close',()=>{if(!res.writableEnded)abort.abort();});
   try {
     busy=true;
     let body='';
     for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)throw new SearchError('INPUT','입력 내용이 너무 깁니다.');}
     let input;try{input=JSON.parse(body);}catch{throw new SearchError('INPUT','검색 내용을 다시 입력해주세요.');}
     if(!input||typeof input!=='object')throw new SearchError('INPUT','검색 내용을 다시 입력해주세요.');
     if(input.blogNames!==undefined){
       json(res,200,await collectForBlogs(collect,input.keyword,input.blogNames,input.limit,{signal:abort.signal}));return;
     }
     const report=await collect(input.keyword,input.blogName,input.limit,{signal:abort.signal});
     const {results,audit,...result}=report;
     if(process.env.DEBUG_RANK==='1') for(const [i,r] of results.entries()) console.log(`${i+1}위 | ${r.kind} | ${r.title} | ${r.blogName||''} | ${r.url}`);
     json(res,200,result);
   }catch(e){json(res,e.code==='INPUT'?400:502,{error:e instanceof SearchError?e.message:messages.LOAD});}
   finally{clearTimeout(timer);busy=false;}
   return;
 }
 if(req.method==='GET'&&files[req.url]) {
   const [name,type]=files[req.url];
   try{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(await readFile(new URL(`../public/${name}`,import.meta.url)));}
   catch{res.writeHead(500);res.end('파일을 읽지 못했습니다.');}
   return;
 }
 res.writeHead(404);res.end();
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'이미 실행 중입니다. http://127.0.0.1:3210 을 열어주세요.':'실행하지 못했습니다. 이 메시지를 보내주세요.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`순위 확인 서비스가 실행됐습니다. http://127.0.0.1:${port}\n종료하려면 이 창에서 Ctrl+C를 누르세요.`));
