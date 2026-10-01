import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterTurma } from "@/modules/turmas/repositorio";
import { editarTurmaAction } from "@/modules/turmas/actions";
import { MSG_TURMA_ENCERRADA } from "@/modules/turmas/mensagens";
import { FormularioTurma } from "@/components/turmas/formulario-turma";

export const metadata: Metadata = {
  title: "Editar turma — Acutis Catequese",
};

export default async function EditarTurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/turmas/${id}/editar`);
  const turma = await obterTurma(id);
  if (!turma) notFound();

  const voltar = (
    <p>
      <Link href={`/coordenacao/turmas/${id}`}>← Voltar para {turma.nome}</Link>
    </p>
  );

  if (turma.encerrada) {
    return (
      <>
        {voltar}
        <h1>Editar turma</h1>
        <p className="turma-somente-leitura" role="status">
          {MSG_TURMA_ENCERRADA}
        </p>
      </>
    );
  }

  // Campos planos no formato do formulário.
  const valores: Record<string, string> = {
    nome: turma.nome,
    ciclo: String(turma.ciclo),
    diaSemana: turma.diaSemana,
    horario: turma.horario,
    local: turma.local ?? "",
    observacoes: turma.observacoes ?? "",
    vagas: turma.vagas === null ? "" : String(turma.vagas),
  };

  return (
    <>
      {voltar}
      <h1>Editar turma</h1>
      <FormularioTurma
        modo="editar"
        acao={editarTurmaAction.bind(null, id)}
        valoresIniciais={valores}
      />
    </>
  );
}
