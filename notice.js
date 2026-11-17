// v6 homepage ticker: editable by verified administrators, readable by everyone.
(() => {
  const defaultText = '오늘의 추천매물 202동 11층 마피 6,000만원 협의 가능';
  const track = document.querySelector('#notice-ticker-track');
  const editButton = document.querySelector('#notice-edit');
  const dialog = document.querySelector('#notice-dialog');
  const form = document.querySelector('#notice-form');
  const status = document.querySelector('#notice-save-status');
  const readStatus = document.querySelector('#notice-read-status');
  if (!track || !editButton || !dialog || !form) return;
  let ticker = defaultText, db, auth;
  editButton.hidden = true;
  function show(value) {
    ticker = value;
    track.replaceChildren(...[0,1].map(i => {
      const span = document.createElement('span');
      span.className = 'notice-ticker-copy';
      span.textContent = value;
      if (i) span.setAttribute('aria-hidden','true');
      return span;
    }));
  }
  const motionButton = document.querySelector('#notice-motion-control');
  const tickerBox = track.closest('.notice-ticker');
  // Explicit opt-in: JS-driven scrolling remains usable when CSS animations are reduced.
  let frame = 0, previous = 0, offset = 0;
  const speed = 95; // pixels per second, approximately the original ticker pace
  function animate(now) {
    if (!tickerBox.classList.contains('is-playing')) return;
    if (previous) offset += Math.min((now - previous) / 1000, 0.08) * speed;
    previous = now;
    const first = track.firstElementChild;
    const step = first ? first.getBoundingClientRect().width : 0;
    if (step > 0) offset %= step;
    track.style.setProperty('transform', `translate3d(${-offset}px,0,0)`, 'important');
    frame = requestAnimationFrame(animate);
  }
  motionButton?.addEventListener('click', () => {
    const playing = tickerBox.classList.toggle('is-playing');
    motionButton.textContent = playing ? '움직임 멈추기' : '움직이는 글씨 보기';
    motionButton.setAttribute('aria-pressed', String(playing));
    cancelAnimationFrame(frame);
    previous = 0; offset = 0;
    track.style.removeProperty('transform');
    if (playing) frame = requestAnimationFrame(animate);
  });
  show(defaultText);
  editButton.addEventListener('click', () => {
    if (editButton.hidden || !auth?.currentUser || auth.currentUser.isAnonymous) return;
    form.elements.namedItem('ticker').value = ticker;
    status.textContent = '';
    dialog.showModal();
  });
  document.querySelector('#notice-close')?.addEventListener('click', () => dialog.close());
  document.querySelector('#notice-cancel')?.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!db || !auth?.currentUser || editButton.hidden) return;
    const next = form.elements.namedItem('ticker').value.trim().replace(/\s+/g,' ');
    if (!next || next.length > 200) {status.textContent = '문구를 1~200자로 입력하세요.'; return;}
    const save = document.querySelector('#notice-save');
    save.disabled = true; status.textContent = '저장 중입니다.';
    try {
      const admin = await db.collection('admins').doc(auth.currentUser.uid).get();
      if (!admin.exists) throw new Error('관리자 권한이 없습니다.');
      await db.collection('siteContent').doc('homeNotice').set({ticker:next,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
      show(next);
      status.textContent = '저장했습니다.';
      dialog.close();
    } catch (error) {
      console.error('공지 저장 실패',error);
      status.textContent = error?.code === 'permission-denied' ? '저장 권한이 거부되었습니다. Firestore 규칙을 확인하세요.' : '저장에 실패했습니다. 연결 상태와 관리자 권한을 확인하세요.';
    } finally {save.disabled = false;}
  });
  const start = () => {
    if (typeof firebase === 'undefined' || !window.REALTYSH_FIREBASE_CONFIG) return false;
    if (!firebase.apps.length) firebase.initializeApp(window.REALTYSH_FIREBASE_CONFIG);
    db = firebase.firestore(); auth = firebase.auth();
    db.collection('siteContent').doc('homeNotice').onSnapshot(snap => {
      const value = snap.data()?.ticker;
      show(typeof value === 'string' && value.trim() ? value : defaultText);
      readStatus.hidden = true;
    }, error => {
      console.warn('공지 불러오기 실패',error);
      readStatus.textContent = '공지를 불러오지 못해 기본 안내를 표시합니다.';
      readStatus.hidden = false;
    });
    auth.onAuthStateChanged(async user => {
      editButton.hidden = true;
      if (!user || user.isAnonymous) return;
      try {
        const admin = await db.collection('admins').doc(user.uid).get();
        if (auth.currentUser?.uid === user.uid && admin.exists) editButton.hidden = false;
      } catch(error) { console.warn('공지 관리자 권한 확인 실패',error); }
    });
    return true;
  };
  if (!start()) window.addEventListener('load',start,{once:true});
})();
