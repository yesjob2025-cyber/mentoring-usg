export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-fest-line bg-fest-navy text-white">
      <div className="fest-container py-12 sm:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-fest-lime">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
