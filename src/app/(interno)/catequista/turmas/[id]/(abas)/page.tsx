import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { AbaResumo } from "@/app/(interno)/_turma/abas";

export const metadata: Metadata = {
  title: "Turma — Acutis Catequese",
};

/** Resumo da turma em modo leitura para o catequista designado; ignora `?q` e `?ordem` (2.1 a 2.5, 9.1). */
export default async function TurmaCatequistaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole(["catequista"], `/catequista/turmas/${id}`);
  const { aviso } = await searchParams;
  return <AbaResumo papel="catequista" turmaId={id} aviso={aviso} />;
}
