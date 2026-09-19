import http from 'node:http';
import {readFile} from 'node:fs/promises';
import rankHandler from './handler.mjs';
const port=Number(process.env.PORT||3210);

const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
 if(req.url==='/api/rank') return rankHandler(req,res);
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

