"use client";

import Link from "next/link";
import { createContext, useContext, type ComponentProps } from "react";

// 축제 사이트는 두 도메인에서 서빙되므로(/festival prefix 유무) 링크 prefix 를
// 레이아웃에서 한 번 계산해 컨텍스트로 내려주고, FestLink 가 자동으로 붙인다.
const FestBaseContext = createContext<string>("/festival");

export function FestBaseProvider({
  base,
  children,
}: {
  base: string;
  children: React.ReactNode;
}) {
  return <FestBaseContext.Provider value={base}>{children}</FestBaseContext.Provider>;
}

export function useFestBase() {
  return useContext(FestBaseContext);
}

export function useFestHref() {
  const base = useFestBase();
  return (path: string) => (path.startsWith("/") ? `${base}${path}` || "/" : path);
}

type FestLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export function FestLink({ href, ...rest }: FestLinkProps) {
  const base = useFestBase();
  const resolved = href.startsWith("/") ? `${base}${href}` || "/" : href;
  return <Link href={resolved} {...rest} />;
}
