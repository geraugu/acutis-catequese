import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaCronograma } from "@/app/(interno)/_encontros/paginas";

export const metadata: Metadata = {
  title: "Encontros da turma — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

export default async function EncontrosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const sessao = await requireRole(["coordenacao"], `/coordenacao/turmas/${id}/encontros`);
  const { aviso } = await searchParams;
  return <PaginaCronograma sessao={sessao} papel="coordenacao" turmaId={id} aviso={aviso} />;
}
