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
  const pauseBtn = document.getElementById('pause-btn');
  const backBtn = document.getElementById('back-btn');

  const audioW = document.getElementById('audio-w');
  const audioD = document.getElementById('audio-d');
  const welcomeLine = document.getElementById('welcome-line');

  // ---------- 학생 식별 (관리자 페이지에서 만들어준 링크의 ?student= 값) ----------
  const studentId = new URLSearchParams(location.search).get('student') || null;

  if (studentId && typeof db !== 'undefined') {
    db.collection('students').doc(studentId).get()
      .then(doc => {
        if (doc.exists) {
          const s = doc.data();
          const name = s.name || '학생';
          welcomeLine.textContent = `${name} 학생, 안녕하세요! 단어를 터치하면 자동으로 읽어줘요`;
        }
      })
      .catch(() => { /* 학생 정보를 못 불러와도 앱은 그대로 동작 */ });
  }

  // ---------- 데이터 로드 ----------
  const words = await fetch('words.json').then(r => r.json());

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
    card.addEventListener('click', () => enterPlayer(idx));
    return card;
  }

  searchInput.addEventListener('input', () => buildGrid(searchInput.value));
  buildGrid('');

  // ---------- 재생 화면 ----------
  let currentIndex = 0;
  let stopped = true;
  let paused = false;
  let pendingTimer = null;
  let playToken = 0; // 재생 세션 토큰 (뒤로가기/일시정지 경쟁상태 방지)

  function enterPlayer(idx) {
    currentIndex = idx;
    stopped = false;
    paused = false;
    pauseBtn.textContent = '일시정지';
    listView.classList.add('hidden');
    playerView.classList.remove('hidden');
    history.pushState({ view: 'player' }, '', '#play');
    playFrom(currentIndex);
  }

  function exitPlayer(fromPopstate) {
    stopped = true;
    clearTimeout(pendingTimer);
    audioW.pause();
    audioD.pause();
    playerView.classList.add('hidden');
    listView.classList.remove('hidden');
    if (!fromPopstate) history.back();
  }

  backBtn.addEventListener('click', () => exitPlayer(false));

  window.addEventListener('popstate', () => {
    if (!stopped) exitPlayer(true);
  });

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '이어서 재생' : '일시정지';
    if (paused) {
      audioW.pause();
      audioD.pause();
      clearTimeout(pendingTimer);
      statusPill.textContent = '일시정지됨';
    } else {
      // 재생 재개: 현재 단어부터 다시 시작
      playFrom(currentIndex);
    }
  });

  function preloadImage(code) {
    const img = new Image();
    img.src = `assets/img/${code}.jpg`;
  }

  function playFrom(idx) {
    const myToken = ++playToken;
    currentIndex = idx;
    const code = words[currentIndex];

    progressLabel.textContent = `${currentIndex + 1} / ${words.length}`;
    cardImage.src = `assets/img/${code}.jpg`;
    cardImage.alt = code;

    // 다음 카드 이미지 미리 로드
    const nextCode = words[(currentIndex + 1) % words.length];
    preloadImage(nextCode);

    statusPill.textContent = '단어 읽는 중...';
    audioW.src = `assets/audio/${code}_w.mp3`;
    audioW.currentTime = 0;
    audioW.play().catch(() => {});

    audioW.onended = () => {
      if (myToken !== playToken || paused) return;
      statusPill.textContent = '잠시 후 뜻풀이...';
      pendingTimer = setTimeout(() => {
        if (myToken !== playToken || paused) return;
        statusPill.textContent = '영영풀이 읽는 중...';
        audioD.src = `assets/audio/${code}_d.mp3`;
        audioD.currentTime = 0;
        audioD.play().catch(() => {});
      }, GAP_AFTER_WORD_MS);
    };

    audioD.onended = () => {
      if (myToken !== playToken || paused) return;
      pendingTimer = setTimeout(() => {
        if (myToken !== playToken || paused || stopped) return;
        const next = (currentIndex + 1) % words.length;
        playFrom(next);
      }, GAP_AFTER_DEF_MS);
    };
  }

})();
