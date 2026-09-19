import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
// Each request owns its profile and Chromium scratch files; never delete shared /tmp.
export async function launchIsolatedBrowser(chromiumType,options,{temporaryRoot=tmpdir()}={}){
 const root=resolve(temporaryRoot);
 const dir=await mkdtemp(join(root,'blog-rank-'));
 if(dirname(dir)!==root||!basename(dir).startsWith('blog-rank-'))throw new Error('Invalid browser temporary directory');
 const cleanup=()=>rm(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 let context;
 try{
  await mkdir(join(dir,'scratch'));
  context=await chromiumType.launchPersistentContext(join(dir,'profile'),{
   ...options,viewport:{width:1440,height:1000},locale:'ko-KR',timezoneId:'Asia/Seoul',
   downloadsPath:join(dir,'downloads'),acceptDownloads:false,
   env:{...process.env,...options.env,TMPDIR:join(dir,'scratch')}
  });
 }catch(error){await cleanup();throw error;}
 let closing;
 return {
  newPage:()=>context.newPage(),
  close:()=>closing??=(async()=>{try{await context.close();}finally{await cleanup();}})()
 };
}
