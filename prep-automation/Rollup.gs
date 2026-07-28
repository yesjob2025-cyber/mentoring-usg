/**
 * 총괄 연동 — 운영현황 자동 보고
 * =============================================================
 * 각 사업 시트가 자기 진행상황(진행률·비용·참가·출석 등)을
 * 총괄 구글시트의 "운영현황" 탭에 "고유번호" 기준으로 한 줄씩 기록/갱신한다.
 *
 * 설정: [📈 총괄 연동 → 총괄 시트 연결] + [고유번호 설정] → [운영현황 보고]
 *       (또는 [자동 보고 켜기]로 매일 자동 보고)
 */

var ROLLUP_TAB = '운영현황';
var ROLLUP_HEADERS = ['고유번호', '사업명', '기관', '유형', '시작일', 'D-day', '진행률',
  '완료/전체', '지난마감', '예상비용', '실제비용', '참가인원', '오늘출석', '갱신시각', '링크'];

function rollupProps_() { return PropertiesService.getScriptProperties(); }

// ── 총괄 파일 새로 만들기 (내 드라이브에 생성 + 자동 연결) ─────
function createRollupFile() {
  var ui = SpreadsheetApp.getUi();
  // 스크립트까지 포함해 복제 → 총괄에서 onEdit(확정→사업총괄 자동생성)이 작동
  var master = SpreadsheetApp.getActiveSpreadsheet();
  var file = DriveApp.getFileById(master.getId()).makeCopy('YESJOB 사업총괄');
  var ss = SpreadsheetApp.openById(file.getId());
  var tmp = ss.insertSheet('__tmp__');
  ss.getSheets().forEach(function (s) { if (s.getSheetId() !== tmp.getSheetId()) ss.deleteSheet(s); });
  var defs = [
    ['사업총괄', ['고유번호', '사업형태', '사업구분', '진행', '연도', '월', '사업명', '기관', '담당자', '부서', '기타', '장소', '시작일자', '종료일자', '계약금액', '계약기업']],
    ['비용정리', ['고유번호', '정산', '사업연도', '사업명', '기관', '종료일', '처리', '처리일자', '처리법인', '처리방법', '금액', '사업자', '실 지급비용']],
    ['입찰&영업관리', ['연번', '날짜', '제안', '구분', '기관', '부서', '담당', '연락처', '사업명', '사업내용', '자격요건', '사업예산', '사업일자', '제출일자', '제안평가', '제출방법']],
    ['강사리스트', ['강사명', '전문분야', '소속', '연락처', '이메일', '단가', '비고']],
    ['업체리스트', ['업체명', '품목', '담당', '연락처', '비고']],
    [ROLLUP_TAB, ROLLUP_HEADERS],
    [PROPOSAL_TAB, PROPOSAL_HEADERS]
  ];
  defs.forEach(function (d, i) {
    var sh = (i === 0) ? tmp : ss.insertSheet();
    sh.setName(d[0]);
    sh.getRange(1, 1, 1, d[1].length).setValues([d[1]])
      .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  applyStatusValidation_(ss.getSheetByName(PROPOSAL_TAB)); // 상태 드롭다운
  rollupProps_().setProperty('ROLLUP_SS_ID', ss.getId());

  var url = ss.getUrl();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:16px">' +
    '✅ <b>총괄 파일이 생성되고 자동 연결되었습니다.</b><br><br>' +
    '탭: 사업총괄 · 비용정리 · 입찰&영업관리 · 강사리스트 · 업체리스트 · 운영현황 · 제안관리(자동)<br><br>' +
    '<b>제안관리</b>의 상태를 <b>"확정"</b>으로 바꾸면 <b>사업총괄</b>에 자동으로 추가됩니다.<br><br>' +
    '<a href="' + url + '" target="_blank">총괄 파일 열기 →</a></div>'
  ).setWidth(380).setHeight(230);
  ui.showModalDialog(html, '총괄 파일 생성 완료');
}

// ── 제안 "확정" → 사업총괄 자동 생성 (총괄 파일의 onEdit) ─────
function onEdit(e) {
  try {
    if (!e || !e.range || e.value == null) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== PROPOSAL_TAB) return;
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var statusCol = headers.indexOf('상태') + 1;
    if (statusCol === 0 || e.range.getColumn() !== statusCol) return;
    if (String(e.value).trim() !== '확정') return;
    if (e.range.getRow() < 2) return;
    promoteProposalToRollup_(sh, e.range.getRow());
  } catch (err) { /* onEdit는 조용히 */ }
}

function promoteProposalToRollup_(psh, row) {
  var headers = psh.getRange(1, 1, 1, psh.getLastColumn()).getValues()[0];
  var vals = psh.getRange(row, 1, 1, psh.getLastColumn()).getValues()[0];
  function g(name) { var i = headers.indexOf(name); return i >= 0 ? vals[i] : ''; }

  var code = String(g('고유번호') || '').trim();
  if (!code) return;
  var ss = psh.getParent();
  var target = ss.getSheetByName('사업총괄');
  if (!target) return;

  // 중복 방지 (이미 사업총괄에 있으면 건너뜀)
  var last = target.getLastRow();
  var codes = last > 1 ? target.getRange(2, 1, last - 1, 1).getValues() : [];
  for (var i = 0; i < codes.length; i++) {
    if (String(codes[i][0]).trim() === code) return;
  }

  var typeMap = { '교육': 'A.교육', '온라인': 'B.온라인', '행사': 'C.행사' };
  var d = firstDateStr_(g('사업일자'));
  var year = d ? d.substr(0, 4) : '';
  var month = d ? String(Number(d.substr(5, 2))) : '';
  target.appendRow([
    code, (typeMap[g('유형')] || g('유형') || ''), g('구분') || '', '1. 계약', year, month,
    g('사업명') || '', g('기관') || '', g('담당자') || '', g('부서') || '', '', '',
    g('사업일자') || '', g('사업일자') || '', g('사업예산') || '', ''
  ]);
}

// ── 설정 ──────────────────────────────────────────────────────
function connectRollup() {
  var ui = SpreadsheetApp.getUi();
  var cur = rollupProps_().getProperty('ROLLUP_SS_ID') || '(미연결)';
  var res = ui.prompt('총괄 시트 연결',
    '총괄 구글시트의 URL 또는 ID를 붙여넣으세요.\n(총괄 파일을 먼저 "구글 스프레드시트"로 저장해야 합니다)\n\n현재: ' + cur,
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var id = extractSheetId_(res.getResponseText().trim());
  if (!id) { ui.alert('시트 URL/ID를 인식할 수 없습니다.'); return; }
  try {
    var ss = SpreadsheetApp.openById(id);
    ss.getName();
  } catch (e) { ui.alert('그 시트를 열 수 없습니다. 접근 권한/ID를 확인하세요.\n' + e); return; }
  rollupProps_().setProperty('ROLLUP_SS_ID', id);
  ui.alert('총괄 시트가 연결되었습니다.');
}

function setProjectCode() {
  var ui = SpreadsheetApp.getUi();
  var cur = rollupProps_().getProperty('PROJECT_CODE') || '(미설정)';
  var res = ui.prompt('고유번호 설정',
    '이 사업의 고유번호를 입력하세요. (총괄의 "고유번호"와 동일하게, 예: C251101_01)\n\n현재: ' + cur,
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var code = res.getResponseText().trim();
  if (!code) return;
  rollupProps_().setProperty('PROJECT_CODE', code);
  ui.alert('고유번호가 설정되었습니다: ' + code);
}

function extractSheetId_(raw) {
  if (!raw) return '';
  var m = raw.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return '';
}

// ── 보고 ──────────────────────────────────────────────────────
function reportToRollup() {
  var ui = SpreadsheetApp.getUi();
  var r = doReportToRollup_();
  if (r.ok) ui.alert('총괄 "운영현황"에 보고되었습니다.\n고유번호: ' + r.code);
  else ui.alert('보고 실패: ' + r.msg);
}

/** 실제 보고 로직 (트리거에서도 호출) */
function doReportToRollup_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = rollupProps_();
  var rollupId = props.getProperty('ROLLUP_SS_ID');
  // 고유번호: 사업 시트 개요의 값 우선, 없으면 [고유번호 설정] 값
  var code = String(readOverview_(ss)['고유번호'] || '').trim() || props.getProperty('PROJECT_CODE');
  if (!rollupId) return { ok: false, msg: '먼저 [총괄 시트 연결] 또는 [총괄 파일 새로 만들기]를 하세요.' };
  if (!code) return { ok: false, msg: '고유번호가 없습니다. 사업 폼의 고유번호 칸에 입력하거나 [고유번호 설정]을 하세요.' };

  var row = buildRollupRow_(ss, code);
  var rollup;
  try { rollup = SpreadsheetApp.openById(rollupId); }
  catch (e) { return { ok: false, msg: '총괄 시트를 열 수 없습니다.' }; }

  var sh = rollup.getSheetByName(ROLLUP_TAB);
  if (!sh) {
    sh = rollup.insertSheet(ROLLUP_TAB);
    sh.getRange(1, 1, 1, ROLLUP_HEADERS.length).setValues([ROLLUP_HEADERS])
      .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  // 고유번호로 upsert
  var last = sh.getLastRow();
  var codes = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
  var target = -1;
  for (var i = 0; i < codes.length; i++) {
    if (String(codes[i][0]).trim() === code) { target = i + 2; break; }
  }
  if (target === -1) target = last + 1;
  sh.getRange(target, 1, 1, row.length).setValues([row]);
  return { ok: true, code: code };
}

function buildRollupRow_(ss, code) {
  var ov = readOverview_(ss);
  var name = projectName_(ss);
  var org = String(ov['기관 / 부서'] || ov['기관'] || '');
  var type = String(ov['유형'] || '');
  var startStr = firstDateStr_(ov['일정']);
  var dday = ddayNum_(startStr);

  // 요약 탭에서 진행/비용 읽기
  var total = '', done = '', prog = '', overdue = '', est = '', act = '';
  var sum = ss.getSheetByName('요약');
  if (sum) {
    var v = sum.getRange('B2:B9').getValues();
    total = v[0][0]; done = v[1][0]; prog = v[4][0]; overdue = v[5][0]; est = v[6][0]; act = v[7][0];
  }
  var progPct = (typeof prog === 'number') ? Math.round(prog * 100) + '%' : String(prog || '');

  var roster = readTable_(ss, '참석자명단');
  var attendToday = todayAttendCount_(ss);

  return [
    code, name, org, type, startStr, (dday === '' ? '' : dday), progPct,
    (done !== '' ? done + '/' + total : ''), overdue, est, act,
    roster.length, attendToday, hubTs_(), ss.getUrl()
  ];
}

function firstDateStr_(v) {
  var m = String(v || '').match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  return m ? (m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)) : '';
}
function ddayNum_(startStr) {
  if (!startStr) return '';
  var dm = startStr.split('-');
  var start = new Date(Number(dm[0]), Number(dm[1]) - 1, Number(dm[2]));
  var n = new Date();
  var today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}
function todayAttendCount_(ss) {
  var sh = ss.getSheetByName('출결로그');
  if (!sh || sh.getLastRow() < 2) return 0;
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  var vals = sh.getDataRange().getValues();
  var set = {};
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || '').indexOf(today) === 0) set[String(vals[i][1]) + '|' + String(vals[i][2])] = 1;
  }
  return Object.keys(set).length;
}

// ── 자동 보고 (매일) ──────────────────────────────────────────
function enableAutoRollup() {
  var ui = SpreadsheetApp.getUi();
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'doReportToRollup_'; });
  if (exists) { ui.alert('이미 자동 보고가 켜져 있습니다.'); return; }
  ScriptApp.newTrigger('doReportToRollup_').timeBased().everyDays(1).atHour(8).create();
  ui.alert('자동 보고가 켜졌습니다. 매일 오전 8시경 총괄에 현황이 갱신됩니다.');
}
function disableAutoRollup() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'doReportToRollup_') { ScriptApp.deleteTrigger(t); removed++; }
  });
  SpreadsheetApp.getUi().alert(removed ? '자동 보고를 껐습니다.' : '켜져 있는 자동 보고가 없습니다.');
}
