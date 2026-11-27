(() => {
 const btn=document.getElementById('naver-import-open'), dialog=document.getElementById('naver-import-dialog');
 const list=document.getElementById('naver-import-list'), summary=document.getElementById('naver-import-summary');
 const search=document.getElementById('naver-import-search'); let rows=[], exportDate='';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const typeOf=s=> /분양권/.test(s)?'presale':/아파트|주상복합|오피스텔/.test(s)?'apartment':/토지|임야/.test(s)?'land':/상가|점포/.test(s)?'commercial':/공장|창고/.test(s)?'warehouse':/주택|다세대|연립|빌라/.test(s)?'house':/지식산업센터/.test(s)?'warehouse':'other';
 const dealOf=s=>/월세/.test(s)?'monthly':/전세/.test(s)?'lease':'sale';
 const norm=s=>String(s||'').toLowerCase().replace(/\s|[()（）·,.-]|블럭|블록|주상복합/g,'');
 const numbers=s=>(String(s||'').match(/\d+(?:\.\d+)?/g)||[]);
 function compare(x){
  const current=Array.isArray(posts)?posts:[];
  const exact=current.filter(p=>new RegExp('(?:^|\\D)'+x.id+'(?:$|\\D)').test(String(p.description||'')+' '+String(p.title||'')));
  if(exact.length)return {status:'등록됨 (번호 일치)',matched:exact};
  const similar=current.filter(p=>{
    const title=norm(p.title),name=norm(x.name==='-'?x.address:x.name);
    const sameName=name.length>=3&&title.includes(name);
    const sameType=p.propertyType===typeOf(x.type);
    const priceA=norm(p.price),priceB=norm(x.price);
    const samePrice=priceA&&priceB&&(priceA===priceB);
    const area=numbers(x.area).slice(-1)[0];
    const sameArea=area&&((p.description||'')+' '+(p.title||'')+' '+JSON.stringify(p.propertyTable||'')).includes(area);
    return sameType&&sameName&&(samePrice||sameArea);
  });
  return similar.length?{status:'중복 의심 · 확인 필요',matched:similar}:{status:'신규 후보 · 확인 필요',matched:[]};
 }
 function render(){const q=search.value.trim().toLowerCase();const shown=rows.filter(x=>(x.name+' '+x.address+' '+x.id).toLowerCase().includes(q));
 const result=rows.map(compare),registered=result.filter(x=>x.status.startsWith('등록됨')).length,possible=result.filter(x=>x.status.startsWith('중복')).length;
 summary.textContent=`네이버 노출 ${rows.length}건 / 번호 일치 ${registered}건 / 중복 의심 ${possible}건 / 신규 후보 ${rows.length-registered-possible}건 · 신규 후보도 실제 중복 여부 및 광고 표시사항 확인 필요`;
 list.innerHTML=shown.map(x=>{const m=compare(x);return `<div style="padding:12px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;gap:12px;align-items:center"><div><strong>${esc(x.name==='-'?x.type:x.name)}</strong> <small>${esc(x.source)} / ${esc(x.id)}</small><div>${esc(x.address)} · ${esc(x.area)} · ${esc(x.deal)} ${esc(x.price)}</div><strong style="color:${m.matched.length?'#a65c00':'#226b4b'}">${esc(m.status)}</strong>${m.matched.length?`<div><small>홈페이지 후보: ${esc(m.matched.map(p=>p.title).join(' / '))}</small></div>`:''}</div>${m.matched.length?'':`<button type="button" data-id="${esc(x.id)}">등록 양식에 입력</button>`}</div>`}).join('')||'일치하는 매물이 없습니다.';}
 btn.addEventListener('click',async()=>{if(btn.hidden)return;dialog.showModal();if(rows.length){render();return;}try{const r=await fetch('naver-listings.json',{cache:'no-store'});if(!r.ok)throw Error('파일을 불러오지 못했습니다');const data=await r.json();rows=data.listings;exportDate=data.exportDate;render();}catch(e){summary.textContent=e.message;}});
 document.getElementById('naver-import-close').onclick=()=>dialog.close();search.addEventListener('input',render);
 list.addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;const x=rows.find(r=>r.id===b.dataset.id);if(!x)return;if(compare(x).matched.length){alert('기존 홈페이지에 일치 또는 중복 의심 매물이 있습니다. 등록하지 않습니다.');return;}
 const form=document.getElementById('post-form');document.getElementById('post-create').click();
 const set=(n,v)=>{const el=form.elements.namedItem(n);if(el)el.value=v;};
 set('title',(x.name==='-'?x.type:x.name)+' '+x.deal+' '+x.area);set('propertyType',typeOf(x.type));set('dealType',dealOf(x.deal));set('price',x.price);set('location',x.address);
 set('legalArea',x.area==='-'?'':x.area); if(typeOf(x.type)==='presale'){set('complexName',x.name);set('presaleUse','아파트 분양권');} form.elements.namedItem('propertyType').dispatchEvent(new Event('change')); set('description',`네이버 매물번호: ${x.id}\n자료 기준일: ${exportDate}\n${x.area==='-'?'':x.area}`);
 dialog.close();alert('등록 양식에 기본 정보만 입력했습니다. 기존 매물 중복·법정 표시사항·층수·사진·가격을 확인한 후 직접 등록해 주세요.');
 });
 const obs=new MutationObserver(()=>{const create=document.getElementById('post-create');btn.hidden=create.hidden;});obs.observe(document.getElementById('post-create'),{attributes:true,attributeFilter:['hidden']});
})();