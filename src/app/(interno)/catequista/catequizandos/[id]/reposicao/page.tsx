import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaReposicao } from "@/app/(interno)/_presenca/paginas";

export const metadata: Metadata = {
  title: "O que falta — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

export default async function ReposicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const sessao = await requireRole(["catequista"], `/catequista/catequizandos/${id}/reposicao`);
  const { aviso } = await searchParams;
  return <PaginaReposicao sessao={sessao} papel="catequista" catequizandoId={id} aviso={aviso} />;
}
