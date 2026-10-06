import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { ordemDaBusca } from "@/app/(interno)/_presenca/blocos";
import { AbaFrequencia } from "@/app/(interno)/_turma/abas";

export const metadata: Metadata = {
  title: "Frequência da turma — Acutis Catequese",
};

export default async function FrequenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole(["catequista"], `/catequista/turmas/${id}/frequencia`);
  const { ordem, aviso } = await searchParams;
  return (
    <AbaFrequencia papel="catequista" turmaId={id} aviso={aviso} ordem={ordemDaBusca(ordem)} />
  );
}
