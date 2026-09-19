import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {launchIsolatedBrowser} from './browser-session.mjs';
const require = createRequire(import.meta.url);
export async function launchBrowser() {
  let pw;
  try { pw = require('playwright'); }
  catch {
    const bundled = join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    pw = require(bundled);
  }
  if(process.env.VERCEL){
    const {default:chromium}=await import('@sparticuz/chromium');
    return launchIsolatedBrowser(pw.chromium,{headless:true,args:[...chromium.args.filter(a=>!a.startsWith('--disk-cache-size=')),'--disk-cache-size=1048576','--media-cache-size=1048576'],executablePath:await chromium.executablePath()});
  }
  const edge = join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe');
  return pw.chromium.launch({ headless: true, ...(existsSync(edge) ? {executablePath: edge} : {}) });
}

