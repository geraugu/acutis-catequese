import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { AbaEquipe } from "@/app/(interno)/_turma/abas";

export const metadata: Metadata = {
  title: "Equipe e link da turma — Acutis Catequese",
};

export default async function EquipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requireRole(["catequista"], `/catequista/turmas/${id}/equipe`);
  const { aviso } = await searchParams;
  return <AbaEquipe papel="catequista" turmaId={id} aviso={aviso} />;
}
