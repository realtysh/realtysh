(() => {
 const btn=document.getElementById('naver-import-open'), dialog=document.getElementById('naver-import-dialog');
 const list=document.getElementById('naver-import-list'), summary=document.getElementById('naver-import-summary');
 const search=document.getElementById('naver-import-search'); let rows=[];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const typeOf=s=> /분양권/.test(s)?'presale':/아파트|주상복합|오피스텔/.test(s)?'apartment':/토지|임야/.test(s)?'land':/상가|점포/.test(s)?'commercial':/공장|창고/.test(s)?'warehouse':/주택|다세대|연립|빌라/.test(s)?'house':'other';
 const dealOf=s=>/월세/.test(s)?'monthly':/전세/.test(s)?'lease':'sale';
 function render(){const q=search.value.trim().toLowerCase();const shown=rows.filter(x=>(x.name+' '+x.address+' '+x.id).toLowerCase().includes(q));
 summary.textContent=`노출 중 ${rows.length}건 · 검색 결과 ${shown.length}건 · 기존 게시물과 자동 연결되지 않으므로 중복 확인 필요`;
 list.innerHTML=shown.map(x=>`<div style="padding:12px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;gap:12px;align-items:center"><div><strong>${esc(x.name==='-'?x.type:x.name)}</strong> <small>${esc(x.source)} / ${esc(x.id)}</small><div>${esc(x.address)} · ${esc(x.area)} · ${esc(x.deal)} ${esc(x.price)}</div></div><button type="button" data-id="${esc(x.id)}">등록 양식에 입력</button></div>`).join('')||'일치하는 매물이 없습니다.';}
 btn.addEventListener('click',async()=>{if(btn.hidden)return;dialog.showModal();if(rows.length)return;try{const r=await fetch('naver-listings.json',{cache:'no-store'});if(!r.ok)throw Error('파일을 불러오지 못했습니다');rows=(await r.json()).listings;render();}catch(e){summary.textContent=e.message;}});
 document.getElementById('naver-import-close').onclick=()=>dialog.close();search.addEventListener('input',render);
 list.addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;const x=rows.find(r=>r.id===b.dataset.id);if(!x)return;
 const form=document.getElementById('post-form');document.getElementById('post-create').click();
 const set=(n,v)=>{const el=form.elements.namedItem(n);if(el)el.value=v;};
 set('title',(x.name==='-'?x.type:x.name)+' '+x.deal+' '+x.area);set('propertyType',typeOf(x.type));set('dealType',dealOf(x.deal));set('price',x.price);set('location',x.address);
 set('description',`네이버 매물번호: ${x.id}\n자료 기준일: 2026-11-19\n${x.area}\n※ 실제 거래 가능 여부, 층수, 법정 광고 표시사항을 확인한 후 게시하세요.`);
 dialog.close();alert('등록 양식에 기본 정보만 입력했습니다. 기존 매물 중복·법정 표시사항·층수·사진·가격을 확인한 후 직접 등록해 주세요.');
 });
 const obs=new MutationObserver(()=>{const create=document.getElementById('post-create');btn.hidden=create.hidden;});obs.observe(document.getElementById('post-create'),{attributes:true,attributeFilter:['hidden']});
})();