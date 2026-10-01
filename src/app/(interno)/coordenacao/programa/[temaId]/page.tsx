import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { encontrosEquivalentes, obterTema } from "@/modules/programa/repositorio";
import {
  desativarTemaAction,
  excluirTemaAction,
  reativarTemaAction,
} from "@/modules/programa/actions";
import { AcoesTema } from "@/components/programa/acoes-tema";
import { EncontrosEquivalentes } from "@/components/programa/encontros-equivalentes";

export const metadata: Metadata = {
  title: "Tema — Acutis Catequese",
};

function textoEncontros(n: number): string {
  if (n === 0) return "Nenhum encontro";
  return n === 1 ? "1 encontro" : `${n} encontros`;
}

/**
 * Dados do tema, ações e encontros equivalentes (3.3, 3.4, 8.2). Se a exclusão for
 * recusada (tema já usado), a mensagem aparece em `AcoesTema`, ao lado de "Desativar".
 */
export default async function TemaPage({ params }: { params: Promise<{ temaId: string }> }) {
  const { temaId } = await params;
  await requireRole(["coordenacao"], `/coordenacao/programa/${temaId}`);
  const tema = await obterTema(temaId);
  if (!tema) notFound();
  const encontros = await encontrosEquivalentes(temaId);

  return (
    <>
      <p>
        <Link href="/coordenacao/programa">← Voltar para o programa</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{tema.titulo}</h1>
      </div>

      <dl className="membro-dados">
        <div>
          <dt>Situação</dt>
          <dd>
            <span className={`situacao ${tema.ativo ? "situacao-ativo" : "situacao-inativo"}`}>
              {tema.ativo ? "Ativo" : "Desativado"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Descrição</dt>
          <dd>{tema.descricao ?? "Sem descrição."}</dd>
        </div>
        <div>
          <dt>Encontros</dt>
          <dd>{textoEncontros(tema.encontros)}</dd>
        </div>
      </dl>

      <div className="membro-acoes">
        <Link href={`/coordenacao/programa/${temaId}/editar`} className="botao botao-secundario">
          Editar
        </Link>
        <AcoesTema
          tema={tema}
          desativar={desativarTemaAction.bind(null, temaId)}
          reativar={reativarTemaAction.bind(null, temaId)}
          excluir={excluirTemaAction.bind(null, temaId)}
        />
      </div>

      <section className="turma-secao" aria-labelledby="tema-equivalentes">
        <h2 id="tema-equivalentes">Encontros equivalentes</h2>
        <EncontrosEquivalentes encontros={encontros} baseTurma="/coordenacao/turmas" />
      </section>
    </>
  );
}
