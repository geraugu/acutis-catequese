import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { criarTurmaAction } from "@/modules/turmas/actions";
import { FormularioTurma } from "@/components/turmas/formulario-turma";

export const metadata: Metadata = {
  title: "Nova turma — Acutis Catequese",
};

export default async function NovaTurmaPage() {
  await requireRole(["coordenacao"], "/coordenacao/turmas/nova");
  return (
    <>
      <p>
        <Link href="/coordenacao/turmas">← Voltar para as turmas</Link>
      </p>
      <h1>Nova turma</h1>
      <FormularioTurma modo="criar" acao={criarTurmaAction} />
    </>
  );
}
