// Neighborhood news: list -> detail -> admin editor. Legacy plain text remains supported.
const neighborhoodDialog=null;
const openNeighborhoodButton=null;
const closeNeighborhoodButton=null;
const newsCreateButton=document.querySelector('#news-create');
const newsForm=document.querySelector('#news-form');
const cancelNewsButton=document.querySelector('#cancel-news');
const newsList=document.querySelector('#news-list');
const newsStatus=document.querySelector('#news-status');
const newsEditor=document.querySelector('#news-rich-editor');
const newsEditId=document.querySelector('#news-edit-id');
const newsSaveButton=document.querySelector('#news-save-button');
let neighborhoodNews=[];
let selectedNewsId=new URLSearchParams(location.search).get('id');
let newsCommentUnsubscribe=null;
const newsCollection=()=>database.collection('neighborhoodNews');
const newsDate=v=>{try{return v?.toDate?.().toLocaleDateString('ko-KR')||''}catch{return ''}};
const newsNode=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el};
function safeNewsHtml(html){
  const doc=new DOMParser().parseFromString('<div>'+html+'</div>','text/html');
  const allowed=new Set(['DIV','P','BR','B','STRONG','I','EM','U','UL','OL','LI','FONT','SPAN','A','IMG','H2','H3','BLOCKQUOTE']);
  const clean=(node)=>{
    for(const child of [...node.childNodes]){
      if(child.nodeType===8){child.remove();continue}
      if(child.nodeType!==1)continue;
      if(!allowed.has(child.tagName)){child.replaceWith(...child.childNodes);continue}
      for(const a of [...child.attributes])child.removeAttribute(a.name);
      // Attributes are rebuilt only from validated values below.
      if(child.tagName==='A'){
        const raw=node===null?'':null; // no-op, links restored in separate pass below
      }
      clean(child);
    }
  };
  // Preserve only known safe href/src/formatting values from original elements.
  function sanitize(parent){
    for(const child of [...parent.childNodes]){
      if(child.nodeType===8){child.remove();continue}
      if(child.nodeType!==1)continue;
      if(!allowed.has(child.tagName)){sanitize(child);child.replaceWith(...child.childNodes);continue}
      const href=child.getAttribute('href')||'';const src=child.getAttribute('src')||'';
      const size=child.getAttribute('size');const color=child.getAttribute('color');
      const align=child.style.textAlign;const fontSize=child.style.fontSize;
      for(const a of [...child.attributes])child.removeAttribute(a.name);
      if(child.tagName==='A'&&/^https?:\/\//i.test(href)){child.setAttribute('href',href);child.setAttribute('target','_blank');child.setAttribute('rel','noopener noreferrer')}
      if(child.tagName==='IMG'&&(/^(https?:\/\/)/i.test(src)||/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(src))){child.setAttribute('src',src);child.setAttribute('alt','게시글 사진');child.setAttribute('loading','lazy')}
      else if(child.tagName==='IMG'){child.remove();continue}
      if(child.tagName==='FONT'){
        if(['1','2','3','4','5','6','7'].includes(size))child.setAttribute('size',size);
        if(/^#[0-9a-f]{6}$/i.test(color||''))child.setAttribute('color',color);
      }
      if(['center','left','right'].includes(align))child.style.textAlign=align;
      if(/^(12|14|16|18|20|24|28|32)px$/.test(fontSize))child.style.fontSize=fontSize;
      sanitize(child);
    }
  }
  sanitize(doc.body);return doc.body.firstElementChild?.innerHTML||'';
}
function resetNewsEditor(){newsForm.reset();newsEditor.innerHTML='';newsEditId.value='';newsSaveButton.textContent='등록';newsStatus.textContent='';newsForm.hidden=true}
function showNewsEditor(item){newsForm.hidden=false;newsEditId.value=item?.id||'';newsForm.elements.title.value=item?.title||'';newsEditor.innerHTML=item?.html? safeNewsHtml(item.html):'';if(item&&!item.html)newsEditor.textContent=item.content||'';newsSaveButton.textContent=item?'수정 저장':'등록';newsStatus.textContent='';newsForm.scrollIntoView({block:'nearest'});newsForm.elements.title.focus()}
openNeighborhoodButton?.addEventListener('click',()=>{window.location.href='news.html'});
closeNeighborhoodButton?.addEventListener('click',()=>neighborhoodDialog?.close());
newsCreateButton?.addEventListener('click',()=>showNewsEditor(null));
cancelNewsButton?.addEventListener('click',()=>resetNewsEditor());
document.querySelectorAll('[data-news-cmd]').forEach(b=>b.addEventListener('click',()=>{newsEditor.focus();document.execCommand(b.dataset.newsCmd,false,null)}));
document.querySelector('#news-font-size')?.addEventListener('change',e=>{newsEditor.focus();document.execCommand('fontSize',false,e.target.value)});
document.querySelector('#news-font-color')?.addEventListener('input',e=>{newsEditor.focus();document.execCommand('foreColor',false,e.target.value)});
document.querySelector('#news-insert-link')?.addEventListener('click',()=>{const url=prompt('링크 주소를 입력하세요 (https://...)');if(!url)return;if(!/^https?:\/\//i.test(url)){alert('https:// 로 시작하는 주소를 입력해 주세요.');return}newsEditor.focus();document.execCommand('createLink',false,url)});
document.querySelector('#news-insert-image')?.addEventListener('click',()=>document.querySelector('#news-image-file')?.click());
document.querySelector('#news-image-file')?.addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/'))return;
 try{const img=new Image();const url=URL.createObjectURL(file);await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
 const scale=Math.min(1,1100/img.width);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);
 let data=canvas.toDataURL('image/jpeg',0.65);if(data.length>450000){alert('사진 용량이 큽니다. 더 작은 사진을 선택해 주세요.');return}
 newsEditor.focus();document.execCommand('insertHTML',false,`<p><img src="${data}" alt="게시글 사진"></p>`);
 }catch(err){console.error(err);alert('사진을 넣지 못했습니다.')}finally{e.target.value=''}
});
function renderNeighborhoodNews(){
 if(!newsList)return;
 if(newsCommentUnsubscribe){newsCommentUnsubscribe();newsCommentUnsubscribe=null}
 newsList.replaceChildren();
 if(selectedNewsId){const item=neighborhoodNews.find(n=>n.id===selectedNewsId);if(!item){selectedNewsId=null;return renderNeighborhoodNews()}
  const back=newsNode('button','news-back','← 목록으로');back.type='button';back.addEventListener('click',()=>{selectedNewsId=null;history.pushState({},'', 'news.html');resetNewsEditor();renderNeighborhoodNews();window.scrollTo({top:0,behavior:'instant'})});newsList.append(back);
  const article=newsNode('article','news-item');article.append(newsNode('h3','news-detail-title',item.title),newsNode('time','',newsDate(item.createdAt)));
  const body=newsNode('div','news-content');if(item.html)body.innerHTML=safeNewsHtml(item.html);else {body.textContent=item.content||'';body.style.whiteSpace='pre-wrap'}article.append(body);
  if(isAdmin){const actions=newsNode('div','news-detail-actions');const edit=newsNode('button','','수정');edit.type='button';edit.addEventListener('click',()=>showNewsEditor(item));const del=newsNode('button','news-delete','삭제');del.type='button';del.addEventListener('click',async()=>{if(!confirm('이 소식을 삭제할까요?'))return;try{await newsCollection().doc(item.id).delete();selectedNewsId=null;history.replaceState({},'','news.html');resetNewsEditor()}catch(err){console.error(err);alert('삭제하지 못했습니다.')}});actions.append(edit,del);article.append(actions)}
  const comments=newsNode('section','news-comments');comments.append(newsNode('strong','','댓글'));const commentList=newsNode('div','news-comment-list','댓글을 불러오는 중입니다.');comments.append(commentList);
  newsCommentUnsubscribe=newsCollectionComments(item.id).orderBy('createdAt','asc').onSnapshot(snap=>{commentList.replaceChildren(...snap.docs.map(d=>newsNode('p','',d.data().message)));if(!snap.size)commentList.textContent='첫 댓글을 남겨보세요.'},()=>{commentList.textContent='댓글을 불러오지 못했습니다.'});
  const form=newsNode('form','news-comment-form');const input=document.createElement('input');input.required=true;input.maxLength=500;input.placeholder='댓글을 입력하세요';const submit=newsNode('button','','댓글 등록');submit.type='submit';form.append(input,submit);form.addEventListener('submit',async e=>{e.preventDefault();const message=input.value.trim();if(!message)return;submit.disabled=true;try{await newsCollection().doc(item.id).collection('comments').add({message,createdAt:firebase.firestore.FieldValue.serverTimestamp()});input.value=''}catch(err){console.error(err);alert('댓글을 등록하지 못했습니다.')}finally{submit.disabled=false}});comments.append(form);article.append(comments);newsList.append(article);return;
 }
 if(!neighborhoodNews.length){newsList.append(newsNode('p','news-empty','등록된 우리동네 소식이 없습니다.'));return}
 for(const item of neighborhoodNews){const button=newsNode('button','news-list-row');button.type='button';const title=newsNode('strong','',item.title);const date=newsNode('time','',newsDate(item.createdAt));const arrow=newsNode('span','','›');button.append(title,date,arrow);button.addEventListener('click',()=>{selectedNewsId=item.id;history.pushState({},'', 'news.html?id='+encodeURIComponent(item.id));resetNewsEditor();renderNeighborhoodNews();window.scrollTo({top:0,behavior:'instant'})});newsList.append(button)}
}
function newsCollectionComments(id){return newsCollection().doc(id).collection('comments')}
function connectNeighborhoodNews(){if(!database)return;newsCollection().orderBy('createdAt','desc').onSnapshot(snap=>{neighborhoodNews=snap.docs.map(d=>({id:d.id,...d.data()}));renderNeighborhoodNews()},err=>{console.error(err);newsList.textContent='우리동네 소식을 불러오지 못했습니다.'})}
newsForm?.addEventListener('submit',async e=>{e.preventDefault();if(!database||!isAdmin)return;const title=newsForm.elements.title.value.trim();const html=safeNewsHtml(newsEditor.innerHTML);const content=newsEditor.innerText.trim();if(!title||!content){newsStatus.textContent='제목과 내용을 입력해 주세요.';return}if(new Blob([html]).size>850000){newsStatus.textContent='사진 용량이 너무 큽니다. 사진 수를 줄여 주세요.';return}
 newsSaveButton.disabled=true;newsStatus.textContent='저장 중입니다.';
 try{const now=firebase.firestore.FieldValue.serverTimestamp();if(newsEditId.value){await newsCollection().doc(newsEditId.value).update({title,content,html,updatedAt:now})}else{await newsCollection().add({title,content,html,createdAt:now,updatedAt:now})}resetNewsEditor();newsStatus.textContent='';}catch(err){console.error(err);newsStatus.textContent='저장하지 못했습니다. 관리자 권한과 저장 용량을 확인해 주세요.'}finally{newsSaveButton.disabled=false}
});


window.addEventListener('popstate',()=>{selectedNewsId=new URLSearchParams(location.search).get('id');resetNewsEditor();renderNeighborhoodNews()});
let database=null;let isAdmin=false;
try {if(!firebase.apps.length)firebase.initializeApp(window.REALTYSH_FIREBASE_CONFIG);database=firebase.firestore();firebase.auth().onAuthStateChanged(async user=>{isAdmin=false;if(user&&!user.isAnonymous){try{const admin=await database.collection('admins').doc(user.uid).get();isAdmin=admin.exists}catch(e){console.warn('관리자 확인 실패',e)}}newsCreateButton.hidden=!isAdmin;renderNeighborhoodNews()});connectNeighborhoodNews()}catch(e){console.error('소식 연결 오류',e);newsList.textContent='소식을 불러오지 못했습니다. 새로고침해 주세요.'}
