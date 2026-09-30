import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { criarCatequizandoAction } from "@/modules/catequizandos/actions";
import { FormularioFicha } from "@/components/catequizandos/formulario-ficha";

export const metadata: Metadata = {
  title: "Cadastrar catequizando — Acutis Catequese",
};

export default async function NovoCatequizandoPage() {
  await requireRole(["coordenacao"], "/coordenacao/catequizandos/novo");
  return (
    <>
      <p>
        <Link href="/coordenacao/catequizandos">← Voltar para os catequizandos</Link>
      </p>
      <h1>Cadastrar catequizando</h1>
      <FormularioFicha modo="criacao" acao={criarCatequizandoAction} />
    </>
  );
}
