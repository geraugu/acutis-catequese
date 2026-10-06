import type { ReactElement, ReactNode } from "react";
import { notFound } from "next/navigation";
import { BarraAbas } from "@/components/turmas/barra-abas";
import { CabecalhoTurma } from "@/components/turmas/cabecalho-turma";
import { cabecalhoDaTurma, carregarTurmaDaAba, type Papel } from "./dados";

/**
 * Layout compartilhado das abas da turma: autoriza, lê nome e pendentes e renderiza
 * cabeçalho, barra e conteúdo. Não lê `searchParams` (1.1, 1.6, 1.7, 9.1, 9.3).
 * Cada página de aba ainda autoriza por conta própria (o layout não re-renderiza entre abas).
 */
export async function LayoutDaTurma({
  papel,
  turmaId,
  children,
}: {
  papel: Papel;
  turmaId: string;
  children: ReactNode;
}): Promise<ReactElement> {
  const base = `/${papel}/turmas/${turmaId}`;
  await carregarTurmaDaAba(papel, turmaId, base);
  const cabecalho = await cabecalhoDaTurma(turmaId);
  if (!cabecalho) notFound();

  return (
    <>
      <CabecalhoTurma papel={papel} nome={cabecalho.nome} />
      <BarraAbas base={base} pendentes={cabecalho.pendentes} />
      {children}
    </>
  );
}
