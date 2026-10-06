import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { AbaResumo } from "@/app/(interno)/_turma/abas";

export const metadata: Metadata = {
  title: "Turma — Acutis Catequese",
};

/** Resumo da turma; ignora `?q` e `?ordem`, que pertencem às abas Inscritos e Frequência (2.1 a 2.5). */
export default async function TurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/turmas/${id}`);
  const { aviso } = await searchParams;
  return <AbaResumo papel="coordenacao" turmaId={id} aviso={aviso} />;
}
