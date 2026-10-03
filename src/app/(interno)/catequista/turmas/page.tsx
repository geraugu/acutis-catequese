import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { listarTurmasDoCatequista } from "@/modules/turmas/repositorio";
import { contarPendentesPorTurma } from "@/modules/autocadastro/repositorio";
import { ListaTurmas, type DestaqueTurma } from "@/components/turmas/lista-turmas";

export const metadata: Metadata = {
  title: "Minhas turmas — Acutis Catequese",
};

export default async function MinhasTurmasPage() {
  const sessao = await requireRole(["catequista"], "/catequista/turmas");
  const turmas = await listarTurmasDoCatequista(sessao.userId);
  const pendentes = await contarPendentesPorTurma(turmas.map((t) => t.id));
  const destaques: Record<string, DestaqueTurma> = {};
  for (const [turmaId, n] of pendentes) {
    if (n <= 0) continue;
    destaques[turmaId] = {
      texto: n === 1 ? "1 ficha pendente" : `${n} fichas pendentes`,
      href: `/catequista/turmas/${turmaId}/pendentes`,
    };
  }

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Minhas turmas</h1>
      </div>
      {turmas.length === 0 ? (
        <div className="lista-vazia">
          <p>Você ainda não tem turmas designadas.</p>
        </div>
      ) : (
        <ListaTurmas turmas={turmas} base="/catequista/turmas" destaques={destaques} />
      )}
    </>
  );
}
