/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Busan Audio Stories — Google Apps Script                  ║
 * ║   구글 드라이브 오디오 파일 -> 구글 스프레드시트 자동 동기화 스크립트    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// 오디오 파일이 저장된 구글 드라이브 폴더 ID
const DRIVE_FOLDER_ID = '11-AH2CHdB52TGKWjpw3i-fQhgsMU4lWQ';

/**
 * 파일명에서 순수 책제목 추출 함수
 * - (JP), (EN), (CN), (KR) 등 언어 표기 제거
 * - [책제목] 대괄호 우선 추출
 * - (작가-책제목) 괄호 추출
 * - 책제목_작가 형태 추출
 */
function extractBookTitle(fileName) {
  if (!fileName) return 'Untitled';
  
  // 1. 확장자(.mp3, .m4a 등) 제거
  let name = fileName.replace(/\.[^/.]+$/, '').trim();
  
  // 2. [책제목] 패턴 우선 (단, [JP], [EN], [CN], [KR] 언어 태그는 제외)
  const bracketMatch = name.match(/\[(.*?)\]/);
  if (bracketMatch && bracketMatch[1]) {
    const b = bracketMatch[1].trim();
    if (!['JP', 'EN', 'CN', 'KR'].includes(b.toUpperCase())) {
      return b;
    }
  }
  
  // 3. 언어 접미사 (JP), (EN), (CN), (KR) 제거
  name = name.replace(/\s*[\(\[]\s*(JP|EN|CN|KR)\s*[\)\]]\s*/gi, '').trim();
  
  // 4. (작가-책제목) 또는 (작가_책제목) 형태
  const parenMatch = name.match(/^\((.*?)\)/);
  if (parenMatch && parenMatch[1]) {
    const inner = parenMatch[1];
    if (inner.includes('-')) return inner.split('-')[1].trim();
    if (inner.includes('_')) return inner.split('_')[1].trim();
    return inner.trim();
  }
  
  // 5. 제목_작가 형태 (예: 메리크리스마스_심윤서 -> 메리크리스마스)
  if (name.includes('_')) {
    const parts = name.split('_');
    return parts[0].trim();
  }
  
  return name.trim();
}

/**
 * [추천] 기존 시트의 중복 및 잘못 등록된(JP/EN/CN 등) 행을 정리하고 드라이브 파일들을 올바른 책제목으로 재동기화
 */
function cleanupAndSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  
  // book001 ~ book012 (기본 데이터 13행까지) 유지하고 14행부터 삭제 후 재등록
  if (lastRow >= 14) {
    sheet.deleteRows(14, lastRow - 13);
  }
  
  // 동기화 재실행
  return syncDriveAudioFiles();
}

/**
 * 구글 드라이브 폴더의 오디오 파일을 구글 시트에 자동 동기화 (중복 방지)
 */
function syncDriveAudioFiles() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; // 첫 번째 탭
  const data = sheet.getDataRange().getValues();
  
  // 기존 등록된 파일 ID 및 책 번호(book001 ~) 확인
  const existingFileIds = new Set();
  let maxBookNumber = 0;
  
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0] || ''); // id 열 (예: book001)
    const audioUrl = String(data[i][4] || ''); // audioUrl 열
    
    // book 번호 최댓값 갱신
    const numMatch = rowId.match(/book(\d+)/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num > maxBookNumber) {
        maxBookNumber = num;
      }
    }
    
    // 기존 오디오 URL에서 드라이브 ID 추출
    const idMatch = audioUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      existingFileIds.add(idMatch[1]);
    }
  }
  
  // 구글 드라이브 폴더 열기
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const files = folder.getFiles();
  let newAddedCount = 0;
  
  while (files.hasNext()) {
    const file = files.next();
    const fileId = file.getId();
    const fileName = file.getName();
    const mimeType = file.getMimeType();
    
    // 오디오 확장자 및 mimeType 검사
    const isAudio = /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(fileName) || mimeType.startsWith('audio/');
    if (!isAudio) continue;
    
    // 이미 시트에 등록된 파일이면 건너뜀 (중복 방지)
    if (existingFileIds.has(fileId)) continue;
    
    // 새 book ID 생성 (예: book013)
    maxBookNumber++;
    const newId = 'book' + String(maxBookNumber).padStart(3, '0');
    const bookTitle = extractBookTitle(fileName);
    const audioUrl = 'https://drive.google.com/file/d/' + fileId + '/view?usp=drive_link';
    
    // 시트 구조: [id, title, description, imageUrl, audioUrl, password]
    sheet.appendRow([newId, bookTitle, '', '', audioUrl, '']);
    existingFileIds.add(fileId);
    newAddedCount++;
  }
  
  return {
    success: true,
    addedCount: newAddedCount,
    totalCount: maxBookNumber
  };
}

/**
 * 앱 사용 현황 기록 함수 (접속 날짜, 재생 파일명, 다운로드 파일명)
 */
function logUsage(dateStr, playTitle, downloadTitle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('앱 사용 현황');
  
  // 혹시 시트가 없으면 생성하고 헤더 작성
  if (!sheet) {
    sheet = ss.insertSheet('앱 사용 현황');
    sheet.appendRow(['접속 날짜', '재생 파일명', '다운로드 파일명']);
  }
  
  // 한국 시간(KST) 포맷팅
  const now = dateStr || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([now, playTitle || '', downloadTitle || '']);
  return { success: true };
}

/**
 * 웹앱 요청 핸들러 (GET)
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    
    // 1. 앱 사용 현황 로깅 요청
    if (params.type === 'log') {
      const result = logUsage(params.date, params.play, params.download);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. 기본 요청: 드라이브 오디오 파일 자동 동기화
    const result = syncDriveAudioFiles();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 구글 시트 상단 메뉴 생성
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎵 오디오 동기화')
    .addItem('새 파일 동기화', 'menuSyncDrive')
    .addItem('시트 정리 후 전체 재동기화', 'menuCleanupAndSync')
    .addToUi();
}

function menuSyncDrive() {
  const result = syncDriveAudioFiles();
  SpreadsheetApp.getUi().alert('동기화 완료: ' + result.addedCount + '개의 새 파일이 추가되었습니다. (총 ' + result.totalCount + '권)');
}

function menuCleanupAndSync() {
  const result = cleanupAndSync();
  SpreadsheetApp.getUi().alert('정리 및 재동기화 완료: 총 ' + result.totalCount + '권이 등록되었습니다.');
}
