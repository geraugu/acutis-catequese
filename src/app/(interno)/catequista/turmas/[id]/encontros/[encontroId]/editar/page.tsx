import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaEditarEncontro } from "@/app/(interno)/_encontros/paginas";

export const metadata: Metadata = {
  title: "Editar encontro — Acutis Catequese",
};

export default async function EditarEncontroPage({
  params,
}: {
  params: Promise<{ id: string; encontroId: string }>;
}) {
  const { id, encontroId } = await params;
  const sessao = await requireRole(
    ["catequista"],
    `/catequista/turmas/${id}/encontros/${encontroId}/editar`,
  );
  return (
    <PaginaEditarEncontro sessao={sessao} papel="catequista" turmaId={id} encontroId={encontroId} />
  );
}
