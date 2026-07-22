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
