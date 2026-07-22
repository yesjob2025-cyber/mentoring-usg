/**
 * 교육사업 준비 자동화 — 올인원(단일 파일) 버전
 * =============================================================
 * 이 파일 하나만 Apps Script 편집기의 Code.gs 에 붙여넣으면 됩니다.
 * (Templates.gs / Dialog.html 을 따로 만들 필요 없음)
 *
 * 설치: 빈 구글 시트 → 확장 프로그램 → Apps Script → 이 내용 전체 붙여넣기
 *       → 저장 → createSampleChecklist 실행해 권한 허용 → 시트 새로고침(F5)
 *       → 상단 [📋 교육사업 준비] 메뉴 사용.
 *
 * ※ 이 파일은 Code.gs + Templates.gs + Dialog.html 을 합쳐 자동 생성한 것입니다.
 *   항목/일정을 바꾸려면 아래 "템플릿" 구역만 수정하세요.
 */

/**
 * 유형별 준비 체크리스트 템플릿
 * -------------------------------------------------------------
 * 실제 예스잡 운영 체크리스트(온라인 멘토링 / 오프라인 연수·경진대회 / 박람회)에서
 * 반복 등장하는 준비 항목을 표준화한 것.
 *
 * 각 항목의 dday 는 "교육/행사 시작일 기준 상대 마감"(음수 = D-이전, 양수 = D+이후).
 * 시트 생성 시 이 값이 실제 날짜(마감일)로 자동 환산된다.
 */

var PROJECT_TYPES = {
  online: '온라인 교육 (Zoom)',
  offline: '오프라인 교육/연수',
  expo: '행사 (박람회)'
};

/** 카테고리 표시 순서 */
var CATEGORY_ORDER = [
  '사업내용', '계약진행', '행사구성', '교육장 정보', '사전세팅',
  '연수시설', '학생관리', '홍보물 제작', '행사준비', '정산'
];

/** 모든 유형 공통 항목 */
var TPL_COMMON = [
  { c: '사업내용', t: '사업제안서 확정', d: -45 },
  { c: '사업내용', t: '견적서 / 비교견적서 확정', d: -45 },
  { c: '계약진행', t: '계약 체결 (계약주체·기관)', d: -30 },

  { c: '사전세팅', t: '강사 섭외', d: -30 },
  { c: '사전세팅', t: '강사 프로필 수합', d: -21 },
  { c: '사전세팅', t: '강사 성범죄경력조회 동의서', d: -21 },
  { c: '사전세팅', t: '운영진 오리엔테이션 및 안내', d: -7 },
  { c: '사전세팅', t: '참여 학생 안내', d: -14 },
  { c: '사전세팅', t: '오픈채팅방 개설·운영', d: -14 },

  { c: '홍보물 제작', t: '오리엔테이션 진행 PPT', d: -10 },
  { c: '홍보물 제작', t: '행사 진행 시나리오', d: -7 },

  { c: '행사준비', t: '출석부', d: -5 },
  { c: '행사준비', t: '만족도 조사 양식', d: -5 },
  { c: '행사준비', t: '수료증', d: -3 },
  { c: '행사준비', t: '결과보고 양식', d: 3 },
  { c: '정산', t: '강사비/업체비 정산', d: 7 },
  { c: '정산', t: '결과보고서 제출', d: 14 }
];

/** 온라인(Zoom) 특화 */
var TPL_ONLINE = [
  { c: '교육장 정보', t: 'Zoom 교육장 개설·정보 공유', d: -7 },
  { c: '교육장 정보', t: 'Zoom 리허설 / 접속 테스트', d: -2 },
  { c: '홍보물 제작', t: '멘토 뒷배경(가상배경) 이미지', d: -7 },
  { c: '행사준비', t: '온라인 출석부(실시간 접속 체크)', d: -3 },
  { c: '행사준비', t: '기본 질문 리스트', d: -5 }
];

/** 오프라인 교육/연수 특화 */
var TPL_OFFLINE = [
  { c: '연수시설', t: '숙소 예약', d: -30 },
  { c: '연수시설', t: '교육장 예약', d: -30 },
  { c: '연수시설', t: '식당/식사 예약 (메뉴 확정)', d: -14 },
  { c: '연수시설', t: '버스/이동 차량 예약', d: -14 },
  { c: '연수시설', t: '숙소 관련 서류 제출', d: -7 },

  { c: '학생관리', t: '활동 조 배정', d: -5 },
  { c: '학생관리', t: '숙소 배정', d: -5 },
  { c: '학생관리', t: '여행자보험 가입 (명단 취합)', d: -3 },

  { c: '홍보물 제작', t: '행사장 현수막', d: -10 },
  { c: '홍보물 제작', t: '안내용 X배너', d: -10 },

  { c: '행사준비', t: '명찰 제작', d: -7 },
  { c: '행사준비', t: '교재 제작', d: -7 },
  { c: '행사준비', t: '방명록', d: -5 },
  { c: '행사준비', t: '다과 / 야식', d: -3 },
  { c: '행사준비', t: '참여 독려 선물 / 기념품', d: -7 }
];

/** 행사(박람회) 특화 */
var TPL_EXPO = [
  { c: '행사구성', t: '참여기업 섭외 및 확정', d: -30 },
  { c: '행사구성', t: '멘토 섭외 및 확정', d: -30 },
  { c: '행사구성', t: '부대행사 섭외 (진단·타로·MBTI·게임 등)', d: -21 },
  { c: '행사구성', t: '푸드트럭 / 케이터링 섭외', d: -21 },
  { c: '행사구성', t: '부스 배치도 확정', d: -14 },

  { c: '사전세팅', t: '기업 / 멘토 안내', d: -14 },
  { c: '사전세팅', t: '부대행사 안내', d: -14 },

  { c: '홍보물 제작', t: '행사장 현수막 (입구/무대/LED)', d: -10 },
  { c: '홍보물 제작', t: 'A보드 / X배너', d: -10 },
  { c: '홍보물 제작', t: '포스터 / 리플렛', d: -14 },
  { c: '홍보물 제작', t: '웹 배너 / 온라인 홍보물', d: -14 },
  { c: '홍보물 제작', t: '부스 현수막 / 백월 / 포토존', d: -10 },
  { c: '홍보물 제작', t: '상황판 / 안내데스크', d: -7 },

  { c: '행사준비', t: '인사담당자 선물 구입', d: -14 },
  { c: '행사준비', t: '참여 학생 경품 / 기념품', d: -10 },
  { c: '행사준비', t: '안내 요원 / 운영 인력 배치', d: -5 }
];

/** 유형 → 항목 목록 (공통 + 특화, 카테고리 순 정렬) */
function templateFor(type) {
  var extra = type === 'online' ? TPL_ONLINE
    : type === 'offline' ? TPL_OFFLINE
    : type === 'expo' ? TPL_EXPO
    : [];
  var all = TPL_COMMON.concat(extra);
  all.sort(function (a, b) {
    var ra = CATEGORY_ORDER.indexOf(a.c);
    var rb = CATEGORY_ORDER.indexOf(b.c);
    if (ra === -1) ra = 999;
    if (rb === -1) rb = 999;
    return ra - rb;
  });
  return all;
}

// ── 설정 (Script Properties 우선, 없으면 아래 기본값) ───────────
var DEFAULT_FOLDER_ID = ''; // 생성물 저장할 Drive 폴더 ID (비우면 내 드라이브 루트)

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    folderId: props.getProperty('FOLDER_ID') || DEFAULT_FOLDER_ID
  };
}

// ── 메뉴 ──────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 교육사업 준비')
    .addItem('＋ 새 사업 체크리스트 생성', 'openDialog')
    .addSeparator()
    .addItem('📂 저장 폴더 지정', 'setFolder')
    .addItem('ℹ️ 사용 안내', 'showHelp')
    .addToUi();
}

function openDialog() {
  var html = HtmlService.createHtmlOutput(getDialogHtml())
    .setWidth(460)
    .setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, '새 사업 준비 체크리스트 생성');
}

function setFolder() {
  var ui = SpreadsheetApp.getUi();
  var cur = getConfig().folderId;
  var res = ui.prompt(
    '저장 폴더 지정',
    '생성될 체크리스트를 저장할 Google Drive 폴더의 ID 또는 URL을 붙여넣으세요.\n' +
      '(비워두고 확인하면 "내 드라이브" 루트에 저장)\n\n현재: ' + (cur || '(미지정)'),
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var raw = res.getResponseText().trim();
  var folderId = extractFolderId(raw);
  if (folderId) {
    // 접근 가능 여부 확인
    try {
      DriveApp.getFolderById(folderId);
    } catch (e) {
      ui.alert('폴더를 찾을 수 없거나 접근 권한이 없습니다.\n' + e);
      return;
    }
  }
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', folderId);
  ui.alert(folderId ? '저장 폴더가 설정되었습니다.' : '내 드라이브 루트에 저장하도록 설정되었습니다.');
}

function extractFolderId(raw) {
  if (!raw) return '';
  var m = raw.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}

function showHelp() {
  SpreadsheetApp.getUi().alert(
    '교육사업 준비 자동화\n\n' +
      '1) [＋ 새 사업 체크리스트 생성]을 눌러 사업 정보를 입력합니다.\n' +
      '2) 유형(온라인/오프라인/박람회)과 시작일에 맞춰 준비 항목과 D-day 마감일이 자동으로 채워진 구글 시트가 생성됩니다.\n' +
      '3) 입력한 이메일로 자동 공유되고, 링크가 표시됩니다.\n\n' +
      '생성된 시트에서 상태(할 일/진행중/완료)·담당자·비용을 채우면 됩니다.'
  );
}

// ── 다이얼로그에서 호출: 체크리스트 생성 ──────────────────────

/**
 * @param {Object} form
 *   name, type, org, dept, manager, contractor, venue, time,
 *   startDate(YYYY-MM-DD), endDate, budget(number|string), emails(콤마구분), memo
 * @return {Object} { url, name, count }
 */
function generateChecklist(form) {
  if (!form || !form.name || !form.startDate) {
    throw new Error('사업명과 시작일은 필수입니다.');
  }
  var type = form.type || 'online';
  var typeLabel = PROJECT_TYPES[type] || type;
  var start = parseYmd(form.startDate);
  var end = form.endDate ? parseYmd(form.endDate) : start;
  if (!start) throw new Error('시작일 형식이 올바르지 않습니다 (YYYY-MM-DD).');

  var items = templateFor(type);

  // 1) 새 스프레드시트 생성
  var title = form.name.trim() + ' — 준비 체크리스트';
  var ss = SpreadsheetApp.create(title);
  var sh = ss.getSheets()[0];
  sh.setName('체크리스트');

  var bounds = buildSheet(sh, form, typeLabel, start, end, items);
  addSummarySheet(ss.insertSheet('요약'), bounds);

  // 2) Drive 폴더로 이동
  var cfg = getConfig();
  var file = DriveApp.getFileById(ss.getId());
  if (cfg.folderId) {
    try {
      file.moveTo(DriveApp.getFolderById(cfg.folderId));
    } catch (e) {
      // 폴더 접근 실패 시 루트에 그대로 둠
    }
  }

  // 3) 공유
  var emails = String(form.emails || '')
    .split(/[,;\s]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.indexOf('@') > 0; });
  emails.forEach(function (em) {
    try { file.addEditor(em); } catch (e) {}
  });

  return { url: ss.getUrl(), name: title, count: items.length, shared: emails.length };
}

/** Apps Script 편집기에서 바로 실행해 동작을 확인하는 테스트용 (다이얼로그 없이) */
function createSampleChecklist() {
  var res = generateChecklist({
    name: '2026 샘플 현직자 멘토링',
    type: 'online',
    org: '샘플대학교',
    dept: '대학일자리플러스센터',
    manager: '홍길동',
    contractor: '주식회사 예스잡',
    venue: '온라인 (Zoom)',
    time: '19:00~21:00',
    startDate: Utilities.formatDate(addDays(new Date(), 30), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    budget: '10000000',
    emails: '',
    memo: '테스트 생성'
  });
  Logger.log(res.url);
  return res;
}

// ── 시트 구성 ─────────────────────────────────────────────────

var HEADERS = ['구분', '마감일', 'D-day', '세부 진행', '강사/업체 연락처', '준비담당', '상태', '비고', '예상비용', '실제비용'];
var STATUS_OPTIONS = ['할 일', '진행중', '완료'];

function buildSheet(sh, form, typeLabel, start, end, items) {
  var tz = Session.getScriptTimeZone() || 'Asia/Seoul';
  var period = fmtDate(start, tz) + (end && end.getTime() !== start.getTime() ? ' ~ ' + fmtDate(end, tz) : '');
  var budget = toNumber(form.budget);

  // 개요 블록 (라벨/값)
  var overview = [
    ['사업명', form.name],
    ['유형', typeLabel],
    ['기관 / 부서', joinNonEmpty([form.org, form.dept], ' / ')],
    ['담당자', form.manager || ''],
    ['계약주체', form.contractor || ''],
    ['일정', period],
    ['시간', form.time || ''],
    ['행사장', form.venue || ''],
    ['예산', budget]
  ];

  // 타이틀
  sh.getRange(1, 1, 1, HEADERS.length).merge();
  sh.getRange(1, 1)
    .setValue('📋 ' + form.name + ' — 준비 체크리스트')
    .setFontSize(14).setFontWeight('bold').setBackground('#1f43ad').setFontColor('#ffffff')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);

  // 개요
  var r = 2;
  overview.forEach(function (row) {
    sh.getRange(r, 1).setValue(row[0]).setFontWeight('bold').setBackground('#eef4ff');
    sh.getRange(r, 2, 1, HEADERS.length - 1).merge().setValue(row[1]);
    if (row[0] === '예산') sh.getRange(r, 2).setNumberFormat('#,##0"원"');
    r++;
  });
  if (form.memo) {
    sh.getRange(r, 1).setValue('비고').setFontWeight('bold').setBackground('#eef4ff');
    sh.getRange(r, 2, 1, HEADERS.length - 1).merge().setValue(form.memo);
    r++;
  }

  // 표 헤더
  var headerRow = r + 1;
  sh.getRange(headerRow, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  // 데이터
  var firstDataRow = headerRow + 1;
  var rows = items.map(function (it) {
    var due = addDays(start, it.d);
    return [it.c, due, '', it.t, '', '', '할 일', '', '', ''];
  });
  if (rows.length) {
    sh.getRange(firstDataRow, 1, rows.length, HEADERS.length).setValues(rows);
  }
  var lastDataRow = firstDataRow + rows.length - 1;

  // D-day 수식 (완료면 표시 안 함, 아니면 마감일 - 오늘)
  for (var i = 0; i < rows.length; i++) {
    var rr = firstDataRow + i;
    sh.getRange(rr, 3).setFormula(
      '=IF($G' + rr + '="완료","✅",IF($B' + rr + '="","",$B' + rr + '-TODAY()))'
    );
  }

  // 서식
  sh.getRange(firstDataRow, 2, rows.length, 1).setNumberFormat('yyyy-mm-dd'); // 마감일
  sh.getRange(firstDataRow, 3, rows.length, 1).setHorizontalAlignment('center'); // D-day
  sh.getRange(firstDataRow, 9, rows.length, 2).setNumberFormat('#,##0'); // 비용

  // 상태 드롭다운
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_OPTIONS, true).build();
  sh.getRange(firstDataRow, 7, rows.length, 1).setDataValidation(rule).setHorizontalAlignment('center');

  // 합계 행
  var sumRow = lastDataRow + 1;
  sh.getRange(sumRow, 8).setValue('합계').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange(sumRow, 9).setFormula('=SUM(I' + firstDataRow + ':I' + lastDataRow + ')').setNumberFormat('#,##0').setFontWeight('bold');
  sh.getRange(sumRow, 10).setFormula('=SUM(J' + firstDataRow + ':J' + lastDataRow + ')').setNumberFormat('#,##0').setFontWeight('bold');

  // 조건부 서식: 완료(초록) / 마감 지남 미완료(빨강)
  applyConditionalFormats(sh, firstDataRow, lastDataRow);

  // 폭/틀고정/테두리
  var widths = [110, 92, 60, 260, 170, 90, 78, 200, 100, 100];
  widths.forEach(function (w, idx) { sh.setColumnWidth(idx + 1, w); });
  sh.setFrozenRows(headerRow);
  sh.getRange(headerRow, 1, lastDataRow - headerRow + 1, HEADERS.length)
    .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(firstDataRow, 1, rows.length, HEADERS.length).setVerticalAlignment('middle');

  return { firstDataRow: firstDataRow, lastDataRow: lastDataRow, sumRow: sumRow };
}

function applyConditionalFormats(sh, firstDataRow, lastDataRow) {
  var range = sh.getRange(firstDataRow, 1, lastDataRow - firstDataRow + 1, HEADERS.length);
  var rules = sh.getConditionalFormatRules();

  // 완료 → 연초록 배경
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$G' + firstDataRow + '="완료"')
      .setBackground('#e6f4ea')
      .setRanges([range])
      .build()
  );
  // 마감 지남 & 미완료 → 연빨강
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($G' + firstDataRow + '<>"완료",$B' + firstDataRow + '<>"",$B' + firstDataRow + '<TODAY())')
      .setBackground('#fdecec')
      .setRanges([range])
      .build()
  );
  // 임박(3일 이내) & 미완료 → 연노랑
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($G' + firstDataRow + '<>"완료",$B' + firstDataRow + '<>"",$B' + firstDataRow + '-TODAY()>=0,$B' + firstDataRow + '-TODAY()<=3)')
      .setBackground('#fff7e0')
      .setRanges([range])
      .build()
  );
  sh.setConditionalFormatRules(rules);
}

function addSummarySheet(sh, b) {
  var CL = "'체크리스트'!";
  var G = CL + 'G' + b.firstDataRow + ':G' + b.lastDataRow;
  var B = CL + 'B' + b.firstDataRow + ':B' + b.lastDataRow;
  var I = CL + 'I' + b.firstDataRow + ':I' + b.lastDataRow;
  var J = CL + 'J' + b.firstDataRow + ':J' + b.lastDataRow;
  sh.getRange('A1').setValue('진행 요약').setFontSize(13).setFontWeight('bold');
  var rows = [
    ['전체 항목', '=COUNTIF(' + G + ',"완료")+COUNTIF(' + G + ',"진행중")+COUNTIF(' + G + ',"할 일")'],
    ['완료', '=COUNTIF(' + G + ',"완료")'],
    ['진행중', '=COUNTIF(' + G + ',"진행중")'],
    ['할 일', '=COUNTIF(' + G + ',"할 일")'],
    ['진행률', '=IFERROR(B3/B2,0)'],
    ['지난 마감(미완료)', '=COUNTIFS(' + G + ',"<>완료",' + B + ',"<"&TODAY())'],
    ['예상비용 합계', '=SUM(' + I + ')'],
    ['실제비용 합계', '=SUM(' + J + ')']
  ];
  sh.getRange(2, 1, rows.length, 1).setValues(rows.map(function (x) { return [x[0]]; })).setFontWeight('bold');
  for (var i = 0; i < rows.length; i++) {
    sh.getRange(i + 2, 2).setFormula(rows[i][1]);
  }
  sh.getRange('B6').setNumberFormat('0%');   // 진행률
  sh.getRange('B8:B9').setNumberFormat('#,##0"원"');
  sh.setColumnWidth(1, 160);
  sh.setColumnWidth(2, 140);
}

// ── 날짜/숫자 유틸 ────────────────────────────────────────────

function parseYmd(s) {
  var m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d, n) {
  var x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function fmtDate(d, tz) {
  return Utilities.formatDate(d, tz || 'Asia/Seoul', 'yyyy.MM.dd');
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  var n = Number(String(v || '').replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
}

function joinNonEmpty(arr, sep) {
  return arr.filter(function (x) { return x && String(x).trim(); }).join(sep);
}

// ── 입력 다이얼로그 HTML (인라인) ─────────────────────────────
function getDialogHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
           margin: 0; padding: 16px; color: #1e293b; font-size: 13px; background: #f8fafc; }
    h2 { margin: 0 0 4px; font-size: 15px; }
    p.sub { margin: 0 0 14px; color: #64748b; font-size: 12px; }
    label { display: block; font-weight: 600; margin: 10px 0 4px; color: #475569; font-size: 12px; }
    .req::after { content: " *"; color: #dc2626; }
    input, select, textarea {
      width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px;
      font-size: 13px; font-family: inherit; background: #fff; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #3b6ef5; box-shadow: 0 0 0 3px #dbeafe; }
    .row { display: flex; gap: 10px; }
    .row > div { flex: 1; }
    .types { display: flex; gap: 8px; margin-top: 2px; }
    .types label { flex: 1; margin: 0; padding: 10px 8px; border: 1px solid #cbd5e1; border-radius: 8px;
      text-align: center; cursor: pointer; font-weight: 600; background: #fff; }
    .types input { display: none; }
    .types input:checked + span { color: #1f43ad; }
    .types label:has(input:checked) { border-color: #3b6ef5; background: #eef4ff; }
    .actions { margin-top: 18px; display: flex; gap: 8px; }
    button { flex: 1; padding: 10px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .primary { background: #2b57d6; color: #fff; }
    .primary:disabled { opacity: .5; cursor: default; }
    .ghost { background: #e2e8f0; color: #334155; }
    #result { margin-top: 14px; padding: 12px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; display: none; }
    #result a { color: #047857; font-weight: 700; word-break: break-all; }
    #err { margin-top: 12px; color: #dc2626; font-size: 12px; display: none; }
    .hint { color: #94a3b8; font-size: 11px; font-weight: 400; }
  </style>
</head>
<body>
  <h2>새 사업 준비 체크리스트</h2>
  <p class="sub">유형과 시작일에 맞춰 준비 항목·D-day 마감일이 자동으로 채워진 구글 시트를 만들어 공유합니다.</p>

  <form id="f">
    <label class="req">사업명</label>
    <input name="name" required placeholder="예: 2026 경남울산 현직자 멘토링" />

    <label class="req">유형</label>
    <div class="types">
      <label><input type="radio" name="type" value="online" checked><span>온라인<br>(Zoom)</span></label>
      <label><input type="radio" name="type" value="offline"><span>오프라인<br>교육/연수</span></label>
      <label><input type="radio" name="type" value="expo"><span>행사<br>(박람회)</span></label>
    </div>

    <div class="row">
      <div>
        <label class="req">시작일</label>
        <input type="date" name="startDate" required />
      </div>
      <div>
        <label>종료일 <span class="hint">(선택)</span></label>
        <input type="date" name="endDate" />
      </div>
    </div>

    <div class="row">
      <div><label>기관</label><input name="org" placeholder="예: 경상국립대학교" /></div>
      <div><label>부서</label><input name="dept" placeholder="예: 대학일자리플러스센터" /></div>
    </div>

    <div class="row">
      <div><label>담당자</label><input name="manager" /></div>
      <div><label>계약주체</label><input name="contractor" placeholder="예: 주식회사 예스잡" /></div>
    </div>

    <div class="row">
      <div><label>행사장</label><input name="venue" placeholder="온라인(Zoom) / 리조트 등" /></div>
      <div><label>시간</label><input name="time" placeholder="예: 19:00~21:00" /></div>
    </div>

    <label>예산 (원)</label>
    <input name="budget" inputmode="numeric" placeholder="예: 10000000" />

    <label>공유 대상 이메일 <span class="hint">(콤마로 여러 명, 선택)</span></label>
    <input name="emails" placeholder="a@x.com, b@y.com" />

    <label>비고 <span class="hint">(선택)</span></label>
    <textarea name="memo" rows="2"></textarea>

    <div class="actions">
      <button type="button" class="ghost" onclick="google.script.host.close()">취소</button>
      <button type="submit" class="primary" id="submit">체크리스트 생성</button>
    </div>
  </form>

  <div id="err"></div>
  <div id="result"></div>

  <script>
    document.getElementById('f').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('submit');
      var err = document.getElementById('err');
      err.style.display = 'none';
      btn.disabled = true; btn.textContent = '생성 중…';

      var form = {};
      new FormData(e.target).forEach(function (v, k) { form[k] = v; });

      google.script.run
        .withSuccessHandler(function (res) {
          var r = document.getElementById('result');
          r.style.display = 'block';
          r.innerHTML =
            '✅ <b>' + res.count + '개 준비 항목</b>으로 생성되었습니다' +
            (res.shared ? ' · ' + res.shared + '명에게 공유' : '') + '.<br>' +
            '<a href="' + res.url + '" target="_blank">시트 열기 →</a>';
          btn.textContent = '완료';
        })
        .withFailureHandler(function (e) {
          err.style.display = 'block';
          err.textContent = '오류: ' + e.message;
          btn.disabled = false; btn.textContent = '체크리스트 생성';
        })
        .generateChecklist(form);
    });
  </script>
</body>
</html>
`;
}
