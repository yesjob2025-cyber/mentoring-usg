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

// ── 4-b) 명찰용 CSV (미리캔버스/캔바 대량제작 업로드용) ────────

function genNameTagCSV() {
  var ss = activeSS_();
  var roster = readTable_(ss, '참석자명단');
  if (!roster.length) { SpreadsheetApp.getUi().alert("'참석자명단' 탭에 참석자를 먼저 입력해 주세요."); return; }
  var name = projectName_(ss);

  // 명찰에 필요한 열만 (개인정보인 주민번호·연락처·계좌는 제외)
  var cols = ['성명', '학교', '학과', '학번', '학년', '조'];
  var lines = [cols.join(',')];
  roster.forEach(function (r) {
    lines.push(cols.map(function (c) { return csvCell_(r[c]); }).join(','));
  });
  var csv = '﻿' + lines.join('\r\n'); // BOM: 한글 엑셀 호환

  var fileName = '[명찰CSV] ' + name + '.csv';
  var folder = folderOf_(ss);
  var file = folder.createFile(fileName, csv, 'text/csv');

  markChecklist_(ss, '명찰', file.getUrl(), roster.length + '명 CSV 생성');
  toast_('명찰용 CSV ' + roster.length + '행 생성 완료 (다운로드 후 미리캔버스/캔바 대량제작에 업로드)');
  safeOpenUrl_(file.getUrl(), '명찰용 CSV');
}

function csvCell_(v) {
  var s = (v == null) ? '' : String(v);
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function folderOf_(ss) {
  try {
    var parents = DriveApp.getFileById(ss.getId()).getParents();
    if (parents.hasNext()) return parents.next();
  } catch (e) {}
  return DriveApp.getRootFolder();
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
