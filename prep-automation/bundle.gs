/**
 * 교육사업 준비 자동화 — 올인원(단일 파일) v2
 * =============================================================
 * 이 파일 하나만 Apps Script 편집기(Code.gs)에 붙여넣으면 됩니다.
 *
 * ★ 반드시 "구글 시트 안에서" 열어야 합니다:
 *   빈 구글 시트 → 확장 프로그램 → Apps Script → 이 내용 전체 붙여넣기 → 저장
 *   → createSampleChecklist 실행해 권한 허용 → 시트 새로고침(F5)
 *   → 상단 [교육사업 준비] 메뉴 사용.
 *
 * v2: 참석자명단/강사·스케줄 데이터 탭 + 산출물 자동생성
 *   (여행자보험 명단·학생 안내문·강사 확인문·명찰·배너 문구) + 결과보고서 자동생성.
 */

// ===== 템플릿 =====
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

// ===== 메뉴 · 시트 생성 =====
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
        .addItem('명찰(인쇄용)', 'genNameTags')
        .addItem('현수막·X배너 문구', 'genBannerCopy')
    )
    .addItem('📊 결과보고서 생성', 'genReport')
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

var ROSTER_HEADERS = ['연번', '학교', '성명', '학과', '학번', '학년', '성별', '연락처', '주민등록번호', '조', '방배정', '계좌(은행)', '비고'];
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

// ===== 산출물 생성기 =====
/**
 * 산출물 생성기 — 명단/강사 데이터 + 행사개요로 실제 준비물을 자동 생성
 * =============================================================
 * 각 함수는 "현재 열려있는 사업 시트"(getActive)에서 실행된다.
 *  - 여행자보험 명단 / 학생 안내문 / 강사 스케줄 확인문 / 명찰 / 배너 문구 / 결과보고서
 * 생성물은 같은 Drive 폴더에 만들어지고, 체크리스트 해당 항목에 링크·완료가 자동 기입된다.
 */

// ── 공통 헬퍼 ─────────────────────────────────────────────────

function activeSS_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('구글 시트 안에서 실행해 주세요.');
  return ss;
}

function toast_(msg) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, '산출물 생성', 6); } catch (e) {}
}

// 문서 스타일 헬퍼 (Paragraph 직접 스타일 지원 안 되는 것 회피)
function pColor_(p, color) { p.editAsText().setForegroundColor(color); return p; }
function pNote_(body, text) { return pColor_(body.appendParagraph(text), '#64748b'); }
function pBg_(body, text, bg) { var p = body.appendParagraph(text); p.editAsText().setBackgroundColor(bg); return p; }

// 표 셀을 모두 문자열로 (appendTable 은 String[][] 필요)
function strTable_(rows) {
  return rows.map(function (r) { return r.map(function (c) { return (c == null ? '' : String(c)); }); });
}
function boldHeaderRow_(table) {
  var row = table.getRow(0);
  for (var c = 0; c < row.getNumCells(); c++) row.getCell(c).editAsText().setBold(true);
}

/** 체크리스트 상단 개요 블록을 {라벨:값}으로 읽음 */
function readOverview_(ss) {
  var sh = ss.getSheetByName('체크리스트');
  var out = {};
  if (!sh) return out;
  var last = Math.min(sh.getLastRow(), 30);
  var vals = sh.getRange(1, 1, last, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    var k = String(vals[i][0] || '').trim();
    if (k === '구분') break; // 표 헤더 도달
    if (k) out[k] = vals[i][1];
  }
  return out;
}

/** 사업명 (개요 or 시트 이름에서) */
function projectName_(ss) {
  var ov = readOverview_(ss);
  if (ov['사업명']) return String(ov['사업명']);
  return ss.getName().replace(/\s*—.*$/, '');
}

/** 입력 탭을 헤더 기준 객체 배열로 읽음. 헤더는 2행, 데이터는 3행부터. */
function readTable_(ss, sheetName) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 3) return [];
  var headers = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var data = sh.getRange(3, 1, sh.getLastRow() - 2, sh.getLastColumn()).getValues();
  var rows = [];
  data.forEach(function (r) {
    if (r.every(function (c) { return c === '' || c === null; })) return; // 빈 줄 스킵
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    rows.push(obj);
  });
  return rows;
}

/** 생성물을 현재 사업 파일과 같은 폴더로 이동 */
function moveNextTo_(fileId, ss) {
  try {
    var parents = DriveApp.getFileById(ss.getId()).getParents();
    if (parents.hasNext()) DriveApp.getFileById(fileId).moveTo(parents.next());
  } catch (e) {}
}

/** 주민등록번호 → {birth:'YYYY-MM-DD', gender:'남/여'} */
function rrnToBirth_(rrn) {
  var s = String(rrn == null ? '' : rrn).replace(/[^0-9]/g, '');
  if (s.length < 7) return { birth: '', gender: '' };
  var yy = s.substr(0, 2), mm = s.substr(2, 2), dd = s.substr(4, 2), g = s.charAt(6);
  var c = (g === '1' || g === '2' || g === '5' || g === '6') ? '19'
    : (g === '3' || g === '4' || g === '7' || g === '8') ? '20' : '19';
  var gender = (Number(g) % 2 === 1) ? '남' : '여';
  return { birth: c + yy + '-' + mm + '-' + dd, gender: gender };
}

/** 체크리스트에서 세부진행(D열)에 키워드가 포함된 행의 상태(G)=완료, 비고(H)=링크 */
function markChecklist_(ss, keyword, link, noteText) {
  var sh = ss.getSheetByName('체크리스트');
  if (!sh) return;
  var last = sh.getLastRow();
  var titles = sh.getRange(1, 4, last, 1).getValues(); // D열
  for (var i = 0; i < titles.length; i++) {
    var t = String(titles[i][0] || '');
    if (t && t.indexOf(keyword) !== -1) {
      var row = i + 1;
      sh.getRange(row, 7).setValue('완료');
      var note = noteText || '자동 생성됨';
      sh.getRange(row, 8).setValue(note);
      if (link) sh.getRange(row, 8).setFormula('=HYPERLINK("' + link + '","' + note + '")');
      return;
    }
  }
}

function fmtKoDate_(d) {
  if (!(d instanceof Date)) {
    var p = parseYmd(String(d));
    if (!p) return String(d || '');
    d = p;
  }
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy년 M월 d일');
}

// ── 1) 여행자보험 명단 ────────────────────────────────────────

function genInsurance() {
  var ss = activeSS_();
  var roster = readTable_(ss, '참석자명단');
  if (!roster.length) { SpreadsheetApp.getUi().alert("'참석자명단' 탭에 참석자를 먼저 입력해 주세요."); return; }

  var out = ss.getSheetByName('여행자보험명단') || ss.insertSheet('여행자보험명단');
  out.clear();
  var headers = ['연번', '성명', '생년월일', '성별', '연락처', '학교', '주민등록번호'];
  out.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  var rows = roster.map(function (r, i) {
    var b = rrnToBirth_(r['주민등록번호']);
    return [i + 1, r['성명'] || '', b.birth, r['성별'] || b.gender, r['연락처'] || '', r['학교'] || '', r['주민등록번호'] || ''];
  });
  if (rows.length) out.getRange(2, 1, rows.length, headers.length).setValues(rows);
  out.setFrozenRows(1);
  out.autoResizeColumns(1, headers.length);
  out.activate();

  markChecklist_(ss, '여행자보험', '', roster.length + '명 명단 생성 완료');
  toast_('여행자보험명단 ' + rows.length + '명 생성 완료');
}

// ── 2) 학생 안내문 ────────────────────────────────────────────

function genStudentNotice() {
  var ss = activeSS_();
  var ov = readOverview_(ss);
  var name = projectName_(ss);
  var doc = DocumentApp.create('[안내문] ' + name);
  var body = doc.getBody();

  body.appendParagraph(name).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('참가 안내').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('안녕하세요. ' + name + ' 참가자 여러분께 일정과 준비사항을 안내드립니다.');

  var info = [
    ['일정', ov['일정'] || ''],
    ['시간', ov['시간'] || ''],
    ['장소', ov['행사장'] || ''],
    ['주최/기관', ov['기관 / 부서'] || ov['기관'] || '']
  ].filter(function (r) { return r[1]; });
  if (info.length) {
    body.appendTable(strTable_(info)).setBorderColor('#cccccc');
  }

  body.appendParagraph('준비사항').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  ['신분증 지참', '노트북/필기구 지참', '오픈채팅방 참여 및 공지 확인', '시간 엄수(정시 시작)']
    .forEach(function (s) { body.appendListItem(s).setGlyphType(DocumentApp.GlyphType.BULLET); });

  body.appendParagraph('유의사항').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  ['일정은 현장 사정에 따라 일부 변경될 수 있습니다.', '문의: 운영 담당자에게 오픈채팅방으로 연락 바랍니다.']
    .forEach(function (s) { body.appendListItem(s).setGlyphType(DocumentApp.GlyphType.BULLET); });

  pNote_(body, '\n※ 아래 문자/카톡용 요약본을 그대로 복사해 보내셔도 됩니다.');
  var sms = '[' + name + ']\n' +
    (ov['일정'] ? '일정: ' + ov['일정'] + '\n' : '') +
    (ov['시간'] ? '시간: ' + ov['시간'] + '\n' : '') +
    (ov['행사장'] ? '장소: ' + ov['행사장'] + '\n' : '') +
    '준비물: 신분증, 노트북/필기구\n정시 시작이니 시간 엄수 부탁드립니다.';
  pBg_(body, sms, '#f1f5f9');

  doc.saveAndClose();
  moveNextTo_(doc.getId(), ss);
  markChecklist_(ss, '학생 안내', doc.getUrl(), '안내문 생성됨');
  toast_('학생 안내문 생성 완료');
  safeOpenUrl_(doc.getUrl(), '학생 안내문');
}

// ── 3) 강사 스케줄 확인문 ─────────────────────────────────────

function genSpeakerConfirm() {
  var ss = activeSS_();
  var speakers = readTable_(ss, '강사·스케줄');
  if (!speakers.length) { SpreadsheetApp.getUi().alert("'강사·스케줄' 탭에 강사/세션을 먼저 입력해 주세요."); return; }
  var ov = readOverview_(ss);
  var name = projectName_(ss);

  var doc = DocumentApp.create('[강사확인문] ' + name);
  var body = doc.getBody();
  body.appendParagraph(name + ' — 강사 스케줄 확인문').setHeading(DocumentApp.ParagraphHeading.TITLE);

  speakers.forEach(function (s, idx) {
    if (idx > 0) body.appendPageBreak();
    var who = (s['강사명'] || '강사') + ' 님' + (s['소속'] ? ' (' + s['소속'] + ')' : '');
    body.appendParagraph(who + ' 귀하').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('아래와 같이 강의 일정을 안내드립니다. 확인 부탁드립니다.');
    var rows = [
      ['행사', name],
      ['세션', s['세션명'] || ''],
      ['일자', s['일자'] ? fmtKoDate_(s['일자']) : ''],
      ['시간', s['시간'] || ''],
      ['장소', s['장소'] || ov['행사장'] || ''],
      ['준비물', s['준비물'] || ''],
      ['강사료', s['강사료'] || '']
    ].filter(function (r) { return r[1] !== ''; });
    body.appendTable(strTable_(rows)).setBorderColor('#cccccc');
    pNote_(body, '※ 변동 사항이 있으면 운영 담당자에게 회신 부탁드립니다.');
  });

  doc.saveAndClose();
  moveNextTo_(doc.getId(), ss);
  markChecklist_(ss, '강사', doc.getUrl(), speakers.length + '명 확인문 생성');
  toast_('강사 스케줄 확인문 ' + speakers.length + '명 생성 완료');
  safeOpenUrl_(doc.getUrl(), '강사 확인문');
}

// ── 4) 명찰 (인쇄용, Doc 2열 카드) ────────────────────────────

function genNameTags() {
  var ss = activeSS_();
  var roster = readTable_(ss, '참석자명단');
  if (!roster.length) { SpreadsheetApp.getUi().alert("'참석자명단' 탭에 참석자를 먼저 입력해 주세요."); return; }
  var name = projectName_(ss);

  var doc = DocumentApp.create('[명찰] ' + name);
  var body = doc.getBody();
  pColor_(body.appendParagraph(name + ' 명찰 (인쇄용)').setHeading(DocumentApp.ParagraphHeading.HEADING3), '#94a3b8');

  // 2열 표에 카드 채우기
  var cells = [];
  for (var i = 0; i < roster.length; i += 2) {
    cells.push([nameCardText_(roster[i], name), i + 1 < roster.length ? nameCardText_(roster[i + 1], name) : '']);
  }
  var table = body.appendTable(cells);
  table.setBorderColor('#94a3b8').setBorderWidth(1);
  // 셀 서식: 여백/높이
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(14).setPaddingBottom(14).setPaddingLeft(12).setPaddingRight(12);
      if (cell.getChild(0).asParagraph) {
        try { cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER); } catch (e) {}
      }
    }
  }
  doc.saveAndClose();
  moveNextTo_(doc.getId(), ss);
  markChecklist_(ss, '명찰', doc.getUrl(), roster.length + '개 명찰 생성');
  toast_('명찰 ' + roster.length + '개 생성 완료');
  safeOpenUrl_(doc.getUrl(), '명찰');
}

function nameCardText_(r, projectName) {
  var line2 = [r['학교'], r['학과']].filter(Boolean).join(' · ');
  var line3 = [r['조'] ? r['조'] : '', r['학번'] ? r['학번'] : ''].filter(Boolean).join('  ');
  return (r['성명'] || '') + '\n' + line2 + (line3 ? '\n' + line3 : '');
}

// ── 5) 현수막·X배너 문구/규격 ─────────────────────────────────

function genBannerCopy() {
  var ss = activeSS_();
  var ov = readOverview_(ss);
  var name = projectName_(ss);

  var doc = DocumentApp.create('[배너문구] ' + name);
  var body = doc.getBody();
  body.appendParagraph(name + ' — 현수막 · X배너 문구/규격').setHeading(DocumentApp.ParagraphHeading.TITLE);
  pNote_(body, '아래 문구로 시안 제작을 의뢰하세요. 규격은 일반적인 예시이며 현장에 맞게 조정하세요.');

  var subtitle = [ov['일정'], ov['행사장']].filter(Boolean).join(' · ');
  var host = ov['기관 / 부서'] || ov['기관'] || '';

  function block(title, size, lines) {
    body.appendParagraph(title + '   (' + size + ')').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    lines.filter(Boolean).forEach(function (l) {
      body.appendListItem(l).setGlyphType(DocumentApp.GlyphType.BULLET);
    });
  }

  block('행사장 현수막', '예: 7000×1000mm', [
    '메인: ' + name,
    subtitle ? '서브: ' + subtitle : '',
    host ? '주최/주관: ' + host : ''
  ]);
  block('무대 세로 현수막', '예: 1500×2500mm / 2장', [name, subtitle]);
  block('X배너', '예: 600×1800mm', [name, subtitle, '환영합니다 / 안내']);
  block('만족도 안내 X배너', '예: 600×1800mm', ['만족도 설문 참여 안내', 'QR 코드 삽입 위치 표시']);
  block('안내데스크 백월/전면', '예: 3930×2460mm / 950×750mm', [name, host]);

  doc.saveAndClose();
  moveNextTo_(doc.getId(), ss);
  markChecklist_(ss, '현수막', doc.getUrl(), '문구/규격 생성');
  markChecklist_(ss, 'X배너', doc.getUrl(), '문구/규격 생성');
  toast_('현수막·X배너 문구 생성 완료');
  safeOpenUrl_(doc.getUrl(), '배너 문구');
}

// ── 안내: 링크 열기 (다이얼로그) ──────────────────────────────

function safeOpenUrl_(url, label) {
  try {
    var html = HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:14px">' +
      '✅ <b>' + label + '</b> 생성 완료<br><br>' +
      '<a href="' + url + '" target="_blank">파일 열기 →</a></div>'
    ).setWidth(320).setHeight(120);
    SpreadsheetApp.getUi().showModalDialog(html, label);
  } catch (e) {}
}

// ===== 결과보고서 =====
/**
 * 결과보고서 자동 생성
 * =============================================================
 * 참석자명단(참여인원) + 만족도 설문(Likert 평균·주관식) + 행사개요를 모아
 * 결과보고서 Google Docs 초안을 생성하고 PDF로도 저장한다.
 *
 * 만족도 데이터: 이름에 "설문" 또는 "만족도"가 포함된 탭을 자동 인식.
 *   (구글폼 응답: 1행 질문 헤더, 2행부터 응답. 값이 "매우 그렇다~매우 그렇지 않다"인 열을 점수화)
 */

var LIKERT_MAP = {
  '매우 그렇다': 5, '그렇다': 4, '보통이다': 3, '보통': 3,
  '그렇지 않다': 2, '그렇지않다': 2, '매우 그렇지 않다': 1, '매우 그렇지않다': 1,
  '매우 만족': 5, '만족': 4, '불만족': 2, '매우 불만족': 1
};

function findSurveySheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName();
    if (n.indexOf('설문') !== -1 || n.indexOf('만족도') !== -1) return sheets[i];
  }
  return null;
}

/** 설문 시트 분석 → {responses, questions:[{q, avg, n}], comments:[...]} */
function analyzeSurvey_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var rows = data.filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); });

  var questions = [];
  var comments = [];
  for (var c = 0; c < headers.length; c++) {
    var head = String(headers[c] || '').trim();
    if (!head) continue;
    if (head.indexOf('타임스탬프') !== -1 || head.toLowerCase().indexOf('timestamp') !== -1) continue;

    var mapped = 0, sum = 0, textVals = [];
    for (var i = 0; i < rows.length; i++) {
      var v = String(rows[i][c] == null ? '' : rows[i][c]).trim();
      if (v === '') continue;
      if (LIKERT_MAP.hasOwnProperty(v)) { mapped++; sum += LIKERT_MAP[v]; }
      else if (v !== '.' && v.length > 1) textVals.push(v);
    }
    if (mapped >= Math.max(1, rows.length * 0.4)) {
      questions.push({ q: head, avg: sum / mapped, n: mapped });
    } else if (textVals.length) {
      textVals.forEach(function (t) { comments.push(t); });
    }
  }
  return { responses: rows.length, questions: questions, comments: comments };
}

function genReport() {
  var ss = activeSS_();
  var ov = readOverview_(ss);
  var name = projectName_(ss);
  var roster = readTable_(ss, '참석자명단');
  var survey = analyzeSurvey_(findSurveySheet_(ss));

  var doc = DocumentApp.create('[결과보고서] ' + name);
  var body = doc.getBody();
  body.appendParagraph(name).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('결과보고서').setHeading(DocumentApp.ParagraphHeading.SUBTITLE);

  // 1. 사업 개요
  body.appendParagraph('1. 사업 개요').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var info = [
    ['사업명', name],
    ['일정', String(ov['일정'] || '')],
    ['장소', String(ov['행사장'] || '')],
    ['주최/기관', String(ov['기관 / 부서'] || ov['기관'] || '')],
    ['예산', ov['예산'] ? Number(ov['예산']).toLocaleString('ko-KR') + '원' : '']
  ].filter(function (r) { return r[1]; });
  body.appendTable(strTable_(info)).setBorderColor('#cccccc');

  // 2. 참여 현황
  body.appendParagraph('2. 참여 현황').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var schools = {};
  roster.forEach(function (r) { if (r['학교']) schools[String(r['학교'])] = 1; });
  var schoolCnt = Object.keys(schools).length;
  body.appendParagraph('총 참여인원: ' + roster.length + '명' + (schoolCnt ? ' (참여 학교 ' + schoolCnt + '개)' : ''));

  // 3. 만족도 결과
  body.appendParagraph('3. 만족도 조사 결과').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (survey && survey.questions.length) {
    var overall = survey.questions.reduce(function (a, q) { return a + q.avg; }, 0) / survey.questions.length;
    body.appendParagraph('응답 ' + survey.responses + '건 · 전체 평균 ' + overall.toFixed(2) + ' / 5.0')
      .editAsText().setBold(true);
    var tbl = [['문항', '평균(5점)', '응답수']];
    survey.questions.forEach(function (q) {
      tbl.push([q.q.length > 45 ? q.q.substr(0, 45) + '…' : q.q, q.avg.toFixed(2), String(q.n)]);
    });
    var t = body.appendTable(strTable_(tbl));
    t.setBorderColor('#cccccc');
    boldHeaderRow_(t);

    // 4. 주요 의견
    if (survey.comments.length) {
      body.appendParagraph('4. 주요 소감 및 개선 의견').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      survey.comments.slice(0, 25).forEach(function (t) {
        body.appendListItem(t).setGlyphType(DocumentApp.GlyphType.BULLET);
      });
      if (survey.comments.length > 25) {
        pColor_(body.appendParagraph('… 외 ' + (survey.comments.length - 25) + '건'), '#94a3b8');
      }
    }
  } else {
    pColor_(body.appendParagraph('만족도 설문 데이터가 없습니다. "설문" 또는 "만족도"라는 이름의 탭에 응답을 붙여넣으면 자동 집계됩니다.'), '#dc2626');
  }

  // 맺음말
  body.appendParagraph('5. 종합 의견').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  pNote_(body, '(자동 초안) 위 결과를 바탕으로 사업 목표 달성 여부와 향후 개선 방향을 정리하세요.');

  doc.saveAndClose();
  moveNextTo_(doc.getId(), ss);

  // PDF로도 저장
  var pdfUrl = '';
  try {
    var docFile = DriveApp.getFileById(doc.getId());
    var pdfBlob = docFile.getAs('application/pdf').setName('[결과보고서] ' + name + '.pdf');
    var parents = docFile.getParents();
    var folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    pdfUrl = folder.createFile(pdfBlob).getUrl();
  } catch (e) {}

  markChecklist_(ss, '결과보고', doc.getUrl(), '결과보고서 생성');
  toast_('결과보고서 생성 완료' + (pdfUrl ? ' (PDF 포함)' : ''));
  safeOpenUrl_(doc.getUrl(), '결과보고서');
}

// ── 입력 다이얼로그 HTML (인라인) ─────
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
