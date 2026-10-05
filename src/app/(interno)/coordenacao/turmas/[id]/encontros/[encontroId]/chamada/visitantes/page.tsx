import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaVisitantes } from "@/app/(interno)/_presenca/paginas";

export const metadata: Metadata = {
  title: "Visitantes — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

export default async function VisitantesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; encontroId: string }>;
  searchParams: Promise<Params>;
}) {
  const { id, encontroId } = await params;
  const sessao = await requireRole(
    ["coordenacao"],
    `/coordenacao/turmas/${id}/encontros/${encontroId}/chamada/visitantes`,
  );
  const { q, aviso } = await searchParams;
  return (
    <PaginaVisitantes
      sessao={sessao}
      papel="coordenacao"
      turmaId={id}
      encontroId={encontroId}
      termo={q}
      aviso={aviso}
    />
  );
}
