import type { ScoreResult, StrengthState } from "./types";
import { WORK_TYPE_MAP } from "./catalog";
import { WEAPON_MAP } from "./weapons";
import { crossComment, externalProfiles, externalTypeScores } from "./external";
import { effectiveWeapons, primaryType, secondaryType } from "./scoring";
import { josa, withJosa } from "./josa";

/** "○○사 / △△직무"가 비어 있을 때 쓸 표현 */
function targetLabel(state: StrengthState) {
  const c = state.target.company.trim();
  const j = state.target.job.trim();
  if (c && j) return `${c} ${j}`;
  if (j) return j;
  if (c) return c;
  return "지원 직무";
}

export interface StrategyReport {
  headline: string;
  positioning: string;
  resumeLines: string[];
  coverLetter: { title: string; guide: string; draft: string }[];
  interview: { question: string; hint: string }[];
  keywords: string[];
  cautions: string[];
  crossCheck: string;
  markdown: string;
}

export function buildReport(state: StrengthState, score: ScoreResult): StrategyReport {
  const pType = WORK_TYPE_MAP[primaryType(state, score)];
  const sType = WORK_TYPE_MAP[secondaryType(state, score)];
  const weapons = effectiveWeapons(state, score).map((id) => WEAPON_MAP[id]).filter(Boolean);
  const target = targetLabel(state);
  const exts = externalProfiles(state.external);
  const extScores = externalTypeScores(state.external);
  const extTop = extScores
    ? (Object.entries(extScores).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof WORK_TYPE_MAP)
    : null;

  const headline = `${pType.tagline} — ${weapons.map((w) => w.name).join(" · ")}`;

  const positioning =
    `저는 ${pType.name}(${pType.tagline})으로 일합니다. ` +
    `특히 ${weapons.map((w) => `'${w.name}'`).join(", ")} 방식으로 성과를 만들어 왔고, ` +
    `필요할 때는 ${sType.name}의 방식(${sType.tagline})으로 보완합니다. ` +
    `${target}에서도 같은 방식으로 기여하겠습니다.`;

  // 이력서 — 경험이 있으면 경험 기반, 없으면 무기 템플릿
  const resumeLines = weapons.map((w) => {
    const exp = state.experiences.find((e) => e.weaponId === w.id && (e.result || e.metric));
    if (exp) {
      const metric = exp.metric?.trim();
      return `${exp.title || w.name} — ${exp.action?.trim() || w.resumeLine}${metric ? ` (${metric})` : ""}`;
    }
    return `${w.name} — ${w.resumeLine}`;
  });

  const expByWeapon = (weaponId: string) =>
    state.experiences.filter((e) => e.weaponId === weaponId);

  /** 사용자가 쓴 문장을 그대로 살리되, 문장 끝 마침표만 맞춰 이어 붙인다 */
  const sentence = (text: string) => {
    const t = text.trim();
    if (!t) return "";
    return /[.!?…]$/.test(t) ? t : `${t}.`;
  };

  const starText = (weaponId: string) => {
    const list = expByWeapon(weaponId);
    if (list.length === 0) return "";
    const e = list[0];
    const parts = [
      e.situation && sentence(e.situation),
      e.task && sentence(e.task),
      e.action && sentence(e.action),
      e.result && (/^그 결과/.test(e.result.trim()) ? sentence(e.result) : `그 결과 ${sentence(e.result)}`),
      e.metric && `(${e.metric.trim()})`,
    ].filter(Boolean);
    return parts.join(" ");
  };

  const first = weapons[0];
  const second = weapons[1] ?? weapons[0];
  const third = weapons[2] ?? weapons[0];

  /** "…하는 능력." 처럼 명사로 끝나는 정의문을 자기소개서 어투로 맞춘다 */
  const asSentence = (text: string) =>
    text.trim().replace(/\.$/, "").replace(/(력|힘|것|사람|방식)$/, "$1입니다") + ".";

  const coverLetter = [
    {
      title: "직무 역량 / 강점",
      guide:
        "① 강점을 '일하는 방식'으로 정의 → ② 그 방식이 드러난 사례 1개(STAR) → ③ 결과 수치 → ④ 지원 직무에서의 재현.",
      draft:
        `제가 일하는 방식은 '${first?.name ?? pType.name}'입니다. ${asSentence(first?.definition ?? pType.value)} ` +
        `${starText(first?.id ?? "") || `[${first?.name ?? pType.name} 사례를 여기에 적습니다 — ${first?.evidencePrompts[0] ?? ""}]`} ` +
        `${target}에서도 같은 방식으로 성과를 만들겠습니다.`,
    },
    {
      title: "성장 과정 / 나를 만든 경험",
      guide:
        "성격이 아니라 '일하는 습관이 만들어진 계기'를 씁니다. 그 습관이 지금도 유지된다는 증거를 붙이면 좋습니다.",
      draft:
        `${starText(second?.id ?? "") || `[${second?.name ?? ""} 관련 경험 — ${second?.evidencePrompts[1] ?? ""}]`} ` +
        `이 경험 이후 저는 '${second?.name ?? ""}' 방식을 습관으로 만들었고, 이후 '${third?.name ?? ""}'이 필요한 상황에서도 같은 방식으로 대응했습니다.`,
    },
    {
      title: "지원 동기",
      guide:
        "회사 칭찬이 아니라 '내 강점이 이 회사의 어떤 일에 쓰이는지'를 씁니다. 직무기술서(JD)의 표현을 그대로 가져오면 적중률이 올라갑니다.",
      draft:
        `${target}의 업무는 ${pType.fitJobs.slice(0, 3).join("·")} 영역에서 ${withJosa(pType.keywords.slice(0, 3).join("·"), "을/를")} 요구한다고 이해했습니다. ` +
        `저는 ${withJosa(weapons.map((w) => w.name).join("·"), "으로/로")} 이 요구에 답할 수 있습니다. ` +
        `[회사·직무의 구체적인 과제나 최근 이슈를 한 줄 넣으세요.]`,
    },
    {
      title: "입사 후 포부",
      guide: "1년 차에 할 수 있는 일 → 3년 차 목표 순으로, 강점이 이어지도록 씁니다.",
      draft:
        `입사 후 1년은 '${first?.name ?? ""}'${josa(first?.name ?? "", "을/를")} 활용해 담당 업무의 성과를 숫자로 관리하는 실무자가 되겠습니다. ` +
        `[관리할 지표 예: ${(first?.metricHints ?? []).slice(0, 2).join(", ")}] ` +
        `3년 차에는 ${sType.name}의 방식(${sType.tagline})까지 더해, 맡은 영역에서 ${withJosa(sType.keywords[0], "을/를")} 책임지는 담당자가 되겠습니다.`,
    },
  ];

  const interview = weapons.flatMap((w) =>
    w.interviewQuestions.map((q) => ({
      question: q,
      hint: `${w.name} 사례로 답하고, 반드시 ${w.metricHints[0]} 같은 수치를 붙이세요.`,
    })),
  );

  const keywords = Array.from(
    new Set([...pType.keywords, ...sType.keywords, ...weapons.flatMap((w) => w.actionVerbs)]),
  );

  const cautions = [pType.overuse, ...weapons.map((w) => `'${w.name}'만 강조하지 말고, ${w.metricHints.join(" / ")} 중 하나로 결과를 숫자화하세요.`)];

  const crossCheck = crossComment(extTop ?? null, primaryType(state, score));

  const markdown = [
    `# 나의 일 강점 · 입사서류 전략`,
    ``,
    `- 대표 유형: **${pType.emoji} ${pType.name}** — ${pType.tagline}`,
    `- 보조 유형: ${sType.name} — ${sType.tagline}`,
    `- 대표 무기: ${weapons.map((w) => `**${w.name}**`).join(" · ")}`,
    state.target.company || state.target.job ? `- 지원 목표: ${target}` : ``,
    exts.length ? `- 참고 검사: ${exts.map((e) => `${e.code}(${e.label})`).join(", ")}` : ``,
    ``,
    `## 0. 한 줄 정의`,
    `> ${headline}`,
    ``,
    positioning,
    ``,
    `## 1. 교차 확인`,
    crossCheck,
    ``,
    `## 2. 이력서 요약 문장`,
    ...resumeLines.map((l) => `- ${l}`),
    ``,
    `## 3. 자기소개서 문항별 초안`,
    ...coverLetter.flatMap((c) => [`### ${c.title}`, `*작성 가이드: ${c.guide}*`, ``, c.draft, ``]),
    `## 4. 내 경험 정리(STAR)`,
    ...(state.experiences.length
      ? state.experiences.flatMap((e) => {
          const w = WEAPON_MAP[e.weaponId];
          return [
            `### ${e.title || "제목 없음"} — ${w ? w.name : ""}`,
            `- 상황(S): ${e.situation || "-"}`,
            `- 과제(T): ${e.task || "-"}`,
            `- 행동(A): ${e.action || "-"}`,
            `- 결과(R): ${e.result || "-"}`,
            `- 수치: ${e.metric || "-"}`,
            ``,
          ];
        })
      : ["아직 정리한 경험이 없습니다. 5단계에서 경험을 추가하면 여기에 정리됩니다.", ""]),
    `## 5. 예상 면접 질문`,
    ...interview.map((q) => `- ${q.question}\n  - ${q.hint}`),
    ``,
    `## 6. 서류 키워드`,
    keywords.map((k) => `\`${k}\``).join(" · "),
    ``,
    `## 7. 이렇게 쓰면 감점됩니다`,
    ...cautions.map((c) => `- ${c}`),
    ``,
    `---`,
    `부울경 연합 현직자 멘토링 · 일 강점 진단으로 작성`,
  ].join("\n");

  return {
    headline,
    positioning,
    resumeLines,
    coverLetter,
    interview,
    keywords,
    cautions,
    crossCheck,
    markdown,
  };
}
