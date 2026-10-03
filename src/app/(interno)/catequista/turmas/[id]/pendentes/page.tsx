import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaFila } from "@/app/(interno)/_pendentes/paginas";

export const metadata: Metadata = {
  title: "Fichas pendentes — Acutis Catequese",
};

export default async function PendentesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole(["catequista"], `/catequista/turmas/${id}/pendentes`);
  const { aviso } = await searchParams;
  return <PaginaFila area="catequista" turmaId={id} aviso={aviso} />;
}
