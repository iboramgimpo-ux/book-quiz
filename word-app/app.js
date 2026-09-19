(async function () {
  "use strict";

  const GAP_AFTER_WORD_MS = 3000;   // 단어 읽고 나서 쉬는 시간
  const GAP_AFTER_DEF_MS  = 1200;   // 영영풀이 끝나고 다음 단어로 넘어가기 전 쉬는 시간

  const listView   = document.getElementById('list-view');
  const playerView = document.getElementById('player-view');
  const gridContainer = document.getElementById('grid-container');
  const wordCountEl = document.getElementById('word-count');
  const alphaStrip = document.getElementById('alpha-strip');
  const searchInput = document.getElementById('search-input');

  const cardImage = document.getElementById('card-image');
  const progressLabel = document.getElementById('progress-label');
  const statusPill = document.getElementById('status-pill');
  const backBtn = document.getElementById('back-btn');
  const autoBtn = document.getElementById('auto-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const cardStage = document.getElementById('card-stage');
  const cardFrame = document.getElementById('card-frame');
  const hsLayer = document.getElementById('hs-layer');
  const popup = document.getElementById('popup');
  const rotateHint = document.getElementById('rotate-hint');

  const audioW = document.getElementById('audio-w');
  const audioD = document.getElementById('audio-d');
  const audioR = document.getElementById('audio-r');
  const welcomeLine = document.getElementById('welcome-line');

  // ---------- 학생 식별 (관리자 페이지에서 만들어준 링크의 ?student= 값) ----------
  const studentId = new URLSearchParams(location.search).get('student') || null;

  if (studentId && typeof db !== 'undefined') {
    db.collection('students').doc(studentId).get()
      .then(doc => {
        if (doc.exists) {
          const s = doc.data();
          const name = s.name || '학생';
          welcomeLine.textContent = `${name} 학생, 안녕하세요! 단어를 터치하면 읽어줘요`;
        }
      })
      .catch(() => { /* 학생 정보를 못 불러와도 앱은 그대로 동작 */ });
  }

  // ---------- 데이터 로드 ----------
  const words = await fetch('words.json').then(r => r.json());
  // 터치 영역 좌표 (파란 단어 / 영영풀이 첫 줄 / 빨간 단어 / 그림). 없어도 앱은 동작합니다.
  const hotspots = await fetch('hotspots.json').then(r => r.json()).catch(() => ({}));
  const indexOfCode = new Map(words.map((c, i) => [c, i]));

  // ---------- 목록 화면 그리기 ----------
  function buildGrid(filterText) {
    gridContainer.innerHTML = '';
    alphaStrip.innerHTML = '';
    const q = (filterText || '').trim().toUpperCase();
    const filtered = q ? words.filter(c => c.includes(q)) : words;

    wordCountEl.textContent = q
      ? `검색 결과 ${filtered.length}개`
      : `전체 ${words.length}개 단어`;

    let lastLetter = null;
    const seenLetters = new Set();
    const frag = document.createDocumentFragment();

    filtered.forEach((code) => {
      const letter = code[0];
      if (letter !== lastLetter) {
        lastLetter = letter;
        const h = document.createElement('div');
        h.className = 'letter-heading';
        h.textContent = letter;
        h.id = 'letter-' + letter;
        frag.appendChild(h);
        seenLetters.add(letter);

        const wrap = document.createElement('div');
        wrap.className = 'grid';
        wrap.dataset.letter = letter;
        frag.appendChild(wrap);
      }
      const wrap = frag.lastChild;
      wrap.appendChild(makeCard(code));
    });

    gridContainer.appendChild(frag);

    // alphabet quick-nav (전체 목록일 때만 표시)
    if (!q) {
      [...seenLetters].forEach(letter => {
        const b = document.createElement('button');
        b.textContent = letter;
        b.addEventListener('click', () => {
          const target = document.getElementById('letter-' + letter);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        alphaStrip.appendChild(b);
      });
    }
  }

  function makeCard(code) {
    const idx = words.indexOf(code);
    const card = document.createElement('div');
    card.className = 'word-card';

    const pic = document.createElement('img');
    pic.className = 'pic';
    pic.loading = 'lazy';
    pic.src = `assets/thumb/${code}.jpg`;
    pic.alt = code;

    card.appendChild(pic);
    card.addEventListener('click', () => enterPlayer(idx));   // 클릭 순간에 전체화면 요청
    return card;
  }

  searchInput.addEventListener('input', () => buildGrid(searchInput.value));
  buildGrid('');

  // ---------- 재생 화면 ----------
  const CARD_W = 640, CARD_H = 330;          // 카드 이미지 원본 크기 (터치 좌표의 기준)
  let currentIndex = 0;
  let inPlayer = false;
  let wordDone = false;      // 이 카드에서 단어를 끝까지 들었는지
  let defDone = false;       // 이 카드에서 영영풀이를 끝까지 들었는지
  let autoMode = false;      // 자동재생(예전 방식) 켜짐 여부
  let token = 0;             // 재생 세션 토큰 (끼어들기/뒤로가기 경쟁상태 방지)
  let timer = null;          // 단어→영영풀이 사이 대기
  let advanceTimer = null;   // 자동재생: 다음 단어로 넘어가기 대기
  let fsActive = false;
  let frameK = 1;            // 카드 1px(원본) = 화면 몇 px
  const viewStack = [];      // 지나온 카드 기록 (이전 버튼이 이 순서대로 되돌아감)
  const VIEW_STACK_MAX = 50;

  const setStatus = (t) => { statusPill.textContent = t; };

  // ----- 전체화면 / 가로모드 -----
  function showRotateHint() { rotateHint.classList.add('show'); }
  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(showRotateHint);
      } else { showRotateHint(); }
    } catch (e) { showRotateHint(); }
  }
  function requestFs() {
    const el = document.documentElement;
    try {
      const fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!fn) { showRotateHint(); return; }
      const p = fn.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(lockLandscape).catch(showRotateHint);
      else lockLandscape();
    } catch (e) { showRotateHint(); }
  }
  function leaveFs() {
    fsActive = false;
    rotateHint.classList.remove('show');
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
  function onFsChange() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (on) { fsActive = true; }
    else if (fsActive) {           // 뒤로가기 등으로 전체화면이 풀림 → 목록으로
      fsActive = false;
      if (inPlayer) exitPlayer(false);
    }
    fitCard();
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // ----- 카드 크기 맞추기 (터치 영역이 그림과 정확히 겹치도록 크기를 직접 계산) -----
  function fitCard() {
    const w = cardStage.clientWidth - 16;
    const h = cardStage.clientHeight - 16;
    if (w <= 0 || h <= 0) return;
    frameK = Math.min(w / CARD_W, h / CARD_H);
    cardFrame.style.width = Math.floor(CARD_W * frameK) + 'px';
    cardFrame.style.height = Math.floor(CARD_H * frameK) + 'px';
  }
  if (window.ResizeObserver) new ResizeObserver(() => { fitCard(); hidePopup(); }).observe(cardStage);
  window.addEventListener('resize', () => { fitCard(); hidePopup(); });
  window.addEventListener('orientationchange', () => setTimeout(fitCard, 300));

  // ----- 오디오 제어 -----
  function stopAllAudio() {
    token++;
    clearTimeout(timer); timer = null;
    clearTimeout(advanceTimer); advanceTimer = null;
    [audioW, audioD, audioR].forEach(a => { try { a.pause(); } catch (e) {} });
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  }

  function playMp3(el, src, done, blockedMsg) {
    const my = token;
    el.onended = done;
    el.onerror = done;                       // 파일이 없어도 멈추지 않게
    el.src = src;
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(err => {
      if (my !== token) return;
      if (err && err.name === 'NotAllowedError') setStatus(blockedMsg || '👆 화면을 한 번 터치해 주세요');
      else done();
    });
  }

  function playWord() {
    stopAllAudio();
    const my = token, code = words[currentIndex];
    setStatus('단어 읽는 중...');
    playMp3(audioW, `assets/audio/${code}_w.mp3`, () => {
      if (my !== token) return;
      wordDone = true;
      afterPlay();
    }, '👆 파란 단어를 터치하면 읽어줘요');
  }

  function playDef() {
    stopAllAudio();
    const my = token, code = words[currentIndex];
    setStatus('영영풀이 읽는 중...');
    playMp3(audioD, `assets/audio/${code}_d.mp3`, () => {
      if (my !== token) return;
      defDone = true;
      afterPlay();
    }, '👆 나팔 그림을 터치하면 읽어줘요');
  }

  // 어떤 소리가 끝날 때마다: 아직 안 들은 게 있으면 이어서, 다 들었으면 "완료" 처리
  function afterPlay() {
    const my = token;
    if (!wordDone) { playWord(); return; }
    if (!defDone) {
      setStatus('잠시 후 뜻풀이...');
      timer = setTimeout(() => { if (my === token) playDef(); }, GAP_AFTER_WORD_MS);
      return;
    }
    complete();
  }

  function complete() {
    nextBtn.disabled = false;
    if (autoMode) {
      setStatus('잠시 후 다음 단어로...');
      const my = token;
      const wait = popup.classList.contains('hidden') ? GAP_AFTER_DEF_MS : 5000; // 그림 팝업이 떠 있으면 조금 더 기다림
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => { if (my === token && inPlayer) goNext(); }, wait);
    } else {
      setStatus('다 읽었어요! ▶ 다음을 눌러요');
    }
  }

  // ----- 빨간 단어: 읽어주고 + 그림 팝업 -----
  function speak(text, done, fallbackCode) {
    const my = token;
    const fallback = () => {
      if (fallbackCode) playMp3(audioR, `assets/audio/${fallbackCode}_w.mp3`, done);
      else setTimeout(done, 500);
    };
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { fallback(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
      const v = voices.find(x => /^en[-_]US/i.test(x.lang)) || voices.find(x => /^en/i.test(x.lang));
      if (v) u.voice = v;
      let fired = false;
      const fin = () => { if (fired) return; fired = true; if (my === token) done(); };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 6000);                 // 일부 기기에서 onend가 안 오는 경우 대비
      setTimeout(() => { if (my === token) speechSynthesis.speak(u); }, 60);
    } catch (e) { fallback(); }
  }

  function playRed(entry) {
    stopAllAudio();
    const my = token;
    const text = entry[0], codes = entry[5];
    setStatus(`“${text}” 읽는 중...`);
    showPopup(entry);
    const done = () => { if (my === token) afterPlay(); };
    const first = codes[0];
    const exact = first && hotspots[first] && hotspots[first].w === text;
    if (exact) playMp3(audioR, `assets/audio/${first}_w.mp3`, done);   // 카드에 있는 단어 → 녹음된 발음
    else speak(text, done, first);                                     // 복수형·활용형 등 → 화면에 보이는 그대로 TTS
  }

  function hidePopup() { popup.classList.add('hidden'); popup.innerHTML = ''; }

  function showPopup(entry) {
    const codes = entry[5];
    if (!codes || !codes.length) { hidePopup(); return; }
    popup.innerHTML = '';
    const maxW = Math.min(150, CARD_W * frameK * 0.26);
    const maxH = Math.min(115, CARD_H * frameK * 0.36);
    codes.forEach(code => {
      const h = hotspots[code];
      if (!h) return;
      const p = h.p || [0, 0, CARD_W, CARD_H];
      const sc = Math.min(maxW / p[2], maxH / p[3], 2);
      const item = document.createElement('button');
      item.className = 'pop-item';
      const pic = document.createElement('div');
      pic.className = 'pop-pic';
      pic.style.width = Math.round(p[2] * sc) + 'px';
      pic.style.height = Math.round(p[3] * sc) + 'px';
      pic.style.backgroundImage = `url(assets/img/${code}.jpg)`;
      pic.style.backgroundSize = `${CARD_W * sc}px ${CARD_H * sc}px`;
      pic.style.backgroundPosition = `${-p[0] * sc}px ${-p[1] * sc}px`;
      const label = document.createElement('span');
      label.textContent = h.w + ' ▸';
      item.appendChild(pic); item.appendChild(label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = indexOfCode.get(code);
        if (idx !== undefined) startCard(idx);      // 그 단어가 메인인 화면으로 이동
      });
      popup.appendChild(item);
    });
    if (!popup.children.length) { hidePopup(); return; }
    // 위치: 누른 단어 바로 아래 (자리가 없으면 위), 카드 안쪽으로 맞춤
    popup.style.visibility = 'hidden';
    popup.classList.remove('hidden');
    const fw = cardFrame.clientWidth, fh = cardFrame.clientHeight;
    const pw = popup.offsetWidth, ph = popup.offsetHeight;
    const cx = (entry[1] + entry[3] / 2) * frameK;
    let left = Math.max(4, Math.min(cx - pw / 2, fw - pw - 4));
    let top = (entry[2] + entry[4]) * frameK + 8;
    if (top + ph > fh - 4) top = entry[2] * frameK - ph - 8;
    top = Math.max(4, Math.min(top, fh - ph - 4));
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.visibility = '';
  }

  // 팝업 바깥을 누르면 닫기
  document.addEventListener('pointerdown', (e) => {
    if (!popup.classList.contains('hidden') && !popup.contains(e.target)) hidePopup();
  }, true);

  // ----- 카드 위 터치 영역 만들기 -----
  function addHotspot(box, padX, padY, cls, label, handler) {
    let [x, y, w, h] = box;
    let x0 = Math.max(0, x - padX), y0 = Math.max(0, y - padY);
    let x1 = Math.min(CARD_W, x + w + padX), y1 = Math.min(CARD_H, y + h + padY);
    const b = document.createElement('button');
    b.className = 'hs ' + cls;
    b.setAttribute('aria-label', label);
    b.style.left = (x0 / CARD_W * 100) + '%';
    b.style.top = (y0 / CARD_H * 100) + '%';
    b.style.width = ((x1 - x0) / CARD_W * 100) + '%';
    b.style.height = ((y1 - y0) / CARD_H * 100) + '%';
    b.addEventListener('click', handler);
    hsLayer.appendChild(b);
  }

  function renderHotspots(code) {
    hsLayer.innerHTML = '';
    const h = hotspots[code];
    if (!h) return;
    addHotspot(h.t, 6, 6, 'blue', '단어 다시 듣기', () => playWord());
    addHotspot(h.d, 0, 3, 'def', '영영풀이 다시 듣기', () => playDef());
    h.r.forEach(entry => {
      addHotspot([entry[1], entry[2], entry[3], entry[4]], 3, 5, 'red', entry[0], () => playRed(entry));
    });
  }

  // ----- 카드 시작 / 이동 -----
  function preloadImage(code) {
    const img = new Image();
    img.src = `assets/img/${code}.jpg`;
  }

  function startCard(idx, remember = true) {
    stopAllAudio();
    hidePopup();
    // 지금 보던 카드를 기록해 둠 (다음 버튼·빨간 단어 팝업 이동 때). 이전 버튼으로 돌아갈 땐 기록하지 않음
    if (remember && idx !== currentIndex) {
      viewStack.push(currentIndex);
      if (viewStack.length > VIEW_STACK_MAX) viewStack.shift();
    }
    currentIndex = idx;
    wordDone = false;
    defDone = false;
    nextBtn.disabled = true;
    const code = words[idx];
    progressLabel.textContent = `${idx + 1} / ${words.length}`;
    cardImage.src = `assets/img/${code}.jpg`;
    cardImage.alt = code;
    renderHotspots(code);
    fitCard();
    preloadImage(words[(idx + 1) % words.length]);
    playWord();
  }

  const goNext = () => startCard((currentIndex + 1) % words.length);
  // 이전: 방금 전에 보던 카드로 돌아감 (기록이 없으면 목록 순서상 바로 앞 단어)
  const goPrev = () => {
    if (viewStack.length) startCard(viewStack.pop(), false);
    else startCard((currentIndex - 1 + words.length) % words.length, false);
  };

  nextBtn.addEventListener('click', () => { if (!nextBtn.disabled) goNext(); });
  prevBtn.addEventListener('click', goPrev);

  // ----- 자동재생 버튼 (켜면 예전처럼 알아서 다음 단어로) -----
  function updateAutoBtn() {
    autoBtn.classList.toggle('on', autoMode);
    autoBtn.textContent = autoMode ? '■ 자동재생 끄기' : '▶ 자동재생';
  }
  autoBtn.addEventListener('click', () => {
    autoMode = !autoMode;
    updateAutoBtn();
    if (autoMode) {
      if (wordDone && defDone) complete();      // 이미 다 읽은 상태면 바로 다음으로 진행 예약
    } else {
      clearTimeout(advanceTimer); advanceTimer = null;
      if (wordDone && defDone) setStatus('다 읽었어요! ▶ 다음을 눌러요');
    }
  });

  // ----- 들어가기 / 나가기 -----
  function enterPlayer(idx) {
    inPlayer = true;
    autoMode = false;
    updateAutoBtn();
    requestFs();                                   // 터치한 순간 전체화면 + 가로모드 요청
    listView.classList.add('hidden');
    playerView.classList.remove('hidden');
    history.pushState({ view: 'player' }, '', '#play');
    viewStack.length = 0;
    startCard(idx, false);
  }

  function exitPlayer(fromPopstate) {
    if (!inPlayer) return;
    inPlayer = false;
    stopAllAudio();
    hidePopup();
    playerView.classList.add('hidden');
    listView.classList.remove('hidden');
    leaveFs();
    if (!fromPopstate && location.hash === '#play') history.back();
  }

  backBtn.addEventListener('click', () => exitPlayer(false));
  window.addEventListener('popstate', () => { if (inPlayer) exitPlayer(true); });

})();
