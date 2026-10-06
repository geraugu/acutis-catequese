import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { AbaInscritos } from "@/app/(interno)/_turma/abas";

export const metadata: Metadata = {
  title: "Inscritos da turma — Acutis Catequese",
};

type Busca = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function InscritosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Busca>;
}) {
  const { id } = await params;
  await requireRole(["catequista"], `/catequista/turmas/${id}/inscritos`);
  const { q, aviso } = await searchParams;
  return (
    <AbaInscritos
      papel="catequista"
      turmaId={id}
      aviso={aviso}
      termo={(primeiro(q) ?? "").trim()}
    />
  );
}
