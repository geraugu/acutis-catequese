import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { criarTemaAction } from "@/modules/programa/actions";
import { FormularioTema } from "@/components/programa/formulario-tema";

export const metadata: Metadata = {
  title: "Novo tema — Acutis Catequese",
};

export default async function NovoTemaPage() {
  await requireRole(["coordenacao"], "/coordenacao/programa/novo");
  return (
    <>
      <p>
        <Link href="/coordenacao/programa">← Voltar para o programa</Link>
      </p>
      <h1>Novo tema</h1>
      <FormularioTema modo="criar" acao={criarTemaAction} />
    </>
  );
}
