// Runs inside Playwright's page. Selectors are isolated here for Naver layout updates.
export function extractPage(rules) {
  const root = document.querySelector('#main_pack');
  if (!root) return {error:'STRUCTURE',results:[]};
  const visible = el => { const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(el).visibility!=='hidden'; };
  const clean = text => (text || '').normalize('NFC').replace(/\s+/gu,' ').trim();
  const excluded = el => {
    if(el.closest(rules.containers)) return true;
    let p=el;
    while(p && p!==root) {
      const code=p.getAttribute('data-collection') || p.getAttribute('data-slog-container') || '';
      if(rules.collections.some(prefix=>code.startsWith(prefix))) return true;
      if(p.parentElement===root && new RegExp(rules.headings).test(clean(p.querySelector('h2')?.textContent))) return true;
      p=p.parentElement;
    }
    return false;
  };
  const titleSelector='.sds-comps-text-type-headline1';
  const results=[], seen=new Set(), unresolved=[];
  for(const title of root.querySelectorAll(titleSelector)) {
    const a=title.closest('a[href]');
    if(!a || !visible(title) || excluded(a) || seen.has(a)) continue;
    let url;
    try {url=new URL(a.href);} catch {continue;}
    if(!['https:','http:'].includes(url.protocol) || rules.adHosts.includes(url.hostname)) continue;
    if(url.hostname==='search.naver.com') continue;
    seen.add(a);
    let card=a.parentElement;
    while(card && card!==root && !card.querySelector('.sds-comps-profile')) card=card.parentElement;
    if(!card || card===root || card.querySelectorAll(titleSelector).length!==1) {
      unresolved.push(clean(title.textContent)); continue;
    }
    const r=card.getBoundingClientRect();
    const kind=/^(?:m\.)?blog\.naver\.com$/.test(url.hostname)?'블로그':/^(?:m\.)?cafe\.naver\.com$/.test(url.hostname)?'카페':url.hostname==='kin.naver.com'?'지식iN':'웹사이트';
    const names=[...card.querySelectorAll('.sds-comps-profile-info-title-text')].filter(visible).map(e=>clean((e.querySelector('a > .sds-comps-text')||e).textContent));
    results.push({title:clean(title.textContent),url:a.href,kind,names,blogName:kind==='블로그'?(names[0]||null):null,top:r.top+scrollY,left:r.left+scrollX});
  }
  const unknown=[];
  for(const section of root.children) {
    if(!visible(section)||excluded(section)||section.matches('script,link,style,.api_sc_page_wrap,.ban_whale_download,#snb,._scrollLog,.ct_feed_wrap')) continue;
    if(section.querySelector('a[href^="http"]') && !section.querySelector(titleSelector)) unknown.push(clean(section.textContent).slice(0,80));
  }
  const pages=[...root.querySelectorAll('[aria-label="페이지 탐색"] a')].map(a=>({number:Number(a.textContent.replace(/\D/g,'')),url:a.href}));
  return {results,unresolved,unknown,pages,excludedBlocks:[...root.children].filter(e=>visible(e)&&excluded(e)).map(e=>clean(e.querySelector('h2')?.textContent)||e.getAttribute('data-collection'))};
}
