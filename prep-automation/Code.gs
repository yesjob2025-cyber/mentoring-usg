/**
 * 교육사업 준비 자동화 — Google Apps Script
 * =============================================================
 * 별도 서버/앱 없이 Google Drive 안에서만 도는 프로세스.
 *  - 관리용 스프레드시트의 메뉴에서 "새 사업 체크리스트 생성" 클릭
 *  - 유형(온라인/오프라인/박람회)·시작일 기준으로 준비 항목 + D-day 마감일 자동 생성
 *  - 새 구글 시트를 지정 Drive 폴더에 만들고, 입력한 이메일로 공유 후 링크 반환
 *
 * 설치/사용법은 README.md 참고.
 */

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
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📋 교육사업 준비')
    .addItem('＋ 새 사업 준비 시트 만들기', 'openDialog')
    .addSeparator()
    .addSubMenu(
      ui.createMenu('📄 산출물 생성 (현재 시트)')
        .addItem('여행자보험 명단', 'genInsurance')
        .addItem('학생 안내문', 'genStudentNotice')
        .addItem('강사 스케줄 확인문', 'genSpeakerConfirm')
        .addItem('명찰(인쇄용 Doc)', 'genNameTags')
        .addItem('명찰용 CSV (미리캔버스/캔바 대량제작)', 'genNameTagCSV')
        .addItem('현수막·X배너 문구', 'genBannerCopy')
    )
    .addItem('📊 결과보고서 생성', 'genReport')
    .addSeparator()
    .addSubMenu(
      ui.createMenu('🌐 행사 페이지 (오픈채팅 대체)')
        .addItem('① 행사 페이지 준비 (탭 생성)', 'setupHub')
        .addItem('② 배포 방법 안내', 'showDeployHelp')
        .addItem('③ 웹앱 주소 등록 (배포 후 복사한 링크)', 'registerHubUrl')
        .addItem('④ 참가자 링크·QR 보기', 'showHubLink')
        .addItem('⑤ 회차별 출결 QR (현장 게시용)', 'showAttendQR')
        .addSeparator()
        .addItem('💬 오픈채팅 링크 등록', 'registerOpenChat')
    )
    .addSeparator()
    .addItem('📂 저장 폴더 지정', 'setFolder')
    .addItem('ℹ️ 사용 안내', 'showHelp')
    .addToUi();
}

function openDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Dialog')
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

  // 1) 이 스크립트가 붙은 시트를 "스크립트째로 복제" → 새 사업 파일에도 메뉴/산출물 기능이 그대로 따라감
  var master = SpreadsheetApp.getActiveSpreadsheet();
  if (!master) {
    throw new Error('이 스크립트는 구글 시트에 연결된 상태에서 실행해야 합니다. (시트 → 확장 프로그램 → Apps Script)');
  }
  var title = form.name.trim() + ' — 준비 체크리스트';
  var file = DriveApp.getFileById(master.getId()).makeCopy(title);
  var ss = SpreadsheetApp.openById(file.getId());

  // 복제본을 깨끗이 비우고 필요한 탭만 새로 구성 (이름 충돌 방지: 임시명으로 삽입 후 정리)
  var sh = ss.insertSheet('__build__', 0);
  ss.getSheets().forEach(function (s) {
    if (s.getSheetId() !== sh.getSheetId()) ss.deleteSheet(s);
  });
  sh.setName('체크리스트');

  var bounds = buildSheet(sh, form, typeLabel, start, end, items);
  addSummarySheet(ss.insertSheet('요약'), bounds);
  createDataTabs(ss);

  // 2) Drive 폴더로 이동
  var cfg = getConfig();
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

// ── 데이터 입력 탭 (명단 / 강사·스케줄) ───────────────────────

var ROSTER_HEADERS = ['연번', '학교', '성명', '학과', '학번', '학년', '성별', '연락처', '주민등록번호', '조', '분반', '방배정', '계좌(은행)', '비고'];
var SPEAKER_HEADERS = ['일자', '시간', '세션명', '강사명', '소속', '연락처', '장소', '준비물', '강사료', '비고'];

function createDataTabs(ss) {
  makeInputSheet(ss, '참석자명단', ROSTER_HEADERS, 40,
    '↓ 여기에 참석자를 입력하세요. 이 명단으로 여행자보험 명단·명찰·안내문이 자동 생성됩니다.');
  makeInputSheet(ss, '강사·스케줄', SPEAKER_HEADERS, 20,
    '↓ 여기에 강사/세션을 입력하세요. 이 표로 강사 스케줄 확인문이 자동 생성됩니다.');
}

function makeInputSheet(ss, name, headers, emptyRows, guide) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).merge().setValue(guide)
    .setFontColor('#64748b').setFontStyle('italic').setBackground('#f1f5f9');
  sh.getRange(2, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff')
    .setHorizontalAlignment('center');
  sh.setFrozenRows(2);
  var widths = { '성명': 90, '학과': 150, '주민등록번호': 130, '연락처': 120, '세션명': 180, '준비물': 160, '계좌(은행)': 140 };
  headers.forEach(function (h, i) { sh.setColumnWidth(i + 1, widths[h] || 80); });
  if (emptyRows > 0) {
    sh.getRange(3, 1, emptyRows, headers.length)
      .setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
  }
  return sh;
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
