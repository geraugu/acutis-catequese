import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaRevisao } from "@/app/(interno)/_pendentes/paginas";

export const metadata: Metadata = {
  title: "Revisar ficha — Acutis Catequese",
};

export default async function RevisarFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; fichaId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, fichaId } = await params;
  await requireRole(["catequista"], `/catequista/turmas/${id}/pendentes/${fichaId}`);
  const { aviso } = await searchParams;
  return <PaginaRevisao area="catequista" turmaId={id} fichaId={fichaId} aviso={aviso} />;
}
