import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaChamada } from "@/app/(interno)/_presenca/paginas";

export const metadata: Metadata = {
  title: "Chamada — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

export default async function ChamadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; encontroId: string }>;
  searchParams: Promise<Params>;
}) {
  const { id, encontroId } = await params;
  const sessao = await requireRole(
    ["coordenacao"],
    `/coordenacao/turmas/${id}/encontros/${encontroId}/chamada`,
  );
  const { aviso } = await searchParams;
  return (
    <PaginaChamada
      sessao={sessao}
      papel="coordenacao"
      turmaId={id}
      encontroId={encontroId}
      aviso={aviso}
    />
  );
}
