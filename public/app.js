const form=document.querySelector('#search-form'),status=document.querySelector('#status'),progress=document.querySelector('#progress');
for(const [id,message] of [['keyword','검색 키워드를 입력해주세요.'],['blogName','찾을 블로그명을 입력해주세요.']]){
 const input=document.getElementById(id);input.addEventListener('invalid',()=>input.setCustomValidity(message));input.addEventListener('input',()=>input.setCustomValidity(''));
}
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function lines(value){return [...new Set(value.split(/\r?\n/).map(x=>x.normalize('NFC').replace(/\s+/gu,' ').trim()).filter(Boolean))];}
const time=value=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(value));
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const values=new FormData(form),keywords=lines(values.get('keyword')),blogNames=lines(values.get('blogName')),limit=Number(values.get('limit'));
 if(!keywords.length||!blogNames.length||keywords.length>20||blogNames.length>20||[...keywords,...blogNames].some(x=>x.length>100)){
  progress.textContent='키워드와 블로그명을 각각 한 줄에 하나씩 입력해주세요. 각각 최대 20개, 한 항목당 100자까지 가능합니다.';return;
 }
 const controls=[...form.querySelectorAll('input,textarea,button')];controls.forEach(x=>x.disabled=true);
 const table=el('table'),caption=el('caption',`네이버 통합검색 일반 결과 · ${limit}위까지 · 한국 시간`),head=el('thead'),headRow=el('tr');
 for(const name of ['검색 키워드',...blogNames]){const th=el('th',name);th.scope='col';headRow.append(th);}head.append(headRow);table.append(caption,head);
 const body=el('tbody'),rows=keywords.map(keyword=>{
  const tr=el('tr'),th=el('th',keyword);th.scope='row';tr.append(th);
  const cells=blogNames.map(()=>{const td=el('td','대기 중','pending');tr.append(td);return td;});body.append(tr);return {th,cells};
 });table.append(body);
 const wrap=el('div',undefined,'table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','키워드별 블로그 순위 표');wrap.append(table);status.replaceChildren(wrap);
 let failed=0;
 try{
  for(const [index,keyword] of keywords.entries()){
   const row=rows[index];progress.textContent=`${index+1} / ${keywords.length} · ‘${keyword}’ 네이버 통합검색 결과를 확인하고 있습니다...`;
   row.cells.forEach(c=>{c.textContent='확인 중…';});
   try{
    const response=await fetch('/api/rank',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword,blogNames,limit}),signal:AbortSignal.timeout(155000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'검색에 실패했습니다. 잠시 후 다시 시도해주세요.');
    row.th.append(el('small',`${result.checkedCount}개 확인\n${time(result.checkedAt)}`,'row-meta'));
    result.blogs.forEach((blog,i)=>{
     const cell=row.cells[i];cell.className='';cell.replaceChildren();
     if(blog.rank===null){cell.append(el('span',`${limit}위 내 없음`,'absent'));return;}
     cell.append(el('strong',`${blog.rank}위`,'cell-rank'));
     const details=el('details'),summary=el('summary','발견된 글');details.append(summary);
     const link=el('a',blog.match.title);link.href=blog.match.url;link.target='_blank';link.rel='noopener noreferrer';details.append(link);cell.append(details);
    });
   }catch(error){
    failed++;const message=error.name==='TimeoutError'?'검색 시간이 초과됐습니다. 다시 조회해주세요.':error instanceof TypeError?'서비스 연결을 확인해주세요.':error.message;
    row.cells.forEach(c=>{c.className='cell-error';c.replaceChildren(el('strong','조회 실패'),el('p',message));});
   }
  }
  progress.textContent=`${keywords.length}개 키워드 조회 완료 · 블로그 ${blogNames.length}개 비교${failed?` · ${failed}개 키워드 조회 실패`:''}`;
 }finally{controls.forEach(x=>x.disabled=false);}
});
