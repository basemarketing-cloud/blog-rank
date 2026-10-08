const form=document.querySelector('#search-form'),status=document.querySelector('#status'),progress=document.querySelector('#progress');
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function lines(value){return [...new Set(value.split(/\r?\n/).map(x=>x.normalize('NFC').replace(/\s+/gu,' ').trim()).filter(Boolean))];}
const time=value=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(value));
function tableFor(group,blogNames,limit){
 const table=el('table'),caption=el('caption',`${group.label} · 네이버 통합검색 일반 결과 · ${limit}위까지 · 한국 시간`),head=el('thead'),headRow=el('tr');
 for(const name of ['검색 키워드','클립 노출',...blogNames]){const th=el('th',name);th.scope='col';headRow.append(th);}head.append(headRow);table.append(caption,head);
 const body=el('tbody'),rows=group.keywords.map(keyword=>{
  const tr=el('tr'),th=el('th',keyword);th.scope='row';tr.append(th);
  const clip=el('td','대기 중','pending'),blogCells=blogNames.map(()=>el('td','대기 중','pending'));tr.append(clip,...blogCells);body.append(tr);return {th,clip,blogCells};
 });table.append(body);
 const wrap=el('div',undefined,'table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',`${group.label} 키워드별 결과 표`);wrap.append(table);return {wrap,rows};
}
function setClip(cell,clip){
 cell.className='';cell.replaceChildren();
 if(!clip){cell.append(el('span','확인 불가','absent'));return;}
 cell.append(el('strong',clip.visible?'노출됨':'미노출',clip.visible?'clip-found':'absent'));
 if(clip.changed)cell.append(el('small',`조회마다 결과가 다릅니다: ${clip.observed.map(x=>x?'노출':'미노출').join(' → ')}`,'row-meta'));
}
function setBlog(cell,blog,limit,snapshotCount){
 cell.className='';cell.replaceChildren();
 if(blog.rank===null){cell.append(el('span',`서버 조회 ${limit}위 내 미발견`,'absent'));cell.append(el('small',`${snapshotCount}회 확인 · 내 PC 결과와 다를 수 있습니다.`,'row-meta'));return;}
 cell.append(el('strong',`${blog.changed?'관측 ':''}${blog.rank}위`,'cell-rank'));
 if(blog.changed)cell.append(el('small',`조회마다 결과가 다릅니다: ${blog.observedRanks.map(rank=>rank===null?'미발견':rank+'위').join(' → ')}`,'row-meta'));
 const details=el('details'),summary=el('summary','발견된 글');details.append(summary);
 const link=el('a',blog.match.title);link.href=blog.match.url;link.target='_blank';link.rel='noopener noreferrer';details.append(link);cell.append(details);
}
function appendEvidence(container,keyword,snapshots){
 for(const [attempt,snapshot] of (snapshots||[]).entries()){
  const evidence=el('details'),summary=el('summary',`${keyword} · ${attempt+1}차 수집 결과 보기`),list=el('ol');
  evidence.append(summary,el('p',`${time(snapshot.checkedAt)} · 서버가 확인한 순서입니다. 내 PC 검색 화면과 다를 수 있습니다.`));
  for(const item of snapshot.results){const li=el('li'),link=el('a',item.title);link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';li.append(link,el('p',`${item.kind} · ${item.names.join(' / ')}`));list.append(li);}
  evidence.append(list);container.append(evidence);
 }
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const values=new FormData(form),blogNames=lines(values.get('blogName')),limit=Number(values.get('limit'));
 const groups=[1,2,3].map(number=>({label:`${number}차 결과`,keywords:lines(values.get(`keywords-${number}`))})).filter(group=>group.keywords.length);
 if(!groups.length||groups.some(group=>group.keywords.length>50)||blogNames.length>20||[...groups.flatMap(group=>group.keywords),...blogNames].some(value=>value.length>100)){
  progress.textContent='각 키워드 칸은 최대 50개, 블로그명은 최대 20개까지 입력할 수 있습니다. 한 항목은 100자까지 가능합니다.';return;
 }
 const controls=[...form.querySelectorAll('input,textarea,button')];controls.forEach(control=>control.disabled=true);
 status.replaceChildren();let failed=0,completed=0,total=groups.reduce((sum,group)=>sum+group.keywords.length,0),clipKeywords=[];
 try{
  for(const group of groups){
   const record=el('details',undefined,'batch-record'),summary=el('summary',`${group.label} · 대기 중`),content=el('div',undefined,'batch-content'),table=tableFor(group,blogNames,limit);
   record.append(summary,content);content.append(table.wrap);status.append(record);
   for(const [index,keyword] of group.keywords.entries()){
    const row=table.rows[index];completed++;progress.textContent=`${group.label} ${index+1} / ${group.keywords.length} · 전체 ${completed} / ${total} · ‘${keyword}’ 확인 중...`;
    row.clip.textContent='확인 중…';row.blogCells.forEach(cell=>cell.textContent='확인 중…');
    try{
     const response=await fetch('/api/rank',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword,blogNames,limit}),signal:AbortSignal.timeout(155000)});
     const result=await response.json();if(!response.ok)throw new Error(result.error||'검색에 실패했습니다. 잠시 후 다시 시도해주세요.');
     row.th.append(el('small',`${result.checkedCount}개 확인\n${time(result.checkedAt)}`,'row-meta'));
     setClip(row.clip,result.clip);if(result.clip?.visible)clipKeywords.push({keyword,labels:result.clip.labels||[]});result.blogs.forEach((blog,index)=>setBlog(row.blogCells[index],blog,limit,result.snapshots?.length||1));
     appendEvidence(content,keyword,result.snapshots);
     if(result.verificationError)row.th.append(el('small',result.verificationError,'row-meta'));
    }catch(error){
     failed++;const message=error.name==='TimeoutError'?'검색 시간이 초과됐습니다. 다시 조회해주세요.':error instanceof TypeError?'서비스 연결을 확인해주세요.':error.message;
     row.clip.className='cell-error';row.clip.replaceChildren(el('strong','조회 실패'),el('p',message));
     row.blogCells.forEach(cell=>{cell.className='cell-error';cell.replaceChildren(el('strong','조회 실패'),el('p',message));});
    }
   }
   summary.textContent=`${group.label} · ${group.keywords.length}개 조회 완료${failed?` · 누적 ${failed}개 실패`:''} · 눌러서 보기`;
  }
  const clipRecord=el('details',undefined,'batch-record'),clipSummary=el('summary',`클립 노출 키워드 · ${clipKeywords.length}개 · 눌러서 보기`),clipContent=el('div',undefined,'batch-content');
  clipRecord.append(clipSummary,clipContent);
  if(clipKeywords.length){
   const output=el('textarea',undefined,'clip-output');output.readOnly=true;output.rows=Math.min(clipKeywords.length,12);output.value=clipKeywords.map(item=>item.keyword).join('\n');output.setAttribute('aria-label','클립이 노출된 키워드');clipContent.append(output);
  }else clipContent.append(el('p','클립 노출 키워드가 없습니다.'));
  status.append(clipRecord);
  progress.textContent=`${total}개 키워드 조회 완료 · 블로그 ${blogNames.length}개 비교 · 클립 노출 ${clipKeywords.length}개${failed?` · ${failed}개 키워드 조회 실패`:''}`;
 }finally{controls.forEach(control=>control.disabled=false);}
});
