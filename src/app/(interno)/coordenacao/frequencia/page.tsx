import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { PaginaFrequencia } from "../../_presenca/paginas";

export const metadata: Metadata = {
  title: "Frequência — Acutis Catequese",
};

export default async function FrequenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string | string[] }>;
}) {
  const sessao = await requireRole(["coordenacao"], "/coordenacao/frequencia");
  const { aviso } = await searchParams;
  return <PaginaFrequencia sessao={sessao} papel="coordenacao" aviso={aviso} />;
}
