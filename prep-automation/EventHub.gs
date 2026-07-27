/**
 * 행사 전용 모바일 허브 페이지 (오픈채팅 대체)
 * =============================================================
 * - 참가자는 "이름 + 학번"으로 입장 (사전 등록된 참석자명단과 대조)
 * - 단방향: 공지/안내·자료 링크를 보고 [확인] 클릭
 * - 회차(교시)별 [출석 체크] → 시작시각과 비교해 지각 자동 판정
 * 모든 기록은 이 사업 시트의 로그 탭에 자동 저장된다.
 *
 * 웹앱으로 배포해야 링크가 생성된다. (배포 → 웹 앱 / 실행: 나 / 액세스: 모든 사용자)
 */

var HUB_SHEETS = {
  notice: '공지',
  session: '회차',
  entryLog: '입장로그',
  attendLog: '출결로그',
  ackLog: '확인로그',
  status: '출결현황'
};
var LATE_GRACE_DEFAULT = 10; // 지각 기준(분): 시작 + N분 초과 시 지각

// ── 스프레드시트 핸들 (웹앱 컨텍스트 대비 저장된 ID 우선) ──────
function getHubSS_() {
  var id = PropertiesService.getScriptProperties().getProperty('HUB_SS_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ── 허브 탭 생성 / 초기화 (메뉴에서 실행) ─────────────────────
function setupHub() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) { throw new Error('구글 시트 안에서 실행해 주세요.'); }
  PropertiesService.getScriptProperties().setProperty('HUB_SS_ID', ss.getId());

  hubSheetWithHeaders_(ss, HUB_SHEETS.notice,
    ['제목', '내용', '링크', '고정', '게시일시'],
    '↓ 참가자 페이지에 보일 공지입니다. 한 줄 = 공지 1건. (고정=Y 는 상단 고정)');
  hubSheetWithHeaders_(ss, HUB_SHEETS.session,
    ['회차명', '일자', '시작시각', '종료시각', '장소', '체크인코드', '지각기준(분)'],
    '↓ 교시/세션. 일자=YYYY-MM-DD, 시작시각=HH:mm. 체크인코드 입력 시 현장코드 필요(온라인은 비워둠).');
  hubSheetWithHeaders_(ss, HUB_SHEETS.entryLog, ['입장시각', '이름', '학번'], null);
  hubSheetWithHeaders_(ss, HUB_SHEETS.attendLog, ['체크인시각', '이름', '학번', '회차', '상태'], null);
  hubSheetWithHeaders_(ss, HUB_SHEETS.ackLog, ['확인시각', '이름', '학번', '공지'], null);

  buildStatusSheet_(ss);
  SpreadsheetApp.getUi().alert(
    '행사 페이지 탭이 준비되었습니다.\n\n' +
    '① 공지/회차 탭을 채우세요.\n' +
    '② 상단 메뉴 [🌐 행사 페이지 → 배포 방법]을 따라 웹앱으로 배포하면 참가자 링크·QR이 생성됩니다.'
  );
}

function hubSheetWithHeaders_(ss, name, headers, guide) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var headerRow = guide ? 2 : 1;
  if (guide) {
    sh.getRange(1, 1, 1, headers.length).merge().setValue(guide)
      .setFontColor('#64748b').setFontStyle('italic').setBackground('#f1f5f9');
  }
  sh.getRange(headerRow, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  sh.setFrozenRows(headerRow);
  return sh;
}

function buildStatusSheet_(ss) {
  var sh = ss.getSheetByName(HUB_SHEETS.status) || ss.insertSheet(HUB_SHEETS.status);
  sh.clear();
  var L = "'" + HUB_SHEETS.attendLog + "'";
  sh.getRange('A1').setValue('회차별 출결 집계').setFontWeight('bold').setFontSize(12);
  sh.getRange('A2').setFormula(
    "=IFERROR(QUERY(" + L + "!A3:E, \"select D, E, count(A) where A is not null group by D, E label count(A) '인원'\", 0), \"아직 출결 기록 없음\")");
  sh.getRange('E1').setValue('지각자 명단').setFontWeight('bold').setFontSize(12);
  sh.getRange('E2').setFormula(
    "=IFERROR(QUERY(" + L + "!A3:E, \"select B, C, D, A where E='지각'\", 0), \"지각자 없음\")");
  sh.setColumnWidths(1, 8, 130);
}

// ── 웹앱 진입점 ───────────────────────────────────────────────
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Hub')
    .setTitle('행사 안내')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── 참가자 링크 / QR / 배포 안내 ──────────────────────────────
function showHubLink() {
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) {}
  var ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('아직 웹앱이 배포되지 않았습니다.\n[🌐 행사 페이지 → 배포 방법]을 먼저 진행하세요.');
    return;
  }
  var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(url);
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:16px;text-align:center">' +
    '<div style="font-weight:800;margin-bottom:10px">참가자 링크 · QR</div>' +
    '<img src="' + qr + '" style="width:220px;height:220px;border:1px solid #eee;border-radius:10px"><br>' +
    '<div style="margin-top:12px;font-size:12px;word-break:break-all"><a href="' + url + '" target="_blank">' + url + '</a></div>' +
    '<div style="margin-top:10px;font-size:12px;color:#64748b">이 QR/링크를 오픈채팅·안내문에 넣으면 참가자가 입장합니다.</div></div>'
  ).setWidth(320).setHeight(360);
  ui.showModalDialog(html, '참가자 링크 · QR');
}

function showDeployHelp() {
  SpreadsheetApp.getUi().alert(
    '행사 페이지 웹앱 배포 (최초 1회)\n\n' +
    '1) 상단 메뉴 확장 프로그램 → Apps Script 열기\n' +
    '2) 오른쪽 위 [배포] → [새 배포]\n' +
    '3) 유형 선택(⚙️) → "웹 앱"\n' +
    '4) 실행 계정: 나 / 액세스 권한: "모든 사용자"\n' +
    '5) [배포] → 권한 허용\n' +
    '6) 생성된 웹 앱 URL 이 참가자 링크입니다.\n\n' +
    '그 후 시트 메뉴 [🌐 행사 페이지 → 참가자 링크·QR 보기]에서 QR을 확인하세요.\n' +
    '※ 공지/회차를 수정하면 바로 반영됩니다. 코드를 바꾼 경우에만 [배포 관리 → 편집 → 새 버전]으로 갱신하세요.'
  );
}

// ── 공통 유틸 ─────────────────────────────────────────────────
function normId_(v) { return String(v == null ? '' : v).replace(/\.0+$/, '').replace(/\s/g, ''); }
function normName_(v) { return String(v == null ? '' : v).replace(/\s/g, '').trim(); }
function hubNow_() { return new Date(); }
function hubTs_(d) { return Utilities.formatDate(d || new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'); }

function readTableRow1_(sh) {
  if (!sh || sh.getLastRow() < 1) return [];
  var headerRow = 1;
  // guide가 1행이면 헤더는 2행
  var firstA = String(sh.getRange(1, 1).getValue() || '');
  if (firstA.indexOf('↓') === 0) headerRow = 2;
  if (sh.getLastRow() <= headerRow) return [];
  var headers = sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var data = sh.getRange(headerRow + 1, 1, sh.getLastRow() - headerRow, sh.getLastColumn()).getValues();
  var rows = [];
  data.forEach(function (r) {
    if (r.every(function (c) { return c === '' || c === null; })) return;
    var o = {}; headers.forEach(function (h, i) { if (h) o[h] = r[i]; }); rows.push(o);
  });
  return rows;
}

/** 명단 대조: 이름+학번이 참석자명단에 있으면 true */
function validateStudent_(ss, name, sid) {
  var roster = readTable_(ss, '참석자명단');
  var n = normName_(name), s = normId_(sid);
  if (!n || !s) return false;
  for (var i = 0; i < roster.length; i++) {
    if (normName_(roster[i]['성명']) === n && normId_(roster[i]['학번']) === s) return true;
  }
  return false;
}

// ── 참가자 API (웹페이지에서 google.script.run 으로 호출) ──────

function hubEnter(name, sid) {
  var ss = getHubSS_();
  if (!validateStudent_(ss, name, sid)) {
    return { ok: false, msg: '등록된 명단에서 이름/학번을 찾을 수 없습니다. 담당자에게 문의하세요.' };
  }
  appendRow_(ss, HUB_SHEETS.entryLog, [hubTs_(), name, "'" + normId_(sid)]);
  return { ok: true };
}

function hubState(name, sid) {
  var ss = getHubSS_();
  if (!validateStudent_(ss, name, sid)) return { ok: false };
  var project = projectName_(ss);

  // 공지
  var notices = readTableRow1_(ss.getSheetByName(HUB_SHEETS.notice)).map(function (r) {
    return {
      title: String(r['제목'] || ''),
      content: String(r['내용'] || ''),
      link: String(r['링크'] || ''),
      pinned: /^y|참|고정|true/i.test(String(r['고정'] || ''))
    };
  }).filter(function (x) { return x.title || x.content; });
  notices.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

  // 오늘 회차 + 내 체크인 상태
  var myAttend = attendMapFor_(ss, name, sid);
  var todayStr = Utilities.formatDate(hubNow_(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  var sessions = readTableRow1_(ss.getSheetByName(HUB_SHEETS.session)).map(function (r) {
    var dateStr = toDateStr_(r['일자']);
    var start = sessionStart_(r['일자'], r['시작시각']);
    return {
      name: String(r['회차명'] || ''),
      dateStr: dateStr,
      startStr: toTimeStr_(r['시작시각']),
      place: String(r['장소'] || ''),
      needCode: String(r['체크인코드'] || '') !== '',
      isToday: dateStr === todayStr,
      startMs: start ? start.getTime() : 0,
      myStatus: myAttend[String(r['회차명'] || '')] || ''
    };
  }).filter(function (x) { return x.name; });

  return { ok: true, project: project, notices: notices, sessions: sessions, now: hubTs_() };
}

function hubAck(name, sid, title) {
  var ss = getHubSS_();
  if (!validateStudent_(ss, name, sid)) return { ok: false };
  if (hasLog_(ss, HUB_SHEETS.ackLog, name, sid, title, 4)) return { ok: true, dup: true };
  appendRow_(ss, HUB_SHEETS.ackLog, [hubTs_(), name, "'" + normId_(sid), title]);
  return { ok: true };
}

function hubCheckin(name, sid, sessionName, code) {
  var ss = getHubSS_();
  if (!validateStudent_(ss, name, sid)) return { ok: false, msg: '인증 실패' };

  var srow = findSession_(ss, sessionName);
  if (!srow) return { ok: false, msg: '회차를 찾을 수 없습니다.' };

  var need = String(srow['체크인코드'] || '');
  if (need !== '' && normName_(code) !== normName_(need)) {
    return { ok: false, msg: '현장 체크인 코드가 올바르지 않습니다.' };
  }
  if (hasLog_(ss, HUB_SHEETS.attendLog, name, sid, sessionName, 4)) {
    return { ok: true, dup: true, status: existingStatus_(ss, name, sid, sessionName) };
  }

  var start = sessionStart_(srow['일자'], srow['시작시각']);
  var grace = Number(srow['지각기준(분)']) || LATE_GRACE_DEFAULT;
  var status = '출석';
  if (start && hubNow_().getTime() > start.getTime() + grace * 60000) status = '지각';

  appendRow_(ss, HUB_SHEETS.attendLog, [hubTs_(), name, "'" + normId_(sid), sessionName, status]);
  return { ok: true, status: status };
}

// ── 로그 헬퍼 ─────────────────────────────────────────────────
function appendRow_(ss, sheetName, row) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = hubSheetWithHeaders_(ss, sheetName, row.map(function () { return ''; }), null);
  sh.appendRow(row);
}
function hasLog_(ss, sheetName, name, sid, key, keyCol) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return false;
  var vals = sh.getDataRange().getValues();
  var n = normName_(name), s = normId_(sid), k = normName_(key);
  for (var i = 1; i < vals.length; i++) {
    if (normName_(vals[i][1]) === n && normId_(vals[i][2]) === s && normName_(vals[i][keyCol - 1]) === k) return true;
  }
  return false;
}
function existingStatus_(ss, name, sid, sessionName) {
  var sh = ss.getSheetByName(HUB_SHEETS.attendLog);
  if (!sh) return '';
  var vals = sh.getDataRange().getValues();
  var n = normName_(name), s = normId_(sid), k = normName_(sessionName);
  for (var i = 1; i < vals.length; i++) {
    if (normName_(vals[i][1]) === n && normId_(vals[i][2]) === s && normName_(vals[i][3]) === k) return String(vals[i][4] || '');
  }
  return '';
}
function attendMapFor_(ss, name, sid) {
  var out = {};
  var sh = ss.getSheetByName(HUB_SHEETS.attendLog);
  if (!sh || sh.getLastRow() < 2) return out;
  var vals = sh.getDataRange().getValues();
  var n = normName_(name), s = normId_(sid);
  for (var i = 1; i < vals.length; i++) {
    if (normName_(vals[i][1]) === n && normId_(vals[i][2]) === s) out[String(vals[i][3])] = String(vals[i][4] || '');
  }
  return out;
}
function findSession_(ss, sessionName) {
  var rows = readTableRow1_(ss.getSheetByName(HUB_SHEETS.session));
  for (var i = 0; i < rows.length; i++) if (String(rows[i]['회차명']) === sessionName) return rows[i];
  return null;
}

// ── 날짜/시각 파싱 ────────────────────────────────────────────
function toDateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  var m = String(v || '').match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (!m) return '';
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}
function toTimeStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Seoul', 'HH:mm');
  var m = String(v || '').match(/(\d{1,2}):(\d{2})/);
  return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : '';
}
function sessionStart_(dateVal, timeVal) {
  var ds = toDateStr_(dateVal), ts = toTimeStr_(timeVal);
  if (!ds) return null;
  var dm = ds.split('-'), tm = (ts || '00:00').split(':');
  return new Date(Number(dm[0]), Number(dm[1]) - 1, Number(dm[2]), Number(tm[0]), Number(tm[1]));
}
