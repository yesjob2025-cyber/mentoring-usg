import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/session";

/** 멘토링 플랫폼 공통 레이아웃 (JOB FESTIVAL 은 별도 레이아웃 사용) */
export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <SiteHeader session={session} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
