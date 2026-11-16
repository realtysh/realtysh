// Homepage notice: Firestore persistence and administrator-only editing.
(() => {
  const defaults = ["시흥 롯데캐슬 시그니처 분양권 매매 전문 상담", "급매·마이너스 프리미엄 매물 및 매수 희망 고객 접수 중", "매도·매수 상담 010-3664-1861 | 채널톡 상담 가능"];
  const linesEl = document.querySelector('#notice-lines');
  const editButton = document.querySelector('#notice-edit');
  const dialog = document.querySelector('#notice-dialog');
  const form = document.querySelector('#notice-form');
  const status = document.querySelector('#notice-save-status');
  const readStatus = document.querySelector('#notice-read-status');
  if (!linesEl || !editButton || !dialog || !form) return;
  let lines = defaults.slice();
  let db, auth, unsubscribe;
  const show = (items) => {
    lines = items;
    linesEl.replaceChildren(...items.map(value => { const p = document.createElement('p'); p.textContent = value; return p; }));
  };
  show(defaults);
  editButton.addEventListener('click', () => {
    if (editButton.hidden) return;
    ['line1','line2','line3'].forEach((key,i) => {form.elements.namedItem(key).value = lines[i];});
    status.textContent = '';
    dialog.showModal();
  });
  document.querySelector('#notice-close')?.addEventListener('click', () => dialog.close());
  document.querySelector('#notice-cancel')?.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!db || !auth?.currentUser || editButton.hidden) return;
    const next = ['line1','line2','line3'].map(key => form.elements.namedItem(key).value.trim());
    if (next.some(value => !value || value.length > 120)) {status.textContent = '세 줄 모두 120자 이내로 입력하세요.'; return;}
    const save = document.querySelector('#notice-save');
    save.disabled = true; status.textContent = '저장 중입니다.';
    try {
      const admin = await db.collection('admins').doc(auth.currentUser.uid).get();
      if (!admin.exists) throw new Error('관리자 권한이 없습니다.');
      await db.collection('siteContent').doc('homeNotice').set({lines:next,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      status.textContent = '저장했습니다.';
      dialog.close();
    } catch (error) { console.error('공지 저장 실패', error); status.textContent = '저장하지 못했습니다. 관리자 권한과 Firestore 규칙 배포를 확인해 주세요.'; }
    finally {save.disabled = false;}
  });
  // Firebase SDK and configuration are loaded by the main page. Do not initialize a second app.
  const start = () => {
    if (typeof firebase === 'undefined' || !window.REALTYSH_FIREBASE_CONFIG) return false;
    if (!firebase.apps.length) firebase.initializeApp(window.REALTYSH_FIREBASE_CONFIG);
    db = firebase.firestore(); auth = firebase.auth();
    unsubscribe = db.collection('siteContent').doc('homeNotice').onSnapshot(snap => {
      const data = snap.data();
      if (Array.isArray(data?.lines) && data.lines.length === 3 && data.lines.every(x => typeof x === 'string')) show(data.lines);
      else show(defaults);
      readStatus.hidden = true;
    }, error => {
      console.warn('공지 불러오기 실패', error);
      readStatus.textContent = '공지를 불러오지 못해 기본 안내를 표시합니다.';
      readStatus.hidden = false;
    });
    auth.onAuthStateChanged(async user => {
      editButton.hidden = true;
      if (!user || user.isAnonymous) return;
      try {
        const admin = await db.collection('admins').doc(user.uid).get();
        if (auth.currentUser?.uid === user.uid && admin.exists) editButton.hidden = false;
      } catch (error) {console.warn('공지 관리자 권한 확인 실패',error);}
    });
    return true;
  };
  if (!start()) window.addEventListener('load', start, {once:true});
})();
