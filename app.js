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

/** 구글 드라이브-시트 자동 동기화 Google Apps Script 웹앱 URL (배포 후 입력 시 새로고침마다 자동 동기화) */
const GAS_SYNC_URL = 'https://script.google.com/macros/s/AKfycbxjhFWIXvpxPFVB4JGTtXbgOXm-g2Klyso___oSB7m-JSFbfeOw95hpBj68Z1U347r0Cg/exec';

const DEMO_FALLBACK = [
  {
    id:          'book01',
    title:       'The Memory of Bosu-dong',
    description: "A 30-minute immersive audio journey through Busan's legendary book alley at Bosu-dong.",
    imageUrl:    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
    audioUrl:    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  }
];

/** 153개 오디오북 13자리 ISBN <-> 도서명 사전 구축 데이터 (자동 스캔 및 매칭 지원) */
const PREMAPPED_ISBNS = {
  "9788971251249": "귀신은있다",
  "9791199017818": "시간을_멈추고",
  "9791167620705": "카사블랑카",
  "9791136802897": "심야연애",
  "9788954698375": "폴링",
  "9788957973554": "one fine day",
  "9791161860572": "그래도 우리는 사랑을 한다",
  "9791141186463": "봄",
  "9788961598620": "백아절현",
  "9791156819455": "리버프",
  "9788937460043": "국보와 미디어아트가 만난 범어사의 힙한 변신",
  "9788925572963": "가뭄의 돌밭에서 피어난 두구동 연꽃소류지",
  "9788963214825": "사랑이 꽃이길 열망한다",
  "9788928012367": "바닐라 에스프레소 새벽반",
  "9791136809094": "여우 볕에 숲이 열리면",
  "9791170032663": "병원에는 그들이 산다",
  "9791138485715": "아로하",
  "9791175790957": "모델",
  "9788965422709": "기적처럼",
  "9788963717579": "가고 있어",
  "9791165732080": "바람의 용",
  "9791167376565": "겨울",
  "9791158774059": "당신의 체온",
  "9788983712073": "연애결혼",
  "9788966470334": "삼거리 한약방",
  "9791130638317": "들었다 놨다",
  "9791142356049": "솔티솔티솔티",
  "9791198430922": "정우",
  "9788926760017": "처음부터 너였다",
  "9788956017600": "연애레시피",
  "9791191153231": "혜잔의 향낭",
  "9788966397846": "공녀의 노비",
  "9791131590447": "그 여름을 기억하니",
  "9791158104955": "당신은 나를 좋아해",
  "9788959136230": "D등급 그녀",
  "9788939571389": "안아 주고 싶어",
  "9788954208581": "시비스킷에 관하여",
  "9791193939611": "눈꽃",
  "9791196632014": "너와 사는 오늘",
  "9791172267780": "봄바람",
  "9788991396173": "내 사랑 원더우먼",
  "9788993883497": "홍분지기",
  "9788962015102": "우애수",
  "9788963711683": "프렌치러브박스",
  "9791197504181": "문이 열리는 순간",
  "9788963711744": "가스라기",
  "9791165384982": "진심",
  "9788925716923": "오리 노예 생존기",
  "9791129568007": "낯설지만 익숙한",
  "9791186907863": "잔향",
  "9788974663001": "내 아내는보스",
  "9791158328894": "마치 마법처럼",
  "9788925574523": "너의 숲으로",
  "9784801914391": "진홍의 귀공자",
  "9788991396357": "위험한 휴가",
  "9798736520428": "웰컴 닥터장",
  "9788955136906": "단 하나의 표적",
  "9788995302101": "햇살나무",
  "9791168615274": "은장도",
  "9788950950590": "길들여지다",
  "9788958384038": "어느전투조종사의 사랑",
  "9791185687278": "철의 여인",
  "9791124249031": "뜨거운안녕",
  "9788937461798": "이게사랑일까봐",
  "9791199820500": "새기다",
  "9791193394878": "단팥빵",
  "9788932475578": "렌",
  "9791125824596": "호랑이신부",
  "9788957633229": "그만의 사랑방식",
  "9788962016093": "찬란하게 빛나리",
  "9791163031932": "사랑을 기억하며",
  "9791128392627": "응급  사랑에 대처하는 방법",
  "9791158886356": "황금숲",
  "9788925239163": "고슴도치치료하기",
  "9791138518642": "검을든꽃",
  "9791167073006": "태화",
  "9791176860109": "바람",
  "9791126441273": "로스트헤븐",
  "9788959741342": "연록흔",
  "9788961598927": "파문이 나를 새길 때",
  "9791194891055": "패러독스",
  "9791193790403": "해리",
  "9784769911371": "해중림",
  "9791156191087": "소랑호젠",
  "9791130323237": "우로",
  "9791188941957": "경계를 넘다",
  "9788967759841": "그녀의 미소는 그를 미치게 한다",
  "9791192756295": "밤을 걷다",
  "9788954449670": "사랑 바이러스",
  "9791168731387": "봄그리고봄",
  "9788957462997": "당신의 연인",
  "9791191401042": "디어마이디어",
  "9791131525067": "세운대학병원",
  "9788915008601": "베이비 베이비",
  "9788929800741": "그대 창에 햇살이 내리면",
  "9791186907658": "사랑을사랑이라고말하다",
  "9788952783257": "메리크리스마스",
  "9791126402229": "월흔",
  "9791165799106": "닥터블랙",
  "9791127888619": "아찔한결혼",
  "9791199489561": "혜잔의향낭",
  "9791199303713": "찬란하게빛나리",
  "9788932043500": "봄밤",
  "9791194725299": "꽃보라",
  "9788928011988": "완 치프와 양갱이",
  "9791162145722": "메이비",
  "9788963211701": "나비와 뼈다귀",
  "9788961591348": "당신은 가벼운 남자",
  "9791134861643": "닥터드래곤",
  "9788994300115": "발칙한 연애",
  "9791189877521": "낙연",
  "9788958387367": "당신의 심장에 정조준",
  "9791131574690": "바다는 창문을 열고",
  "9791185687490": "사랑은 맛있다",
  "9788928032334": "그 바람이 너로 가득해서",
  "9788963213217": "블루문 특급",
  "9791176612654": "연애",
  "9791191360196": "우량하",
  "9791156226543": "사랑에 사랑을 더하다",
  "9791161306124": "돌아보니 첫사랑",
  "9788965421030": "ER",
  "9791132560838": "솔미솔파",
  "9788979441734": "사랑하는 사람이 생겼습니다",
  "9791158108007": "목요일에 만나면",
  "9788901046099": "그녀석",
  "9791159922251": "프로파일러",
  "9791125528982": "친구네 집에 갔는데 친구는 없고",
  "9788970754925": "바람만이 아는 대답",
  "9788962010688": "오렌지 마멀레이드",
  "9788998102463": "신랑급구",
  "9791129477385": "담벼락 헌책방",
  "9788962015577": "365일 추리닝",
  "9788926760826": "쏘 인 러브",
  "9791156410362": "나의 독재자",
  "9791156821106": "공작의 청혼",
  "9788966399840": "북촌의 사금파리",
  "9791175772892": "지금",
  "9788941333715": "콘판나",
  "9791176821674": "길",
  "9791194847076": "비늘",
  "9788974282691": "심장은 붉게 물들다",
  "9791198502520": "사랑도 아니면서",
  "9791131569016": "어린 여자 어른 남자",
  "9788926706794": "나무를 담벼락에 끌고 가지 말라",
  "9788962015768": "경성 블루스",
  "9791130009803": "불가분의 연애",
  "9788968970740": "내 안의 악마를 위하여",
  "9791165704339": "솔",
  "9791104912597": "영애의 경호관",
  "9791156410393": "앵화연담",
  "9788954420860": "에이크",
  "9791156300380": "A컵 그녀",
  "9788936447014": "아홉 살 마음 사전"
};

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
    passwordTitle: 'Private Audio Library',
    passwordDesc:  'Please enter the access code to listen.',
    passwordBtn:   'Enter Library',
    passwordError: 'Incorrect code. Please try again.',
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
    passwordTitle: '오디오북 도서관',
    passwordDesc:  '액세스 코드를 입력해 주세요.',
    passwordBtn:   '입장하기',
    passwordError: '코드가 틀렸습니다. 다시 시도해 주세요.',
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
    passwordTitle: 'オーディオライブラリ',
    passwordDesc:  'アクセスコードを入力してください。',
    passwordBtn:   '入場する',
    passwordError: 'コードが違います。再試行してください。',
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
    // Apps Script 동기화 URL이 설정되어 있다면 백그라운드로 호출 (사용자 진입을 15초 동안 차단하지 않도록 비동기 실행)
    if (typeof GAS_SYNC_URL !== 'undefined' && GAS_SYNC_URL) {
      console.info('[Sync] Triggering Drive-to-Sheet sync (background)...');
      fetch(GAS_SYNC_URL, { mode: 'no-cors' }).catch(syncErr => {
        console.warn('[Sync] Drive sync failed or skipped:', syncErr);
      });
    }

    const freshUrl = `${SHEET_CSV_URL}&t=${Date.now()}`;
    console.info('[Sheet] Fetching CSV:', freshUrl);

    // 모바일 통신 지연 시 무한 대기를 방지하기 위해 6초 타임아웃 적용
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(freshUrl, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);

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

/**
 * 앱 사용 현황 로깅 (구글 시트 '앱 사용 현황' 탭에 자동 기록)
 * @param {string} playTitle 재생된 책제목 (재생 이벤트인 경우)
 * @param {string} downloadTitle 다운로드된 책제목 (다운로드 이벤트인 경우)
 */
function logAppUsage(playTitle = '', downloadTitle = '') {
  if (!GAS_SYNC_URL) return;
  try {
    const now = new Date();
    const kstOffset = 9 * 60; // KST (+09:00)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstDate = new Date(utc + (kstOffset * 60000));
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${kstDate.getFullYear()}-${pad(kstDate.getMonth() + 1)}-${pad(kstDate.getDate())} ${pad(kstDate.getHours())}:${pad(kstDate.getMinutes())}:${pad(kstDate.getSeconds())}`;

    const params = new URLSearchParams({
      type: 'log',
      date: dateStr,
      play: playTitle,
      download: downloadTitle
    });

    const url = `${GAS_SYNC_URL}?${params.toString()}`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { mode: 'no-cors' });
    }
  } catch (e) {
    console.warn('[Log] Failed to send usage log:', e);
  }
}

/* ──────────────────────────────────────────────────────────────
   4. UI 제어
────────────────────────────────────────────────────────────── */

function showLoading() {
  document.getElementById('loading-screen').className = 'flex-1 flex flex-col items-center justify-center';
  document.getElementById('error-screen').className = 'hidden';
  document.getElementById('password-screen').className = 'hidden';
  document.getElementById('library-screen').className = 'hidden';
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
  document.getElementById('library-screen').className = 'hidden';
  document.getElementById('main-content').className = 'hidden';
  document.getElementById('player-footer').className = 'hidden';
  document.getElementById('password-screen').className = 'flex-1 flex flex-col items-center justify-center px-6 gap-8 text-center fade-in';
  document.getElementById('password-input').value = '';
  document.getElementById('password-input').focus();
}

function hidePasswordScreen() {
  document.getElementById('password-screen').className = 'hidden';
}

function showLibraryScreen() {
  document.getElementById('loading-screen').className = 'hidden';
  document.getElementById('password-screen').className = 'hidden';
  document.getElementById('main-content').className = 'hidden';
  document.getElementById('player-footer').className = 'hidden';
  document.getElementById('library-screen').className = 'flex-1 flex flex-col px-4 pt-4 pb-12 fade-in relative z-10 overflow-y-auto';
}

function showContent() {
  document.getElementById('loading-screen').className = 'hidden';
  document.getElementById('password-screen').className = 'hidden';
  document.getElementById('library-screen').className = 'hidden';
  document.getElementById('main-content').className = 'flex-1 flex flex-col px-4 pb-4 pt-2 gap-5 relative z-10 overflow-y-auto fade-in';
  document.getElementById('player-footer').className = 'fixed bottom-0 left-0 right-0 z-30';
}

function renderStoryContent(data) {
  document.getElementById('story-title').textContent = data.title;
  document.getElementById('story-description').textContent = data.description;
  // coverImg 로직 제거 (모든 스토리가 동일한 턴테이블 디자인을 사용)
  
  const imgBtnMatch = (data.audioUrl || '').match(/\/d\/([a-zA-Z0-9_-]+)/);
  const finalAudioUrl = imgBtnMatch ? `/api/proxy?id=${imgBtnMatch[1]}` : data.audioUrl;
  
  const audioEl = document.getElementById('audio-player');
  // 구글 드라이브 재생 시 CORS 우회를 위해 속성 강제 제거
  audioEl.removeAttribute('crossorigin'); 
  audioEl.src = finalAudioUrl;
  
  // 다운로드 버튼에 필요한 정보 저장
  const downloadBtn = document.getElementById('download-btn');
  // 다운로드는 브라우저 새 창에서 원본 링크로 직접 다운받는게 가장 안전함 (대용량 proxy 방지)
  const directDownloadUrl = imgBtnMatch ? `https://drive.google.com/uc?export=download&id=${imgBtnMatch[1]}` : finalAudioUrl;
  downloadBtn.dataset.url = directDownloadUrl;
  downloadBtn.dataset.title = data.title || 'Untitled';
  downloadBtn.dataset.filename = (data.title || 'busan-story') + '.mp3';
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
  
  audio.onplay = () => {
    playIcon.className = 'fa-solid fa-pause text-warm-900 text-xl';
    const vinyl = document.getElementById('vinyl-record');
    if (vinyl) vinyl.classList.remove('paused');
  };
  audio.onpause = () => {
    playIcon.className = 'fa-solid fa-play text-warm-900 text-xl ml-1';
    const vinyl = document.getElementById('vinyl-record');
    if (vinyl) vinyl.classList.add('paused');
  };
  
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

  // 다운로드 버튼 로직: 새 창으로 즉시 열어서 다운로드 (CORS 이슈 우회)
  const downloadBtn = document.getElementById('download-btn');
  downloadBtn.onclick = () => {
    const url = downloadBtn.dataset.url;
    if (url) {
      // 구글 드라이브 링크는 새 창(새 탭)으로 열면 즉시 강제 다운로드가 시작됩니다.
      window.open(url, '_blank');
      
      // 앱 사용 현황에 다운로드 파일명 기록
      logAppUsage('', downloadBtn.dataset.title || '');

      // UI 업데이트
      const label = document.getElementById('download-label');
      label.textContent = t('saveSuccess') || 'Saved!';
      setTimeout(() => label.textContent = t('save') || 'Save', 3000);
    }
  };
}

/* ──────────────────────────────────────────────────────────────
   6. 초기화 (앱 메인 로직)
────────────────────────────────────────────────────────────── */

async function initApp() {
  initLangSwitcher();
  initPlayer();
  initBarcodeScanner();

  // 앱 접속 시 '앱 사용 현황' 시트에 접속 날짜 기록
  logAppUsage('', '');

  // 사용자 요청: 앱 시작 시 무조건 패스워드 입력창이 가장 먼저 나온다.
  showPasswordScreen();

  const form = document.getElementById('password-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const rawInput = document.getElementById('password-input').value;
    const errorEl = document.getElementById('password-error');
    const submitBtn = document.getElementById('password-submit-btn');

    if (!rawInput) return;

    // 모바일 키보드 호환성: 전각 문자 변환, 앞뒤/중간 공백 및 제어문자 제거, 소문자 변환
    const cleanPw = rawInput.normalize('NFKC').replace(/[\s\u200B-\u200D\uFEFF]/g, '').toLowerCase();

    if (cleanPw === 'rebusan') {
      hidePasswordScreen();

      // 아직 데이터 로딩이 완료되지 않은 경우에만 로딩 표시 후 대기
      if (allRowsCache.length === 0) {
        submitBtn.disabled = true;
        showLoading();
        await preloadCSV();
        submitBtn.disabled = false;
        document.getElementById('loading-screen').className = 'hidden';
      }

      renderLibraryGrid();
      showLibraryScreen();
    } else {
      errorEl.classList.remove('hidden');
      errorEl.textContent = t('passwordError') || "Incorrect access code.";
      setTimeout(() => errorEl.classList.add('hidden'), 3000);
    }
  };

  // 패스워드 화면을 표시해둔 상태에서 백그라운드로 CSV 데이터 미리 로드 (사용자 입력을 차단하지 않도록 비동기 실행)
  preloadCSV();

  document.getElementById('back-to-library-btn').onclick = () => {
    showLibraryScreen();
  };
}

function getChosung(str) {
  if (!str) return '';
  const firstChar = str.charAt(0);
  const code = firstChar.charCodeAt(0);
  
  if (code >= 44032 && code <= 55203) {
    const cho = Math.floor((code - 44032) / 588);
    const chosungList = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    return chosungList[cho];
  }
  
  if (/[a-zA-Z]/.test(firstChar)) return firstChar.toUpperCase();
  return '#';
}

function renderLibraryGrid() {
  const grid = document.getElementById('library-grid');
  const indexBar = document.getElementById('fast-scroll-index');
  grid.innerHTML = '';
  indexBar.innerHTML = '';
  indexBar.classList.remove('hidden');
  
  const sortedRows = [...allRowsCache].sort((a, b) => {
    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB, 'ko');
  });

  if (sortedRows.length === 0) {
    sortedRows.push(...DEMO_FALLBACK);
  }

  let currentHeader = '';
  const indices = new Set();

  sortedRows.forEach(row => {
    const bookTitle = row.title || 'Untitled';
    let cho = getChosung(bookTitle);
    
    const choMap = {'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ'};
    if (choMap[cho]) cho = choMap[cho];

    if (cho !== currentHeader) {
      currentHeader = cho;
      indices.add(cho);
      
      const headerEl = document.createElement('div');
      headerEl.id = 'idx-' + cho;
      headerEl.className = 'text-sepia-600 font-bold mt-4 mb-2 pl-1 border-b border-warm-200 text-sm';
      headerEl.textContent = cho;
      grid.appendChild(headerEl);
    }

    const bookEl = document.createElement('div');
    bookEl.className = 'book-item';
    bookEl.onclick = () => playStory(row);

    bookEl.innerHTML = `
      <div class="flex-1 px-2 pl-6 z-10 text-left">
        <div class="text-sepia-600 text-[10px] mb-0.5 uppercase tracking-widest font-sans font-semibold opacity-80">Audio Story</div>
        <h3 class="text-warm-900 font-serif text-[15px] font-bold leading-snug break-keep pr-2">${bookTitle}</h3>
      </div>
      <div class="text-sepia-500 pr-1 z-10">
        <i class="fa-solid fa-play text-sm"></i>
      </div>
    `;
    grid.appendChild(bookEl);
  });

  Array.from(indices).forEach(idx => {
    const btn = document.createElement('button');
    btn.textContent = idx;
    btn.onclick = () => {
      const target = document.getElementById('idx-' + idx);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    indexBar.appendChild(btn);
  });
}

window.playStory = function(foundData) {
  const storyData = {
    id:          foundData['id']          || 'Unknown',
    title:       foundData['title']       || 'Untitled Story',
    description: foundData['description'] || '',
    imageUrl:    foundData['imageurl']    || foundData['imageUrl'] || '',
    audioUrl:    foundData['audiourl']    || foundData['audioUrl'] || ''
  };

  // 앱 사용 현황에 재생 파일명 기록
  logAppUsage(storyData.title, '');

  renderStoryContent(storyData);
  showContent();
};

/* ──────────────────────────────────────────────────────────────
   7. 책 바코드(ISBN) 스캐너 및 자동 매칭 열기 기능
────────────────────────────────────────────────────────────── */

let html5QrCodeScanner = null;

function initBarcodeScanner() {
  const openBtn = document.getElementById('open-barcode-btn');
  const closeBtn = document.getElementById('close-barcode-modal-btn');
  const modal = document.getElementById('barcode-modal');
  const manualBtn = document.getElementById('manual-isbn-btn');
  const manualInput = document.getElementById('manual-isbn-input');
  const liveResults = document.getElementById('search-live-results');

  const zoom1Btn = document.getElementById('zoom-1x-btn');
  const zoom2Btn = document.getElementById('zoom-2x-btn');
  const zoom3Btn = document.getElementById('zoom-3x-btn');

  if (!openBtn || !modal) return;

  openBtn.onclick = () => {
    modal.classList.remove('hidden');
    if (manualInput) manualInput.value = '';
    if (liveResults) {
      liveResults.classList.add('hidden');
      liveResults.innerHTML = '';
    }
    startCameraScanner();
  };

  closeBtn.onclick = () => {
    stopCameraScanner();
    modal.classList.add('hidden');
  };

  if (zoom1Btn) zoom1Btn.onclick = () => applyCameraZoom(1.0);
  if (zoom2Btn) zoom2Btn.onclick = () => applyCameraZoom(2.0);
  if (zoom3Btn) zoom3Btn.onclick = () => applyCameraZoom(3.0);

  if (manualInput) {
    // 실시간 타이핑 감지하여 자동완성 도서 목록 표시
    manualInput.oninput = (e) => {
      renderLiveSearchResults(e.target.value);
    };

    manualInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        const code = manualInput.value.trim();
        if (code) processIsbnCode(code);
      }
    };
  }

  if (manualBtn && manualInput) {
    manualBtn.onclick = () => {
      const code = manualInput.value.trim();
      if (code) processIsbnCode(code);
    };
  }

  // 📸 바코드 사진 직접 촬영/업로드 인식 버튼 연결
  const photoBtn = document.getElementById('barcode-photo-btn');
  const fileInput = document.getElementById('barcode-file-input');

  if (photoBtn && fileInput) {
    photoBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleBarcodePhotoUpload(file);
    };
  }
}

function renderLiveSearchResults(query) {
  const container = document.getElementById('search-live-results');
  if (!container) return;

  if (!query || !query.trim()) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const normalize = (str) => (str || '').replace(/[\s\-_,.:;!?'"()\[\]~`"]/g, '').toLowerCase();
  const cleanQuery = normalize(query);

  const matches = allRowsCache.filter(row => {
    return Object.values(row).some(val => normalize(val).includes(cleanQuery));
  }).slice(0, 10);

  if (matches.length === 0) {
    container.innerHTML = `<div class="p-3 text-xs text-warm-500 text-center">일치하는 도서가 없습니다. 아래 전체 라이브러리 목록에서 선택해 주세요.</div>`;
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = matches.map(m => `
    <div class="live-search-item px-3 py-2.5 hover:bg-warm-50 cursor-pointer flex items-center justify-between border-b border-warm-100 last:border-0 transition-colors" data-id="${m.id}">
      <div class="flex flex-col pr-2">
        <span class="text-warm-900 font-serif text-xs font-bold leading-snug">${m.title || 'Untitled'}</span>
        ${m.description ? `<span class="text-warm-500 text-[10px] truncate max-w-[200px] mt-0.5">${m.description}</span>` : ''}
      </div>
      <i class="fa-solid fa-play text-sepia-500 text-xs flex-shrink-0"></i>
    </div>
  `).join('');

  container.querySelectorAll('.live-search-item').forEach((item, idx) => {
    item.onclick = () => {
      const found = matches[idx];
      if (found) {
        stopCameraScanner();
        document.getElementById('barcode-modal').classList.add('hidden');
        window.playStory(found);
      }
    };
  });

  container.classList.remove('hidden');
}

function applyCameraZoom(zoomFactor) {
  if (!html5QrCodeScanner) return;
  try {
    const track = html5QrCodeScanner.getRunningTrack();
    if (track && typeof track.applyConstraints === 'function') {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.zoom) {
        const targetZoom = Math.min(Math.max(zoomFactor, capabilities.zoom.min || 1), capabilities.zoom.max || 5);
        track.applyConstraints({ advanced: [{ zoom: targetZoom }] }).catch(() => {});
        console.info(`[Zoom] Applied camera zoom: ${targetZoom}x`);
      } else {
        console.info('[Zoom] Hardware zoom not supported on this track');
      }
    }
  } catch(e) {
    console.warn('[Zoom] Apply zoom error:', e);
  }
}

let zxingReader = null;
let nativeBarcodeDetector = null;
let nativeDetectInterval = null;

function handleBarcodePhotoUpload(file) {
  if (!file) return;
  const statusEl = document.getElementById('scanner-status');
  if (statusEl) statusEl.textContent = '선명한 사진에서 바코드 읽는 중...';

  // 1. Html5Qrcode.scanFile 사용
  if (window.Html5Qrcode) {
    const tempScanner = new Html5Qrcode('barcode-reader');
    tempScanner.scanFile(file, true)
      .then(decodedText => {
        if (statusEl) statusEl.textContent = `사진 바코드 인식 성공: ${decodedText}`;
        stopCameraScanner();
        processIsbnCode(decodedText);
      })
      .catch(err => {
        decodeWithZXingImage(file);
      });
  } else {
    decodeWithZXingImage(file);
  }

  function decodeWithZXingImage(imageFile) {
    if (window.ZXing) {
      try {
        const reader = new ZXing.BrowserMultiFormatReader();
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        img.src = url;
        img.onload = () => {
          reader.decodeFromImageElement(img)
            .then(result => {
              URL.revokeObjectURL(url);
              const text = result.getText();
              if (statusEl) statusEl.textContent = `사진 바코드 인식 성공: ${text}`;
              stopCameraScanner();
              processIsbnCode(text);
            })
            .catch(e => {
              URL.revokeObjectURL(url);
              alert('사진에서 바코드를 찾지 못했습니다. 아래 도서 검색창에 책제목을 입력하시면 즉시 검색됩니다!');
              if (statusEl) statusEl.textContent = '수동 검색창에 도서명을 입력해 주세요.';
            });
        };
      } catch(e) {
        alert('도서 검색창에 책제목을 입력하시면 즉시 검색됩니다!');
      }
    } else {
      alert('도서 검색창에 책제목을 입력하시면 즉시 검색됩니다!');
    }
  }
}

function startCameraScanner() {
  const statusEl = document.getElementById('scanner-status');
  if (statusEl) statusEl.textContent = '고화질 바코드 카메라 켜는 중...';

  const videoEl = document.getElementById('barcode-video-stream');
  const readerEl = document.getElementById('barcode-reader');

  // 1. 하드웨어 네이티브 BarcodeDetector 우선 시도 (Android Chrome & iOS Safari 지원)
  if ('BarcodeDetector' in window && videoEl && readerEl) {
    try {
      videoEl.classList.remove('hidden');
      readerEl.classList.add('hidden');

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      }).then(stream => {
        videoEl.srcObject = stream;
        videoEl.play();
        if (statusEl) statusEl.textContent = '책 뒷면 바코드를 카메라 중앙에 비춰주세요';

        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] });
        if (nativeDetectInterval) clearInterval(nativeDetectInterval);
        nativeDetectInterval = setInterval(async () => {
          try {
            const barcodes = await detector.detect(videoEl);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              console.info('[Native BarcodeDetector] Found code:', code);
              clearInterval(nativeDetectInterval);
              stopCameraScanner();
              processIsbnCode(code);
            }
          } catch(e) {}
        }, 200);

        return;
      }).catch(err => {
        startZXingOrHtml5Fallback();
      });
      return;
    } catch(e) {
      startZXingOrHtml5Fallback();
      return;
    }
  }

  startZXingOrHtml5Fallback();

  function startZXingOrHtml5Fallback() {
    // 2. ZXing EAN-13 정밀 초점 엔진 (TRY_HARDER 옵션 활성화)
    if (window.ZXing && videoEl && readerEl) {
      try {
        videoEl.classList.remove('hidden');
        readerEl.classList.add('hidden');

        if (!zxingReader) {
          const hints = new Map();
          if (ZXing.DecodeHintType && ZXing.BarcodeFormat) {
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
              ZXing.BarcodeFormat.EAN_13,
              ZXing.BarcodeFormat.EAN_8,
              ZXing.BarcodeFormat.CODE_128,
              ZXing.BarcodeFormat.QR_CODE
            ]);
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
          }
          zxingReader = new ZXing.BrowserMultiFormatReader(hints);
        }

        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        zxingReader.decodeFromConstraints(
          constraints,
          'barcode-video-stream',
          (result, err) => {
            if (result) {
              const text = result.getText();
              console.info('[ZXing] Scanned barcode:', text);
              if (statusEl) statusEl.textContent = `바코드 감지: ${text}`;
              stopCameraScanner();
              processIsbnCode(text);
            }
          }
        ).then(() => {
          if (statusEl) statusEl.textContent = '책 뒷면 바코드를 비추거나 [📸 사진 찍기]를 눌러주세요';
        }).catch(err => {
          console.warn('[ZXing] Camera HD start failed, trying Html5Qrcode fallback:', err);
          startHtml5QrcodeFallback();
        });
        return;
      } catch(e) {
        startHtml5QrcodeFallback();
        return;
      }
    }

    startHtml5QrcodeFallback();
  }

  function startHtml5QrcodeFallback() {
    if (videoEl) videoEl.classList.add('hidden');
    if (readerEl) readerEl.classList.remove('hidden');

    if (!window.Html5Qrcode) {
      if (statusEl) statusEl.textContent = '스캐너 라이브러리를 로드하지 못했습니다.';
      return;
    }

    if (html5QrCodeScanner) {
      try {
        html5QrCodeScanner.stop().then(() => {
          try { html5QrCodeScanner.clear(); } catch(e) {}
          initHtml5QrcodeStream();
        }).catch(() => {
          initHtml5QrcodeStream();
        });
        return;
      } catch(e) {
        initHtml5QrcodeStream();
        return;
      }
    }

    initHtml5QrcodeStream();
  }

  function initHtml5QrcodeStream() {
    html5QrCodeScanner = new Html5Qrcode('barcode-reader');
    const config = {
      fps: 15,
      qrbox: { width: 280, height: 160 },
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    const onScanSuccess = (decodedText) => {
      if (statusEl) statusEl.textContent = `바코드 감지: ${decodedText}`;
      stopCameraScanner();
      processIsbnCode(decodedText);
    };

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label)) || devices[devices.length - 1];
        const cameraId = backCam ? backCam.id : devices[0].id;
        
        html5QrCodeScanner.start(cameraId, config, onScanSuccess, () => {})
          .then(() => {
            if (statusEl) statusEl.textContent = '책 뒷면 바코드를 비추거나 [📸 사진 찍기]를 눌러주세요';
          })
          .catch(err => {
            startFallback();
          });
      } else {
        startFallback();
      }
    }).catch(err => {
      startFallback();
    });

    function startFallback() {
      html5QrCodeScanner.start({ facingMode: 'environment' }, config, onScanSuccess, () => {})
        .then(() => {
          if (statusEl) statusEl.textContent = '책 뒷면 바코드를 비추거나 [📸 사진 찍기]를 눌러주세요';
        })
        .catch(err => {
          if (statusEl) statusEl.textContent = '카메라를 시작할 수 없습니다. [📸 사진 찍기] 또는 도서명 검색을 이용해 주세요.';
        });
    }
  }
}

function stopCameraScanner() {
  if (nativeDetectInterval) {
    clearInterval(nativeDetectInterval);
    nativeDetectInterval = null;
  }

  const videoEl = document.getElementById('barcode-video-stream');
  if (videoEl && videoEl.srcObject) {
    try {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoEl.srcObject = null;
    } catch(e) {}
  }

  if (zxingReader) {
    try {
      zxingReader.reset();
    } catch(e) {}
  }

  if (html5QrCodeScanner) {
    try {
      html5QrCodeScanner.stop().then(() => {
        try { html5QrCodeScanner.clear(); } catch(e) {}
      }).catch(() => {});
    } catch(e) {}
  }
}

async function processIsbnCode(code) {
  const modal = document.getElementById('barcode-modal');
  const statusEl = document.getElementById('scanner-status');
  const rawInput = (code || '').trim();

  if (!rawInput) return;

  if (statusEl) statusEl.textContent = `도서 찾는 중... (${rawInput})`;

  // 1단계: 입력받은 도서명/코드/ISBN이 라이브러리(시트 데이터의 모든 열)와 바로 일치하는지 확인
  let match = findBookInCache(rawInput);

  // 1.5단계: 내장된 153개 도서 13자리 ISBN 사전 및 로컬 캐시에서 바코드 즉시 조회
  const cleanCode = rawInput.replace(/[^0-9X]/gi, '');
  if (!match && cleanCode) {
    const targetTitle = PREMAPPED_ISBNS[cleanCode] || localStorage.getItem(`isbn_map_${cleanCode}`);
    if (targetTitle) {
      console.info(`[Barcode Match] Found pre-mapped title for ISBN ${cleanCode}:`, targetTitle);
      match = findBookInCache(targetTitle);
    }
  }

  // 2단계: 직접 일치하지 않고 숫자/ISBN 형태인 경우 API로 ISBN 조사하여 책 제목 찾기
  let searchedTitle = '';

  if (!match && cleanCode.length >= 8) {
    try {
      // 자체 서버리스 API로 알라딘/네이버/다음/국립중앙도서관/OpenLibrary/GoogleBooks 서버측 조사
      const apiRes = await fetch(`/api/isbn?code=${cleanCode}`);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.title) {
          searchedTitle = apiData.title;
          console.info('[Barcode] Found book title via Serverless API:', searchedTitle);
        }
      }
    } catch (apiErr) {
      console.warn('[Barcode] Serverless API fetch error:', apiErr);
    }

    // 서버 API로 찾지 못한 경우 기존 Google Books 클라이언트 API 보조 시도
    if (!searchedTitle) {
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            searchedTitle = data.items[0].volumeInfo?.title || '';
            console.info('[Barcode] Found book title via Google Books API:', searchedTitle);
          }
        }
      } catch (e) {
        console.warn('[Barcode] Google Books API fetch failed:', e);
      }
    }

    if (searchedTitle) {
      match = findBookInCache(searchedTitle);
      if (match) {
        // 캐시에 바코드와 도서명 맵핑 저장
        try { localStorage.setItem(`isbn_map_${cleanCode}`, match.title || searchedTitle); } catch(e) {}
      }
    }
  }

  if (match) {
    stopCameraScanner();
    modal.classList.add('hidden');
    window.playStory(match);
  } else {
    // 찾지 못했더라도 사용자가 직접 선택할 수 있도록 실시간 목록에 라이브러리 도서 후보 추천
    renderLiveSearchResults(searchedTitle || rawInput);
    const msg = searchedTitle 
      ? `'${searchedTitle}' 도서를 외부 DB에서 확인했으나,\n현재 구글 시트 라이브러리에 등록되지 않은 도서입니다.\n\n아래 목록에서 시청할 도서를 직접 선택하실 수 있습니다.`
      : `'${rawInput}' 바코드/도서명을 자동 연결하지 못했습니다.\n\n아래 실시간 목록에서 시청하실 도서명을 직접 선택해 주세요!`;
    alert(msg);
    if (statusEl) statusEl.textContent = '아래 실시간 목록에서 도서를 선택하거나 다른 키워드를 검색하세요.';
  }
}

function findBookInCache(query) {
  if (!query || !allRowsCache || allRowsCache.length === 0) return null;
  
  // 정규화: 모든 공백, 문장 부호, 특수문자를 제거하고 소문자로 변환
  const normalize = (str) => (str || '').replace(/[\s\-_,.:;!?'"()\[\]~`"]/g, '').toLowerCase();
  const cleanQuery = normalize(query);

  if (!cleanQuery) return null;

  // 1. 정확한 일치 (title, id, description, isbn, barcode 등 모든 열 대상)
  let match = allRowsCache.find(row => {
    return Object.values(row).some(val => {
      const normVal = normalize(val);
      return normVal === cleanQuery;
    });
  });
  if (match) return match;

  // 2. 부분 일치 검색 (제목, 설명, ID, 기타 모든 열 대상)
  match = allRowsCache.find(row => {
    return Object.values(row).some(val => {
      const normVal = normalize(val);
      return normVal && (normVal.includes(cleanQuery) || cleanQuery.includes(normVal));
    });
  });
  if (match) return match;

  return null;
}

document.addEventListener('DOMContentLoaded', initApp);
