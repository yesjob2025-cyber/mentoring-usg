import { themeName } from "@/lib/taxonomy";
import type { PublicMentor } from "@/lib/view";

const KIND_STYLE: Record<string, string> = {
  industry: "bg-blue-50 text-blue-700",
  job: "bg-brand-50 text-brand-500",
  company: "bg-ink/5 text-ink-soft",
  type: "bg-emerald-50 text-emerald-700",
  major: "bg-purple-50 text-purple-700",
};

/** 멘토 태그 배지들 (산업/직무/유형/전공) */
export function MentorTagBadges({
  tags,
  max = 6,
}: {
  tags: PublicMentor["tags"];
  max?: number;
}) {
  const items: { kind: string; id: string }[] = [
    ...tags.job.map((id) => ({ kind: "job", id })),
    ...tags.industry.map((id) => ({ kind: "industry", id })),
    ...tags.type.map((id) => ({ kind: "type", id })),
    ...tags.major.map((id) => ({ kind: "major", id })),
  ];
  const shown = items.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((it, i) => (
        <span
          key={`${it.kind}-${it.id}-${i}`}
          className={`badge ${KIND_STYLE[it.kind] ?? "bg-ink/5 text-ink-soft"}`}
        >
          {themeName(it.id)}
        </span>
      ))}
    </div>
  );
}
