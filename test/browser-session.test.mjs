import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {launchIsolatedBrowser} from '../src/browser-session.mjs';
test('browser profiles are removed after repeated requests, concurrent closes and failures',async()=>{
 const root=await mkdtemp(join(tmpdir(),'rank-lifecycle-test-'));
 try{
  await writeFile(join(root,'unrelated.txt'),'keep');
  for(let i=0;i<20;i++){
   let closeCount=0;
   const browser=await launchIsolatedBrowser({launchPersistentContext:async(profile,options)=>{
    await writeFile(join(options.env.TMPDIR,'cache'),'temporary data');
    return {newPage:async()=>({}),close:async()=>{closeCount++;}};
   }},{},{temporaryRoot:root});
   await Promise.all([browser.close(),browser.close()]);assert.equal(closeCount,1);
   assert.deepEqual(await readdir(root),['unrelated.txt']);
  }
  await assert.rejects(launchIsolatedBrowser({launchPersistentContext:async()=>{throw new Error('launch failed');}},{},{temporaryRoot:root}),/launch failed/);
  const failed=await launchIsolatedBrowser({launchPersistentContext:async()=>({close:async()=>{throw new Error('close failed');}})},{},{temporaryRoot:root});
  await assert.rejects(failed.close(),/close failed/);
  assert.deepEqual(await readdir(root),['unrelated.txt']);
 }finally{await rm(root,{recursive:true,force:true});}
});
