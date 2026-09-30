import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { criarMembroAction } from "@/modules/equipe/actions";
import { FormularioMembro } from "@/components/equipe/formulario-membro";

export const metadata: Metadata = {
  title: "Cadastrar membro — Acutis Catequese",
};

export default async function NovoMembroPage() {
  await requireRole(["coordenacao"], "/coordenacao/equipe/novo");
  return (
    <>
      <p>
        <Link href="/coordenacao/equipe">← Voltar para a equipe</Link>
      </p>
      <h1>Cadastrar membro</h1>
      <FormularioMembro modo="criacao" acao={criarMembroAction} />
    </>
  );
}
