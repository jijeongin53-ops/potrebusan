/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Busan Audio Stories — app.js                              ║
 * ║   외국인 관광객을 위한 QR 오디오북 팟캐스트 웹앱               ║
 * ║   작성: Antigravity (Senior FE Dev)                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 주요 모듈:
 *   1. 다국어(i18n) 사전 및 언어 전환 로직
 *   2. 구글 시트 CSV 직접 읽기 (GAS/백엔드 불필요)
 *   3. HTML5 Audio 재생 컨트롤 (play/pause/seek/skip)
 *   4. Media Session API (잠금화면 컨트롤)
 *   5. 오프라인 다운로드 기능
 *   6. UI 업데이트 헬퍼 함수
 *
 * 접근 제어:
 *   - URL에 ?id= 파라미터가 없으면 QR코드 안내 화면 표시
 *   - ?id= 값이 시트에 없으면 "스토리를 찾을 수 없음" 에러 표시
 *   - 즉, 유효한 QR코드 없이는 어떤 콘텐츠도 재생·다운로드 불가
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   0. 전역 설정 상수
────────────────────────────────────────────────────────────── */

/**
 * 구글 시트 정보.
 *
 * SHEET_ID  : 스프레드시트 URL의 /d/ 뒤에 오는 긴 문자열
 * SHEET_GID : 하단 탭의 gid 값 (URL의 #gid= 뒤 숫자)
 *
 * ⚠️ 시트 1행(헤더): id | title | description | imageUrl | audioUrl
 * ⚠️ 시트는 「링크가 있는 모든 사용자 - 뷰어」로 공유되어야 함
 */
const SHEET_ID  = '1bUHqT4Rmg4nQ9jsBUYM_Ef9CrUfgZEHAXBk0Gj2LCRY';
const SHEET_GID = '1030888258'; // 「오디오 파일 저장소」 탭

/** 구글 시트 공개 CSV 다운로드 URL */
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/**
 * 개발·UI 확인용 데모 데이터.
 * 시트에 동일한 id가 없을 때만 폴백으로 사용된다.
 * 실제 운영 시에는 시트 데이터가 항상 우선한다.
 */
const DEMO_FALLBACK = [
  {
    id:          'book01',
    title:       'The Memory of Bosu-dong',
    description: "A 30-minute immersive audio journey through Busan's legendary book alley at Bosu-dong. Discover how this street emerged from the ruins of the Korean War, becoming a sanctuary of knowledge and second-hand stories for the people of Busan.",
    imageUrl:    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
    audioUrl:    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id:          'book02',
    title:       'Gamcheon: The Santorini of Busan',
    description: 'Explore the rainbow-colored hillside village of Gamcheon, where narrow alleys wind between pastel houses and hidden murals tell the stories of generations.',
    imageUrl:    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    audioUrl:    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id:          'book03',
    title:       'Jagalchi: Voice of the Sea',
    description: "At Korea's largest fish market, the voices of the haenyeo echo through decades of maritime tradition. Listen to the living history of Jagalchi.",
    imageUrl:    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    audioUrl:    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

/* ──────────────────────────────────────────────────────────────
   1. 다국어(i18n) 사전 및 언어 전환
────────────────────────────────────────────────────────────── */

/** 지원 언어: EN / KO / JA */
const I18N = {
  en: {
    loading:       'Loading story...',
    errorTitle:    'Story Not Found',
    errorDesc:     "We couldn't load this audio story.\nPlease check the QR code and try again.",
    location:      'Busan, Korea',
    save:          'Save',
    saveSuccess:   'Saved!',
    tryAgain:      'Try Again',
    idMissing:     'Please Scan a QR Code',
    idMissingDesc: 'This page is accessed by scanning a QR code at a Busan location. No direct access is available.',
  },
  ko: {
    loading:       '이야기를 불러오는 중...',
    errorTitle:    '이야기를 찾을 수 없습니다',
    errorDesc:     '오디오 이야기를 불러오지 못했습니다.\nQR코드를 확인하고 다시 시도해 주세요.',
    location:      '부산, 대한민국',
    save:          '저장',
    saveSuccess:   '저장됨!',
    tryAgain:      '다시 시도',
    idMissing:     'QR코드를 스캔해 주세요',
    idMissingDesc: '이 페이지는 부산의 현장에 설치된 QR코드를 스캔하여 접속합니다.\n직접 접속은 지원하지 않습니다.',
  },
  ja: {
    loading:       'ストーリーを読み込み中...',
    errorTitle:    'ストーリーが見つかりません',
    errorDesc:     'オーディオストーリーを読み込めませんでした。\nQRコードを確認して再試行してください。',
    location:      '釜山、韓国',
    save:          '保存',
    saveSuccess:   '保存済み',
    tryAgain:      '再試行',
    idMissing:     'QRコードをスキャンしてください',
    idMissingDesc: 'このページは釜山の現地に設置されたQRコードをスキャンしてアクセスします。\n直接アクセスはできません。',
  },
};

/** 현재 활성 언어 (기본값: 영어) */
let currentLang = 'en';

/** 현재 언어의 번역 텍스트를 반환하는 헬퍼 */
const t = (key) => I18N[currentLang]?.[key] ?? I18N['en'][key];

/**
 * 언어 전환 버튼 초기화.
 */
function initLangSwitcher() {
  const buttons = document.querySelectorAll('.lang-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = lang;
      updateI18nUI();
    });
  });
}

/**
 * 언어 변경 시 UI 텍스트를 업데이트한다.
 */
function updateI18nUI() {
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.textContent = t('loading');

  const errorTitle = document.getElementById('error-title');
  const errorDesc  = document.getElementById('error-desc');
  if (errorTitle) errorTitle.textContent = t('errorTitle');
  if (errorDesc)  errorDesc.textContent  = t('errorDesc');

  const dlLabel = document.getElementById('download-label');
  if (dlLabel) dlLabel.textContent = t('save');
}

/* ──────────────────────────────────────────────────────────────
   2. URL 파라미터 파싱
────────────────────────────────────────────────────────────── */

/**
 * URL의 QueryString에서 'id' 파라미터를 읽어 반환한다.
 * 예: ?id=book01 → 'book01'
 * @returns {string|null}
 */
function getStoryIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/* ──────────────────────────────────────────────────────────────
   3. 구글 시트 CSV 파싱 및 데이터 조회
────────────────────────────────────────────────────────────── */

/**
 * CSV 문자열을 객체 배열로 파싱한다.
 * - 1행 = 헤더(컬럼명)
 * - 2행~ = 데이터
 * - 큰따옴표로 감싼 셀(쉼표·줄바꿈 포함) 처리 지원
 *
 * @param {string} csvText - 구글 시트에서 받은 CSV 원문
 * @returns {Array<Object>} 헤더를 키로 한 객체 배열
 */
function parseCSV(csvText) {
  const chars = csvText.split('');
  const lines = [];
  let currentLine = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch === '"') {
      // 연속 큰따옴표 ("") = 이스케이프된 큰따옴표
      if (inQuotes && chars[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentLine.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && chars[i + 1] === '\n') i++;
      currentLine.push(current.trim());
      lines.push(currentLine);
      currentLine = [];
      current = '';
    } else {
      current += ch;
    }
  }
  // 마지막 셀/행 처리
  if (current || currentLine.length > 0) {
    currentLine.push(current.trim());
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.toLowerCase().trim());

  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    if (row.every(cell => cell === '')) continue;
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    rows.push(obj);
  }

  return rows;
}

/**
 * 구글 시트에서 CSV를 fetch하여 storyId에 해당하는 스토리를 반환한다.
 *
 * 접근 제어 규칙:
 *   - storyId는 반드시 존재해야 함 (없으면 이 함수 호출 전에 차단됨)
 *   - 시트에 해당 id가 있으면 시트 데이터 반환
 *   - 시트에 없으면 DEMO_FALLBACK에서 검색 (개발용)
 *   - 어디에도 없으면 에러 throw → "스토리 없음" UI 표시
 *
 * @param {string} storyId - URL ?id= 값 (반드시 유효한 문자열)
 * @returns {Promise<Object>} { status: 'success', data: {...} }
 */
async function fetchStoryData(storyId) {
  console.info('[Sheet] 구글 시트 CSV 로드 시작:', SHEET_CSV_URL);

  const response = await fetch(SHEET_CSV_URL, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`[Sheet] CSV fetch 실패: HTTP ${response.status}. 시트 공유 설정을 확인하세요.`);
  }

  const csvText = await response.text();
  const allRows = parseCSV(csvText);
  console.info(`[Sheet] 파싱된 행 수: ${allRows.length}`);

  // 시트에서 id 검색
  const found = allRows.find(row =>
    (row['id'] || '').toLowerCase() === storyId.toLowerCase()
  );

  if (found) {
    console.info('[Sheet] 스토리 데이터 로드 성공:', found['title']);
    return {
      status: 'success',
      data: {
        id:          found['id']          || storyId,
        title:       found['title']       || '제목 없음',
        description: found['description'] || '',
        imageUrl:    found['imageurl']    || found['imageUrl'] || '',
        audioUrl:    found['audiourl']    || found['audioUrl'] || '',
      },
    };
  }

  // 시트에 없으면 데모 폴백에서 검색 (개발·테스트용)
  const demo = DEMO_FALLBACK.find(r => r.id?.toLowerCase() === storyId.toLowerCase());
  if (demo) {
    console.warn(`[Sheet] 시트에 id='${storyId}' 없음 → 데모 데이터 사용`);
    return { status: 'success', data: { ...demo } };
  }

  // 어디에도 없으면 에러
  throw new Error(`[Sheet] id='${storyId}'에 해당하는 스토리가 없습니다.`);
}

/* ──────────────────────────────────────────────────────────────
   4. UI 렌더링 헬퍼
────────────────────────────────────────────────────────────── */

/** 로딩 화면 표시 */
function showLoading() {
  document.getElementById('loading-screen').classList.remove('hidden');
  document.getElementById('loading-screen').classList.add('flex');
  document.getElementById('error-screen').classList.add('hidden');
  document.getElementById('error-screen').classList.remove('flex');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('player-footer').classList.add('hidden');
}

/**
 * 에러 화면 표시
 * @param {string} titleKey - I18N 키
 * @param {string} descKey  - I18N 키
 */
function showError(titleKey, descKey) {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('loading-screen').classList.remove('flex');
  document.getElementById('error-screen').classList.remove('hidden');
  document.getElementById('error-screen').classList.add('flex');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('player-footer').classList.add('hidden');

  document.getElementById('error-title').textContent = t(titleKey || 'errorTitle');
  document.getElementById('error-desc').textContent  = t(descKey  || 'errorDesc');
}

/** 메인 콘텐츠 + 플레이어 표시 */
function showContent() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('loading-screen').classList.remove('flex');
  document.getElementById('error-screen').classList.add('hidden');
  document.getElementById('error-screen').classList.remove('flex');
  document.getElementById('main-content').classList.remove('hidden');
  document.getElementById('main-content').classList.add('flex');
  document.getElementById('player-footer').classList.remove('hidden');
}

/**
 * 스토리 데이터로 콘텐츠 영역을 채운다.
 * @param {Object} data - fetched story data
 */
function renderStoryContent(data) {
  document.getElementById('story-title').textContent = data.title || 'Untitled Story';
  document.getElementById('story-description').textContent = data.description || '';

  const coverImg = document.getElementById('cover-image');
  coverImg.src = data.imageUrl || '';
  coverImg.alt = `Cover: ${data.title}`;
  coverImg.onerror = () => {
    coverImg.style.display = 'none';
    coverImg.parentElement.style.background = 'linear-gradient(135deg, #3e2b0e 0%, #1a1008 100%)';
  };

  const audioPlayer = document.getElementById('audio-player');
  audioPlayer.src = data.audioUrl || '';

  // 다운로드 버튼에 URL과 파일명 저장
  document.getElementById('download-btn').dataset.url      = data.audioUrl || '';
  document.getElementById('download-btn').dataset.filename = `${data.id || 'busan-story'}.mp3`;

  document.title = `${data.title} — Busan Audio Stories`;
}

/* ──────────────────────────────────────────────────────────────
   5. 시간 포맷 유틸리티
────────────────────────────────────────────────────────────── */

/**
 * 초를 'M:SS' 형식으로 변환한다.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ──────────────────────────────────────────────────────────────
   6. 오디오 플레이어 컨트롤
────────────────────────────────────────────────────────────── */

const audio          = document.getElementById('audio-player');
const playPauseBtn   = document.getElementById('play-pause-btn');
const playIcon       = document.getElementById('play-icon');
const progressBar    = document.getElementById('progress-bar');
const currentTimeEl  = document.getElementById('current-time');
const totalTimeEl    = document.getElementById('total-time');
const downloadBtn    = document.getElementById('download-btn');
const waveVisualizer = document.getElementById('wave-visualizer');

let isPlaying = false;

/**
 * 재생/일시정지 UI 상태를 동기화한다.
 */
function syncPlayUI(playing) {
  isPlaying = playing;

  if (playing) {
    playIcon.classList.replace('fa-play', 'fa-pause');
    playIcon.classList.remove('ml-1');
    playPauseBtn.classList.add('playing-pulse');
    waveVisualizer.classList.remove('hidden');
    waveVisualizer.querySelectorAll('.wave-bar').forEach(b => b.classList.remove('paused'));
  } else {
    playIcon.classList.replace('fa-pause', 'fa-play');
    playIcon.classList.add('ml-1');
    playPauseBtn.classList.remove('playing-pulse');
    waveVisualizer.querySelectorAll('.wave-bar').forEach(b => b.classList.add('paused'));
  }
}

/**
 * 오디오 플레이어 이벤트 바인딩.
 */
function initPlayer() {
  /* 재생/일시정지 토글 */
  playPauseBtn.addEventListener('click', () => {
    if (audio.paused || audio.ended) {
      audio.play().catch(err => console.error('[Audio] 재생 오류:', err));
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play',  () => { syncPlayUI(true);  updateMediaSession(); });
  audio.addEventListener('pause', () => { syncPlayUI(false); });

  audio.addEventListener('ended', () => {
    syncPlayUI(false);
    audio.currentTime = 0;
    progressBar.value = 0;
    progressBar.style.setProperty('--progress', '0%');
    currentTimeEl.textContent = '0:00';
  });

  audio.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  /* 진행률 바 업데이트 */
  audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration) || audio.duration === 0) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    progressBar.style.setProperty('--progress', `${pct.toFixed(2)}%`);
    currentTimeEl.textContent = formatTime(audio.currentTime);
    updateMediaSessionPosition();
  });

  /* 슬라이더 탐색(Seek) */
  progressBar.addEventListener('input', () => {
    const pct = parseFloat(progressBar.value);
    progressBar.style.setProperty('--progress', `${pct.toFixed(2)}%`);
    currentTimeEl.textContent = formatTime((pct / 100) * audio.duration);
  });
  progressBar.addEventListener('change', () => {
    if (!isNaN(audio.duration)) {
      audio.currentTime = (parseFloat(progressBar.value) / 100) * audio.duration;
    }
  });

  /* 15초 앞으로 */
  document.getElementById('forward-btn').addEventListener('click', () => {
    audio.currentTime = Math.min(audio.currentTime + 15, audio.duration || 0);
  });

  /* 다운로드 */
  downloadBtn.addEventListener('click', handleDownload);

  /* 오디오 에러 */
  audio.addEventListener('error', () => {
    totalTimeEl.textContent = 'Error';
  });
}

/* ──────────────────────────────────────────────────────────────
   7. 오프라인 다운로드 (MP3 저장)
────────────────────────────────────────────────────────────── */

/**
 * 현재 스토리의 오디오 파일을 사용자 기기에 저장한다.
 * QR코드로 접근한 해당 스토리의 파일만 다운로드된다.
 */
async function handleDownload() {
  const url      = downloadBtn.dataset.url;
  const filename = downloadBtn.dataset.filename || 'busan-audio.mp3';
  const label    = document.getElementById('download-label');

  if (!url) return;

  downloadBtn.disabled = true;
  downloadBtn.querySelector('i').className = 'fa-solid fa-spinner text-sepia-300 text-sm spinner';
  label.textContent = '...';

  try {
    // Blob으로 다운로드 → 로컬 저장
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob      = await res.blob();
    const blobURL   = URL.createObjectURL(blob);
    const a         = document.createElement('a');
    a.href          = blobURL;
    a.download      = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobURL), 10000);

    downloadBtn.querySelector('i').className = 'fa-solid fa-check text-green-400 text-sm';
    label.textContent = t('saveSuccess');

  } catch (err) {
    console.error('[Download] 다운로드 실패 — 직접 링크 방식으로 폴백:', err);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.target   = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    downloadBtn.querySelector('i').className = 'fa-solid fa-download text-sepia-300 text-sm';
    label.textContent = t('save');
  } finally {
    setTimeout(() => {
      downloadBtn.disabled = false;
      downloadBtn.querySelector('i').className = 'fa-solid fa-check text-green-400 text-sm';
    }, 3000);
  }
}

/* ──────────────────────────────────────────────────────────────
   8. Media Session API — 잠금 화면 & 이어폰 컨트롤 연동
────────────────────────────────────────────────────────────── */

/**
 * 잠금 화면 및 이어폰 컨트롤을 위한 Media Session 메타데이터 등록.
 * @param {Object} storyData
 */
function setupMediaSession(storyData) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  storyData?.title  || 'Busan Audio Story',
    artist: 'Busan Audio Stories',
    album:  'Local Tales of Busan',
    artwork: storyData?.imageUrl
      ? [
          { src: storyData.imageUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: storyData.imageUrl, sizes: '256x256', type: 'image/jpeg' },
        ]
      : [],
  });

  navigator.mediaSession.setActionHandler('play',         () => audio.play());
  navigator.mediaSession.setActionHandler('pause',        () => audio.pause());
  navigator.mediaSession.setActionHandler('seekbackward', (d) => {
    audio.currentTime = Math.max(audio.currentTime - (d.seekOffset || 10), 0);
  });
  navigator.mediaSession.setActionHandler('seekforward', (d) => {
    audio.currentTime = Math.min(audio.currentTime + (d.seekOffset || 15), audio.duration);
  });

  try {
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      audio.currentTime = d.seekTime;
    });
  } catch (_) { /* 구형 브라우저 무시 */ }

  console.info('[MediaSession] 등록 완료');
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
}

function updateMediaSessionPosition() {
  if (!('mediaSession' in navigator)) return;
  if (isNaN(audio.duration) || audio.duration === 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration:     audio.duration,
      playbackRate: audio.playbackRate,
      position:     audio.currentTime,
    });
  } catch (_) { /* 미지원 브라우저 무시 */ }
}

/* ──────────────────────────────────────────────────────────────
   9. 앱 진입점 (Main Entry Point)
────────────────────────────────────────────────────────────── */

/**
 * 앱 초기화 메인 함수.
 *
 * 실행 흐름:
 *   1. 언어 전환 버튼 초기화
 *   2. 오디오 플레이어 이벤트 바인딩
 *   3. URL ?id= 파라미터 읽기
 *   4. id 없으면 → QR코드 안내 화면 표시 후 종료
 *   5. id 있으면 → 구글 시트 CSV fetch → 파싱 → 렌더링
 *   6. Media Session API 설정
 */
async function initApp() {
  console.info('[App] 부산 오디오 스토리 앱 초기화 시작');

  initLangSwitcher();
  initPlayer();
  showLoading();

  // URL에서 스토리 ID 읽기
  const storyId = getStoryIdFromURL();
  console.info('[App] 스토리 ID:', storyId ?? '(없음)');

  // ── 핵심 접근 제어 ──
  // id가 없으면 어떤 콘텐츠도 표시하지 않음.
  // QR코드 없이는 재생/다운로드 불가.
  if (!storyId) {
    showError('idMissing', 'idMissingDesc');
    return;
  }

  // 구글 시트에서 해당 id 데이터 가져오기
  try {
    const response = await fetchStoryData(storyId);
    const data     = response.data;

    renderStoryContent(data);
    setupMediaSession(data);
    showContent();

    console.info('[App] 스토리 로드 완료:', data.title);

  } catch (error) {
    console.error('[App] 스토리 로드 실패:', error);
    showError('errorTitle', 'errorDesc');
  }
}

/* ──────────────────────────────────────────────────────────────
   10. DOMContentLoaded 후 앱 시작
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initApp);
