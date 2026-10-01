import Link from "next/link";

import { AcoesTema } from "@/components/programa/acoes-tema";
import {
  desativarTemaAction,
  excluirTemaAction,
  moverTemaAction,
  reativarTemaAction,
} from "@/modules/programa/actions";
import type { TemaResumo } from "@/modules/programa/repositorio";

export type TemaNumerado = TemaResumo & { numero: number | null };

const BASE = "/coordenacao/programa";

function textoEncontros(n: number): string {
  if (n === 0) return "Nenhum encontro";
  return n === 1 ? "1 encontro" : `${n} encontros`;
}

/** Lista ordenada dos temas (2.6, 2.7, 3.5, 3.6); `gestao` habilita links e ações (1.2). */
export function ListaTemas({
  temas,
  gestao = false,
}: {
  temas: readonly TemaNumerado[];
  gestao?: boolean;
}) {
  const ativos = temas.filter((t) => t.numero !== null).length;
  return (
    <ol className="lista-temas">
      {temas.map((t) => (
        <li key={t.id} className="lista-temas-item">
          {t.numero !== null ? (
            <>
              <span className="lista-temas-numero">{`${t.numero}.`}</span>
              <span className="situacao situacao-ativo">Ativo</span>
            </>
          ) : (
            <span className="situacao situacao-inativo">Desativado</span>
          )}
          {gestao ? (
            <Link href={`${BASE}/${t.id}`} className="lista-temas-titulo">
              {t.titulo}
            </Link>
          ) : (
            <span className="lista-temas-titulo">{t.titulo}</span>
          )}
          {t.descricao && <p className="lista-temas-descricao">{t.descricao}</p>}
          <span className="lista-temas-encontros">{textoEncontros(t.encontros)}</span>
          {gestao && (
            <div className="lista-temas-acoes">
              {t.numero !== null && (
                <>
                  <form action={moverTemaAction.bind(null, t.id, "subir")}>
                    <button
                      type="submit"
                      className="botao"
                      aria-label={`Subir ${t.titulo}`}
                      disabled={t.numero === 1}
                    >
                      Subir
                    </button>
                  </form>
                  <form action={moverTemaAction.bind(null, t.id, "descer")}>
                    <button
                      type="submit"
                      className="botao"
                      aria-label={`Descer ${t.titulo}`}
                      disabled={t.numero === ativos}
                    >
                      Descer
                    </button>
                  </form>
                </>
              )}
              <Link href={`${BASE}/${t.id}/editar`} aria-label={`Editar ${t.titulo}`}>
                Editar
              </Link>
              <AcoesTema
                tema={t}
                desativar={desativarTemaAction.bind(null, t.id)}
                reativar={reativarTemaAction.bind(null, t.id)}
                excluir={excluirTemaAction.bind(null, t.id)}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
