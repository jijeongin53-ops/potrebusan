/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Busan Audio Stories — app.js                              ║
 * ║   외국인 관광객을 위한 QR 오디오북 팟캐스트 웹앱               ║
 * ║   작성: Antigravity (Senior FE Dev)                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   0. 전역 설정 상수
────────────────────────────────────────────────────────────── */

const SHEET_ID  = '1bUHqT4Rmg4nQ9jsBUYM_Ef9CrUfgZEHAXBk0Gj2LCRY';
const SHEET_GID = '0'; // 「오디오 파일 저장소」 탭 (첫 번째 탭)

/** 구글 시트 공개 CSV 다운로드 URL */
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const DEMO_FALLBACK = [
  {
    id:          'book01',
    title:       'The Memory of Bosu-dong',
    description: "A 30-minute immersive audio journey through Busan's legendary book alley at Bosu-dong.",
    imageUrl:    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
    audioUrl:    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  }
];

/* ──────────────────────────────────────────────────────────────
   1. 다국어(i18n) 사전 및 언어 전환
────────────────────────────────────────────────────────────── */

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
    passwordTitle: 'Private Story',
    passwordDesc:  'This audio story is protected. Please enter the password to listen.',
    passwordBtn:   'Unlock Story',
    passwordError: 'Incorrect password. Please try again.',
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
    passwordTitle: '보안 스토리',
    passwordDesc:  '이 콘텐츠는 비밀번호로 보호되어 있습니다. 비밀번호를 입력해 주세요.',
    passwordBtn:   '잠금 해제',
    passwordError: '비밀번호가 틀렸습니다. 다시 시도해 주세요.',
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
    idMissingDesc: 'このページは釜山の現地に設置されたQRコードをスキャンしてアクセスします。',
    passwordTitle: 'プライベートストーリー',
    passwordDesc:  '保護されたストーリーです。パスワードを入力してください。',
    passwordBtn:   'ロック解除',
    passwordError: 'パスワードが違います。',
  },
};

let currentLang = 'en';
const t = (key) => I18N[currentLang]?.[key] ?? I18N['en'][key];

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

function updateI18nUI() {
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.textContent = t('loading');

  const errorTitle = document.getElementById('error-title');
  const errorDesc  = document.getElementById('error-desc');
  if (errorTitle) errorTitle.textContent = t('errorTitle');
  if (errorDesc)  errorDesc.textContent  = t('errorDesc');

  const dlLabel = document.getElementById('download-label');
  if (dlLabel) dlLabel.textContent = t('save');

  const pwTitle = document.getElementById('password-title');
  // I18N 객체에 passwordDesc 등 누락된 텍스트가 있을 수 있으므로 기본값 추가
  const pwDesc  = document.getElementById('password-desc');
  const pwBtn   = document.getElementById('password-submit-btn')?.querySelector('span');
  const pwErr   = document.getElementById('password-error');

  if (pwTitle) pwTitle.textContent = t('passwordTitle') || 'Private Story';
  if (pwDesc)  pwDesc.textContent  = t('passwordDesc') || 'Please enter the password.';
  if (pwBtn)   pwBtn.textContent   = t('passwordBtn') || 'Unlock';
  if (pwErr)   pwErr.textContent   = t('passwordError') || 'Incorrect password.';
}

// URL 파라미터 파싱 제거 (이제 사용하지 않음)

/* ──────────────────────────────────────────────────────────────
   3. 구글 시트 CSV 파싱 및 데이터 조회
────────────────────────────────────────────────────────────── */

function parseCSV(csvText) {
  const chars = csvText.split('');
  const lines = [];
  let currentLine = [], current = '', inQuotes = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '"') {
      if (inQuotes && chars[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      currentLine.push(current.trim()); current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && chars[i + 1] === '\n') i++;
      currentLine.push(current.trim());
      lines.push(currentLine); currentLine = []; current = '';
    } else { current += ch; }
  }
  if (current || currentLine.length > 0) {
    currentLine.push(current.trim()); lines.push(currentLine);
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

// 기존 fetchStoryData 통신 방식 대체
// 비밀번호를 기반으로 전체 데이터를 로드하기 위한 전역 캐시
let allRowsCache = [];

async function preloadCSV() {
  try {
    console.info('[Sheet] Fetching CSV:', SHEET_CSV_URL);
    const response = await fetch(SHEET_CSV_URL, { cache: 'no-cache' });
    if (response.ok) {
      const csvText = await response.text();
      allRowsCache = parseCSV(csvText);
      console.info('[Sheet] Loaded rows:', allRowsCache.length);
    }
  } catch (err) {
    console.error('[Sheet] Fetch Error:', err);
  }
}

function convertDriveLink(url) {
  if (!url || !url.includes('drive.google.com')) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match && match[1] ? `https://drive.google.com/uc?export=download&id=${match[1]}` : url;
}

/* ──────────────────────────────────────────────────────────────
   4. UI 제어
────────────────────────────────────────────────────────────── */

function showLoading() {
  document.getElementById('loading-screen').className = 'flex-1 flex flex-col items-center justify-center';
  document.getElementById('error-screen').className = 'hidden';
  document.getElementById('password-screen').className = 'hidden';
  document.getElementById('main-content').className = 'hidden';
  document.getElementById('player-footer').className = 'hidden';
}

function showError(titleKey, descKey) {
  document.getElementById('loading-screen').className = 'hidden';
  document.getElementById('error-screen').className = 'flex-1 flex flex-col items-center justify-center px-6 gap-5';
  document.getElementById('error-title').textContent = t(titleKey);
  document.getElementById('error-desc').textContent = t(descKey);
}

function showPasswordScreen() {
  document.getElementById('loading-screen').className = 'hidden';
  document.getElementById('password-screen').className = 'flex-1 flex flex-col items-center justify-center px-6 gap-8 text-center fade-in';
  document.getElementById('password-input').value = '';
  document.getElementById('password-input').focus();
}

function hidePasswordScreen() {
  document.getElementById('password-screen').className = 'hidden';
}

function showContent() {
  document.getElementById('loading-screen').className = 'hidden';
  document.getElementById('password-screen').className = 'hidden';
  document.getElementById('main-content').className = 'flex-1 flex flex-col px-4 pb-4 fade-in';
  document.getElementById('player-footer').className = 'fixed bottom-0 left-0 right-0 z-30';
}

function renderStoryContent(data) {
  document.getElementById('story-title').textContent = data.title;
  document.getElementById('story-description').textContent = data.description;
  const coverImg = document.getElementById('cover-image');
  coverImg.src = data.imageUrl;
  
  const finalAudioUrl = convertDriveLink(data.audioUrl);
  document.getElementById('audio-player').src = finalAudioUrl;
  document.getElementById('download-btn').dataset.url = finalAudioUrl;
}

/* ──────────────────────────────────────────────────────────────
   5. 플레이어 로직
────────────────────────────────────────────────────────────── */

const audio = document.getElementById('audio-player');
const progressBar = document.getElementById('progress-bar');

function formatTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function initPlayer() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = document.getElementById('play-icon');

  playPauseBtn.onclick = () => audio.paused ? audio.play() : audio.pause();
  
  audio.onplay = () => playIcon.className = 'fa-solid fa-pause text-warm-900 text-xl';
  audio.onpause = () => playIcon.className = 'fa-solid fa-play text-warm-900 text-xl ml-1';
  
  audio.ontimeupdate = () => {
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    progressBar.style.setProperty('--progress', `${pct}%`);
    document.getElementById('current-time').textContent = formatTime(audio.currentTime);
  };
  
  audio.onloadedmetadata = () => {
    document.getElementById('total-time').textContent = formatTime(audio.duration);
  };

  progressBar.oninput = () => {
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  };

  document.getElementById('forward-btn').onclick = () => audio.currentTime += 15;
}

/* ──────────────────────────────────────────────────────────────
   6. 초기화 (앱 메인 로직)
────────────────────────────────────────────────────────────── */

async function initApp() {
  initLangSwitcher();
  initPlayer();

  // 사용자 요청: 앱 시작 시 무조건 패스워드 입력창이 가장 먼저 나온다.
  showPasswordScreen();
  
  // 패스워드 화면을 표시해둔 상태에서 백그라운드로 CSV 데이터 미리 로드
  await preloadCSV();

  const form = document.getElementById('password-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const inputPw = document.getElementById('password-input').value.trim();
    const errorEl = document.getElementById('password-error');
    const submitBtn = document.getElementById('password-submit-btn');

    if (!inputPw) return;

    // 만약 데이터가 아직 없다면(또는 로드 실패였다면) 다시 로드
    if (allRowsCache.length === 0) {
      submitBtn.disabled = true;
      showLoading();
      await preloadCSV();
      submitBtn.disabled = false;
      document.getElementById('loading-screen').className = 'hidden';
    }

    // "그 패스워드에 해당하는 파일" 찾기
    // 시트의 password 필드가 사용자 입력값과 일치하는 행을 찾는다.
    const foundData = allRowsCache.find(row => 
      row.password && row.password.trim() === inputPw
    );

    if (foundData) {
      // 패스워드 매칭 성공 시 데이터 매핑
      const storyData = {
        id:          foundData['id']          || 'Unknown',
        title:       foundData['title']       || 'Untitled Story',
        description: foundData['description'] || '',
        imageUrl:    foundData['imageurl']    || foundData['imageUrl'] || '',
        audioUrl:    foundData['audiourl']    || foundData['audioUrl'] || ''
      };

      hidePasswordScreen();
      renderStoryContent(storyData);
      showContent();
    } else {
      // 데모 데이터에서 일치하는 비밀번호가 있는지 확인
      const demoData = DEMO_FALLBACK.find(row => row.id === inputPw || row.password === inputPw);
      if (demoData) {
        hidePasswordScreen();
        renderStoryContent(demoData);
        showContent();
        return;
      }

      // 일치하는 패스워드를 찾을 수 없음
      errorEl.classList.remove('hidden');
      errorEl.textContent = t('passwordError') || "Incorrect password. Please try again.";
      setTimeout(() => errorEl.classList.add('hidden'), 3000);
    }
  };
}

document.addEventListener('DOMContentLoaded', initApp);
