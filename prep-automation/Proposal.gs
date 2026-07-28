/**
 * 제안 단계 — Drive 폴더 자동생성 + 총괄 기록
 * =============================================================
 * [🗂 새 제안 등록]에서 사업 정보를 입력하면:
 *  - Drive에 "[고유번호] 사업명" 폴더 + 하위폴더(제안서/견적서/산출물/정산) 자동 생성
 *  - 총괄 구글시트의 "제안관리(자동)" 탭에 한 줄 기록 (폴더 링크 포함)
 * 사업이 확정되면 [＋ 새 사업 준비 시트 만들기]로 이어가면 된다.
 */

var PROPOSAL_TAB = '제안관리(자동)';
var PROPOSAL_HEADERS = ['등록일', '고유번호', '유형', '구분', '사업명', '기관', '부서', '담당자', '연락처',
  '사업예산', '사업일자', '제출일자', '사업내용', '폴더링크', '상태'];
var PROPOSAL_STATUS = ['준비', '제출', '확정'];
var PROPOSAL_SUBFOLDERS = ['1_제안서', '2_견적서', '3_산출물', '4_정산'];

// ── 상위(루트) 폴더 ───────────────────────────────────────────
function proposalRoot_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PROPOSAL_ROOT_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var folder = DriveApp.createFolder('YESJOB 사업');
  props.setProperty('PROPOSAL_ROOT_ID', folder.getId());
  return folder;
}

function setProposalRoot() {
  var ui = SpreadsheetApp.getUi();
  var cur = PropertiesService.getScriptProperties().getProperty('PROPOSAL_ROOT_ID') || '(자동 생성됨)';
  var res = ui.prompt('제안 폴더 위치 지정',
    '사업 폴더들을 담을 상위 Drive 폴더의 URL 또는 ID를 붙여넣으세요.\n(비우면 "YESJOB 사업" 폴더를 자동 생성해 사용)\n\n현재: ' + cur,
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var raw = res.getResponseText().trim();
  if (!raw) { PropertiesService.getScriptProperties().deleteProperty('PROPOSAL_ROOT_ID'); ui.alert('자동 생성 폴더를 사용합니다.'); return; }
  var m = raw.match(/folders\/([a-zA-Z0-9_-]+)/);
  var id = m ? m[1] : raw.replace(/[^a-zA-Z0-9_-]/g, '');
  try { DriveApp.getFolderById(id); } catch (e) { ui.alert('폴더를 찾을 수 없습니다.'); return; }
  PropertiesService.getScriptProperties().setProperty('PROPOSAL_ROOT_ID', id);
  ui.alert('제안 폴더 위치가 설정되었습니다.');
}

// ── 다이얼로그 ────────────────────────────────────────────────
function openProposalDialog() {
  var html = HtmlService.createHtmlOutputFromFile('ProposalDialog').setWidth(460).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, '새 제안 등록');
}

// ── 제안 생성 ─────────────────────────────────────────────────
function createProposal(form) {
  if (!form || !form.name) throw new Error('사업명은 필수입니다.');
  var tz = Session.getScriptTimeZone() || 'Asia/Seoul';
  var typeLetter = form.type === '교육' ? 'A' : form.type === '온라인' ? 'B' : 'C';

  var code = String(form.code || '').trim();
  if (!code) {
    var digits = String(form.eventDate || '').replace(/[^0-9]/g, '');
    var yymmdd = digits.length >= 8 ? digits.substr(2, 6) : Utilities.formatDate(new Date(), tz, 'yyMMdd');
    code = typeLetter + yymmdd + '_01';
  }

  var root = proposalRoot_();
  var folder = root.createFolder('[' + code + '] ' + form.name.trim());
  PROPOSAL_SUBFOLDERS.forEach(function (s) { folder.createFolder(s); });

  var logged = logProposal_(form, code, folder.getUrl(), tz);
  return { ok: true, code: code, name: form.name.trim(), folderUrl: folder.getUrl(), logged: logged };
}

/** 새 사업 폼: 고유번호로 제안관리 내용을 찾아 반환 (자동 채우기용) */
function lookupProposal(code) {
  code = String(code || '').trim();
  if (!code) return { found: false };
  var ss = rollupTargetSS_();
  if (!ss) return { found: false, msg: '총괄이 연결되지 않았습니다.' };
  var sh = ss.getSheetByName(PROPOSAL_TAB);
  if (!sh || sh.getLastRow() < 2) return { found: false };
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  var ci = headers.indexOf('고유번호');
  var typeMap = { '온라인': 'online', '교육': 'offline', '행사': 'expo' };
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ci]).trim() === code) {
      var row = data[i];
      function g(name) { var j = headers.indexOf(name); return j >= 0 ? row[j] : ''; }
      return {
        found: true,
        name: String(g('사업명') || ''), type: (typeMap[String(g('유형'))] || ''),
        org: String(g('기관') || ''), dept: String(g('부서') || ''),
        manager: String(g('담당자') || ''), budget: String(g('사업예산') || ''),
        startDate: normDateInput_(g('사업일자'))
      };
    }
  }
  return { found: false };
}

function normDateInput_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
  var m = String(v || '').match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  return m ? (m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)) : '';
}

function logProposal_(form, code, folderUrl, tz) {
  var ss = rollupTargetSS_();
  if (!ss) return false;
  var sh = ss.getSheetByName(PROPOSAL_TAB);
  if (!sh) {
    sh = ss.insertSheet(PROPOSAL_TAB);
    sh.getRange(1, 1, 1, PROPOSAL_HEADERS.length).setValues([PROPOSAL_HEADERS])
      .setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), code, form.type || '', form.category || '',
    form.name || '', form.org || '', form.dept || '', form.manager || '', form.contact || '',
    form.budget || '', form.eventDate || '', form.dueDate || '', form.detail || '', folderUrl, '준비'
  ]);
  applyStatusValidation_(sh);
  return true;
}

/** 제안관리 "상태" 열에 드롭다운(준비/제출/확정) 적용 */
function applyStatusValidation_(sh) {
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var col = headers.indexOf('상태') + 1;
  if (col === 0) return;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(PROPOSAL_STATUS, true).build();
  sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}
