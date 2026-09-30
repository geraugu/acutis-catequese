import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/modules/auth/dal";
import { HEADER_CAMINHO } from "@/modules/auth/domain/rota-protegida";

export default async function InternoLayout({ children }: { children: ReactNode }) {
  // O caminho atual vem do header definido pelo proxy (layouts não recebem o pathname).
  const caminho = (await headers()).get(HEADER_CAMINHO) ?? undefined;
  const sessao = await requireSession(caminho);
  return (
    <AppShell sessao={sessao} caminhoAtual={caminho}>
      {children}
    </AppShell>
  );
}
