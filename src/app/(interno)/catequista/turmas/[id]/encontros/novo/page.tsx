import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaNovoEncontro } from "@/app/(interno)/_encontros/paginas";

export const metadata: Metadata = {
  title: "Novo encontro — Acutis Catequese",
};

export default async function NovoEncontroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await requireRole(["catequista"], `/catequista/turmas/${id}/encontros/novo`);
  return <PaginaNovoEncontro sessao={sessao} papel="catequista" turmaId={id} />;
}
