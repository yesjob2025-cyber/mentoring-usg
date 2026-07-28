/**
 * 행사 전용 모바일 허브 페이지 (오픈채팅 대체) — v4
 * =============================================================
 * - 학생: "이름 + 학번"으로 입장 (참석자명단 대조) → 배정 분반 자동 인식
 * - 강사: "강사코드"로 입장 (강사 탭 대조) → 담당 분반 인식 + 인원/출결 현황
 * - 공지/회차에 "대상(전체·학생·강사)"과 "분반"을 붙여 → 각자 자기 것만 보임
 * - 회차별 출결 QR: 스캔하면 그 회차로 자동 체크인 (코드 내장 → 원격 부정 방지)
 * 모든 기록은 이 사업 시트의 로그 탭에 자동 저장된다.
 *
 * 웹앱으로 배포해야 링크가 생성된다. (배포 → 웹 앱 / 실행: 나 / 액세스: 모든 사용자)
 */

var HUB_SHEETS = {
  notice: '공지',
  session: '회차',
  teacher: '강사',
  entryLog: '입장로그',
  attendLog: '출결로그',
  ackLog: '확인로그',
  status: '출결현황'
};
var LATE_GRACE_DEFAULT = 10;

// ── 스프레드시트 핸들 ─────────────────────────────────────────
function getHubSS_() {
  var id = PropertiesService.getScriptProperties().getProperty('HUB_SS_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ── 허브 탭 생성 / 초기화 ─────────────────────────────────────
function setupHub() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) { throw new Error('구글 시트 안에서 실행해 주세요.'); }
  PropertiesService.getScriptProperties().setProperty('HUB_SS_ID', ss.getId());

  hubSheetWithHeaders_(ss, HUB_SHEETS.notice,
    ['제목', '내용', '링크', '대상', '분반', '고정', '게시일시'],
    '↓ 참가자 페이지 공지. 대상=전체/학생/강사(비우면 전체). 분반=특정 분반명(비우면 전체 분반). 고정=Y 상단고정.');
  hubSheetWithHeaders_(ss, HUB_SHEETS.session,
    ['회차명', '일자', '시작시각', '종료시각', '장소', '분반', '체크인코드', '지각기준(분)'],
    '↓ 교시/세션. 일자=YYYY-MM-DD, 시작시각=HH:mm. 분반 비우면 전체 대상. 체크인코드 입력 시 QR/현장코드 필요.');
  hubSheetWithHeaders_(ss, HUB_SHEETS.teacher,
    ['강사명', '연락처', '강사코드', '담당분반', '비고'],
    '↓ 강사 명단. 강사코드로 입장합니다(각 강사에게만 공유). 담당분반은 쉼표로 여러 개 가능(예: A반, B반).');
  hubSheetWithHeaders_(ss, HUB_SHEETS.entryLog, ['입장시각', '이름', '식별자', '역할'], null);
  hubSheetWithHeaders_(ss, HUB_SHEETS.attendLog, ['체크인시각', '이름', '식별자', '회차', '상태'], null);
  hubSheetWithHeaders_(ss, HUB_SHEETS.ackLog, ['확인시각', '이름', '식별자', '공지'], null);
  ensureRosterClass_(ss);

  buildStatusSheet_(ss);
  SpreadsheetApp.getUi().alert(
    '행사 페이지 탭이 준비되었습니다.\n\n' +
    '① 참석자명단에 "분반" 열이 추가되었습니다. 학생별 분반을 채우세요.\n' +
    '② 강사 탭에 강사명·강사코드·담당분반을 입력하세요.\n' +
    '③ 공지/회차에 대상·분반을 지정할 수 있습니다.\n\n' +
    '그다음 [② 배포 방법] → [③ 웹앱 주소 등록] → [④ 참가자 링크·QR] 순으로 진행하세요.'
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

/** 참석자명단에 '분반' 열이 없으면 추가 */
function ensureRosterClass_(ss) {
  var sh = ss.getSheetByName('참석자명단');
  if (!sh) return;
  var firstA = String(sh.getRange(1, 1).getValue() || '');
  var headerRow = (firstA.indexOf('↓') === 0) ? 2 : 1;
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  if (headers.indexOf('분반') !== -1) return;
  sh.getRange(headerRow, lastCol + 1).setValue('분반')
    .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
}

function buildStatusSheet_(ss) {
  var sh = ss.getSheetByName(HUB_SHEETS.status) || ss.insertSheet(HUB_SHEETS.status);
  sh.clear();
  var L = "'" + HUB_SHEETS.attendLog + "'";
  sh.getRange('A1').setValue('회차별 출결 집계').setFontWeight('bold').setFontSize(12);
  sh.getRange('A2').setFormula(
    "=IFERROR(QUERY(" + L + "!A2:E, \"select D, E, count(A) where A is not null group by D, E label count(A) '인원'\", 1), \"아직 출결 기록 없음\")");
  sh.getRange('E1').setValue('지각자 명단').setFontWeight('bold').setFontSize(12);
  sh.getRange('E2').setFormula(
    "=IFERROR(QUERY(" + L + "!A2:E, \"select B, C, D, A where E='지각'\", 1), \"지각자 없음\")");
  sh.setColumnWidths(1, 8, 130);
}

// ── 웹앱 진입점 (출결 QR 파라미터 주입) ───────────────────────
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Hub');
  t.autoS = encodeURIComponent((e && e.parameter && e.parameter.s) ? e.parameter.s : '');
  t.autoC = encodeURIComponent((e && e.parameter && e.parameter.c) ? e.parameter.c : '');
  return t.evaluate()
    .setTitle('행사 안내')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── 참가자 링크 / QR / 주소등록 / 배포안내 / 회차 QR ──────────
function hubUrl_() {
  var stored = PropertiesService.getScriptProperties().getProperty('HUB_URL');
  if (stored) return stored;
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

function registerHubUrl() {
  var ui = SpreadsheetApp.getUi();
  var cur = PropertiesService.getScriptProperties().getProperty('HUB_URL') || '(미등록)';
  var res = ui.prompt('웹앱 주소 등록',
    '[배포 → 배포 관리]에서 "복사"한 웹앱 주소를 붙여넣으세요.\n(script.google.com/macros/s/…/exec 형태)\n\n현재 등록: ' + cur,
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return '';
  var url = res.getResponseText().trim();
  if (url.indexOf('/macros/s/') === -1 || url.indexOf('/exec') === -1) {
    ui.alert('올바른 웹앱 주소가 아닙니다.\nscript.google.com/macros/s/…/exec 형태여야 합니다.');
    return '';
  }
  PropertiesService.getScriptProperties().setProperty('HUB_URL', url);
  ui.alert('웹앱 주소가 등록되었습니다.');
  return url;
}

function showHubLink() {
  var url = hubUrl_();
  if (!url) { url = registerHubUrl(); if (!url) return; }
  var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(url);
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:16px;text-align:center">' +
    '<div style="font-weight:800;margin-bottom:10px">참가자 링크 · QR</div>' +
    '<img src="' + qr + '" style="width:220px;height:220px;border:1px solid #eee;border-radius:10px"><br>' +
    '<div style="margin-top:12px;font-size:12px;word-break:break-all"><a href="' + url + '" target="_blank">' + url + '</a></div>' +
    '<div style="margin-top:10px;font-size:12px;color:#64748b">이 QR/링크를 오픈채팅·안내문에 넣으면 참가자가 입장합니다.</div></div>'
  ).setWidth(320).setHeight(370);
  SpreadsheetApp.getUi().showModalDialog(html, '참가자 링크 · QR');
}

/** 회차별 출결 QR (현장 게시용) — 스캔하면 해당 회차로 자동 체크인 */
function showAttendQR() {
  var ss = getHubSS_();
  var url = hubUrl_();
  if (!url) { SpreadsheetApp.getUi().alert('먼저 [③ 웹앱 주소 등록]을 완료하세요.'); return; }
  var sessions = readTableRow1_(ss.getSheetByName(HUB_SHEETS.session));
  if (!sessions.length) { SpreadsheetApp.getUi().alert("'회차' 탭에 회차를 먼저 입력하세요."); return; }
  var cards = sessions.map(function (s) {
    var name = String(s['회차명'] || '');
    var link = url + '?s=' + encodeURIComponent(name) + '&c=' + encodeURIComponent(String(s['체크인코드'] || ''));
    var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(link);
    return '<div style="display:inline-block;width:230px;margin:8px;text-align:center;vertical-align:top">' +
      '<div style="font-weight:700;margin-bottom:6px">' + name + '</div>' +
      '<img src="' + qr + '" style="width:200px;height:200px;border:1px solid #eee;border-radius:10px">' +
      '<div style="font-size:11px;color:#94a3b8;margin-top:4px">' + String(s['일자'] || '') + ' ' + String(s['시작시각'] || '') + '</div></div>';
  }).join('');
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:12px;text-align:center">' +
    '<div style="font-weight:800;margin-bottom:6px">회차별 출결 QR</div>' +
    '<div style="font-size:12px;color:#64748b;margin-bottom:10px">각 회차 시작 때 해당 QR을 현장 화면/입구에 띄우세요. 스캔하면 그 회차로 자동 출석됩니다.</div>' +
    cards + '</div>'
  ).setWidth(540).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, '회차별 출결 QR');
}

function showDeployHelp() {
  SpreadsheetApp.getUi().alert(
    '행사 페이지 웹앱 배포 (최초 1회)\n\n' +
    '1) 확장 프로그램 → Apps Script → 오른쪽 위 [배포] → [새 배포]\n' +
    '2) 톱니바퀴(⚙️) → "웹 앱"\n' +
    '3) 실행 계정: 나 / 액세스 권한: "모든 사용자" (로그인 불필요 — 꼭 이걸로!)\n' +
    '4) [배포] → 권한 허용\n' +
    '5) [배포 관리]에서 URL "복사" → 시트 메뉴 [③ 웹앱 주소 등록]에 붙여넣기\n' +
    '6) [④ 참가자 링크·QR 보기]에서 QR 확인\n\n' +
    '※ 공지/회차 수정은 즉시 반영. 코드 변경 시에만 [배포 관리 → 편집 → 배포](주소 유지).'
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

function splitClasses_(v) {
  return String(v == null ? '' : v).split(/[,;/·\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}

// ── 신원 확인 ─────────────────────────────────────────────────
function studentInfo_(ss, name, sid) {
  var roster = readTable_(ss, '참석자명단');
  var n = normName_(name), s = normId_(sid);
  if (!n || !s) return { ok: false };
  for (var i = 0; i < roster.length; i++) {
    if (normName_(roster[i]['성명']) === n && normId_(roster[i]['학번']) === s) {
      return { ok: true, name: String(roster[i]['성명']), cls: String(roster[i]['분반'] || '') };
    }
  }
  return { ok: false };
}

function teacherInfo_(ss, code) {
  var rows = readTableRow1_(ss.getSheetByName(HUB_SHEETS.teacher));
  var c = normName_(code);
  if (!c) return { ok: false };
  for (var i = 0; i < rows.length; i++) {
    if (normName_(rows[i]['강사코드']) === c) {
      return { ok: true, name: String(rows[i]['강사명'] || '강사'), classes: splitClasses_(rows[i]['담당분반']) };
    }
  }
  return { ok: false };
}

/** me = {role:'student'|'teacher', name, id} → 정규화된 신원 */
function resolveMe_(ss, me) {
  if (!me) return { ok: false };
  if (me.role === 'teacher') {
    var t = teacherInfo_(ss, me.id);
    if (!t.ok) return { ok: false };
    return { ok: true, role: 'teacher', name: t.name, id: me.id, classes: t.classes };
  }
  var s = studentInfo_(ss, me.name, me.id);
  if (!s.ok) return { ok: false };
  return { ok: true, role: 'student', name: s.name, id: me.id, classes: s.cls ? [s.cls] : [] };
}

function classVisible_(cls, meClasses) {
  var c = normName_(cls);
  if (c === '') return true; // 분반 미지정 = 전체
  return meClasses.map(normName_).indexOf(c) !== -1;
}
function targetVisible_(target, role) {
  var t = normName_(target);
  if (t === '학생') return role === 'student';
  if (t === '강사') return role === 'teacher';
  return true; // 전체/빈값
}

// ── 참가자 API ────────────────────────────────────────────────
function hubEnter(me) {
  var ss = getHubSS_();
  var r = resolveMe_(ss, me);
  if (!r.ok) {
    var msg = (me && me.role === 'teacher')
      ? '강사코드를 찾을 수 없습니다. 담당자에게 문의하세요.'
      : '등록된 명단에서 이름/학번을 찾을 수 없습니다. 담당자에게 문의하세요.';
    return { ok: false, msg: msg };
  }
  appendRow_(ss, HUB_SHEETS.entryLog, [hubTs_(), r.name, "'" + normId_(me.id), r.role === 'teacher' ? '강사' : '학생']);
  return { ok: true, name: r.name, role: r.role };
}

function hubState(me) {
  var ss = getHubSS_();
  var r = resolveMe_(ss, me);
  if (!r.ok) return { ok: false };
  var project = projectName_(ss);

  var notices = readTableRow1_(ss.getSheetByName(HUB_SHEETS.notice)).filter(function (n) {
    return targetVisible_(n['대상'], r.role) && classVisible_(n['분반'], r.classes);
  }).map(function (n) {
    return {
      title: String(n['제목'] || ''), content: String(n['내용'] || ''),
      link: String(n['링크'] || ''), pinned: /^y|참|고정|true/i.test(String(n['고정'] || ''))
    };
  }).filter(function (x) { return x.title || x.content; });
  notices.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

  var myAttend = attendMapFor_(ss, r.name, me.id);
  var todayStr = Utilities.formatDate(hubNow_(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  var sessions = readTableRow1_(ss.getSheetByName(HUB_SHEETS.session)).filter(function (s) {
    return classVisible_(s['분반'], r.classes);
  }).map(function (s) {
    var dateStr = toDateStr_(s['일자']);
    return {
      name: String(s['회차명'] || ''), dateStr: dateStr, startStr: toTimeStr_(s['시작시각']),
      place: String(s['장소'] || ''), cls: String(s['분반'] || ''),
      needCode: String(s['체크인코드'] || '') !== '', isToday: dateStr === todayStr,
      myStatus: myAttend[String(s['회차명'] || '')] || ''
    };
  }).filter(function (x) { return x.name; });

  var teacher = null;
  if (r.role === 'teacher') teacher = teacherDashboard_(ss, r.classes, todayStr);

  return { ok: true, role: r.role, name: r.name, classes: r.classes, project: project, notices: notices, sessions: sessions, teacher: teacher };
}

/** 강사용: 담당 분반별 인원/오늘 출석 현황 */
function teacherDashboard_(ss, classes, todayStr) {
  var roster = readTable_(ss, '참석자명단');
  var sessions = readTableRow1_(ss.getSheetByName(HUB_SHEETS.session));
  var sessCls = {}; sessions.forEach(function (s) { sessCls[String(s['회차명'])] = String(s['분반'] || ''); });

  var attend = ss.getSheetByName(HUB_SHEETS.attendLog);
  var presentByClass = {};
  if (attend && attend.getLastRow() > 1) {
    var vals = attend.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var ts = String(vals[i][0] || ''); if (ts.indexOf(todayStr) !== 0) continue;
      var cls = sessCls[String(vals[i][3])] || '';
      var key = normName_(vals[i][1]) + '|' + normId_(vals[i][2]);
      presentByClass[cls] = presentByClass[cls] || {}; presentByClass[cls][key] = 1;
    }
  }
  return classes.map(function (c) {
    var total = roster.filter(function (x) { return normName_(x['분반']) === normName_(c); }).length;
    var present = presentByClass[c] ? Object.keys(presentByClass[c]).length : 0;
    return { cls: c, total: total, present: present };
  });
}

function hubAck(me, title) {
  var ss = getHubSS_();
  var r = resolveMe_(ss, me);
  if (!r.ok) return { ok: false };
  if (hasLog_(ss, HUB_SHEETS.ackLog, r.name, me.id, title, 4)) return { ok: true, dup: true };
  appendRow_(ss, HUB_SHEETS.ackLog, [hubTs_(), r.name, "'" + normId_(me.id), title]);
  return { ok: true };
}

function hubCheckin(me, sessionName, code) {
  var ss = getHubSS_();
  var r = resolveMe_(ss, me);
  if (!r.ok) return { ok: false, msg: '인증 실패' };
  var srow = findSession_(ss, sessionName);
  if (!srow) return { ok: false, msg: '회차를 찾을 수 없습니다.' };
  var need = String(srow['체크인코드'] || '');
  if (need !== '' && normName_(code) !== normName_(need)) return { ok: false, msg: '현장 체크인 코드가 올바르지 않습니다.' };
  if (hasLog_(ss, HUB_SHEETS.attendLog, r.name, me.id, sessionName, 4)) {
    return { ok: true, dup: true, status: existingStatus_(ss, r.name, me.id, sessionName) };
  }
  var start = sessionStart_(srow['일자'], srow['시작시각']);
  var grace = Number(srow['지각기준(분)']) || LATE_GRACE_DEFAULT;
  var status = '출석';
  if (start && hubNow_().getTime() > start.getTime() + grace * 60000) status = '지각';
  appendRow_(ss, HUB_SHEETS.attendLog, [hubTs_(), r.name, "'" + normId_(me.id), sessionName, status]);
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
