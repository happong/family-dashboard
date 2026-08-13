/* =========================================================
   가족 대시보드 백엔드 (Google Apps Script) — 범용 버전 v2

   여러 모듈을 하나의 스프레드시트, 여러 시트 탭으로 관리합니다.
   type 파라미터로 어떤 시트를 다룰지 구분합니다.

   [스프레드시트에 필요한 시트 탭 & 헤더]
   1) "거래내역"      : 날짜 | 구분 | 항목 | 금액 | 등록자 | 메모
   2) "여행"          : 여행ID | 여행지 | 시작일 | 종료일 | 상태 | 메모
   3) "일정"          : 여행ID | 구분 | 날짜 | 시간 | 장소 | 메모  (구분=사전계획/실제일정)
   4) "맛집"          : 여행ID | 상점명 | 메뉴 | 별점 | 등록자 | 재방문의사 | 메모  (재방문의사=예/아니오)
   5) "여행평점"      : 여행ID | 등록자 | 별점 | 메모
   6) "사진"          : 여행ID | URL | 설명 | 유형  (유형=사진/동영상)
   7) "회의이슈"      : 이슈ID | 제목 | 설명 | 등록일
   8) "회의진행도"    : 이슈ID | 날짜 | 진행도 | 메모  (진행도=0~100 숫자, 최신 값이 현재 진행도)
   9) "회의논의"      : 이슈ID | 날짜 | 논의내용 | 다음아젠다
   10) "회의할일"     : 할일ID | 이슈ID | 담당자 | 내용 | 마감일 | 등록일
   11) "회의할일완료" : 할일ID | 완료일

   [설치/업데이트 방법]
   - 이미 배포하신 경우: Apps Script 편집기에서 기존 코드를 이 내용으로
     통째로 교체 → 배포 > 배포 관리 > 편집(연필 아이콘) > 새 버전으로 배포
     (이렇게 하면 기존 웹앱 URL이 그대로 유지됩니다. "새 배포"를 새로
     만들면 URL이 바뀌니 주의하세요.)

   ⚠️ 보안 주의: "전체 허용"이어도 URL을 아는 사람만 접근 가능하지만,
   URL 자체를 비밀번호처럼 생각하면 안 됩니다. 실제 접근 제어는
   프론트엔드의 Google 로그인 화이트리스트가 담당합니다.
   ========================================================= */

const SHEET_MAP = {
  finance: '거래내역',
  trips: '여행',
  itinerary: '일정',
  restaurants: '맛집',
  tripRatings: '여행평점',
  photos: '사진',
  issues: '회의이슈',
  progress: '회의진행도',
  discussions: '회의논의',
  todos: '회의할일',
  todoCompletions: '회의할일완료'
};

// type별로 "무슨 컬럼 기준으로 필터링할 수 있는지" 정의
// 프론트에서 ?filterId=값 을 붙이면 해당 컬럼이 값과 일치하는 행만 반환
const FILTER_COLUMN = {
  itinerary: '여행ID',
  restaurants: '여행ID',
  tripRatings: '여행ID',
  photos: '여행ID',
  discussions: '이슈ID',
  progress: '이슈ID',
  todos: '이슈ID'
};

function doGet(e) {
  const type = e.parameter.type || 'finance';
  const sheetName = SHEET_MAP[type];
  if (!sheetName) return jsonOut({ ok: false, error: `알 수 없는 type: ${type}` });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return jsonOut({ ok: false, error: `시트 "${sheetName}"를 찾을 수 없습니다.` });

  let rows = sheetToObjects(sheet);

  const filterColumn = FILTER_COLUMN[type];
  if (filterColumn && e.parameter.filterId) {
    rows = rows.filter(r => String(r[filterColumn]) === String(e.parameter.filterId));
  }

  return jsonOut({ ok: true, rows });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const type = data.type || 'finance';
  const sheetName = SHEET_MAP[type];
  if (!sheetName) return jsonOut({ ok: false, error: `알 수 없는 type: ${type}` });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return jsonOut({ ok: false, error: `시트 "${sheetName}"를 찾을 수 없습니다.` });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => (data[h] !== undefined ? data[h] : ''));
  sheet.appendRow(row);

  return jsonOut({ ok: true });
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   [선택 사항] 매일 아침 가족에게 할 일/일정 요약 이메일 보내기
   브라우저 알림은 앱을 열어둬야만 작동하는 한계가 있어서,
   더 확실한 알림을 원하시면 이 함수를 아래처럼 등록해서 쓰세요.

   등록 방법: Apps Script 편집기 왼쪽 시계 아이콘(트리거) → 트리거 추가
   → 실행할 함수: sendDailyDigest → 이벤트 소스: 시간 기반
   → 매일 타이머 → 원하는 시간대(예: 오전 8~9시) 선택 → 저장
   ========================================================= */
function sendDailyDigest() {
  const familyEmails = ['가족1@gmail.com', '가족2@gmail.com']; // 받을 사람 이메일로 교체하세요

  const todosSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('회의할일');
  const completionsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('회의할일완료');
  const todos = sheetToObjects(todosSheet);
  const completions = sheetToObjects(completionsSheet).map(c => String(c['할일ID']));

  const incomplete = todos.filter(t => !completions.includes(String(t['할일ID'])));

  if (incomplete.length === 0) {
    return; // 미완료 할일이 없으면 메일 안 보냄
  }

  const lines = incomplete.map(t => `- [${t['담당자']}] ${t['내용']} ${t['마감일'] ? '(마감: ' + t['마감일'] + ')' : ''}`);
  const body = `오늘 기준 미완료 가족회의 할일입니다.\n\n${lines.join('\n')}`;

  familyEmails.forEach(email => {
    MailApp.sendEmail(email, '[우리집 다이어리] 오늘의 미완료 할일', body);
  });
}
