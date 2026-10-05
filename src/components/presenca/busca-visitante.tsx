"use client";

import { useId } from "react";
import { Confirmacao } from "@/components/comum/confirmacao";
import type { AcaoVisitante } from "./lista-visitantes";

/** Candidato exibido: só nome e turma de origem, nada de contato (4.2, LGPD). */
export interface CandidatoExibido {
  catequizandoId: string;
  nome: string;
  turmaOrigemNome: string | null;
}

interface BuscaVisitanteProps {
  /** Termo buscado (query `q`); `null` quando ainda não houve busca. */
  termo: string | null;
  candidatos: readonly CandidatoExibido[];
  /** Ação já vinculada (`adicionarVisitanteAction.bind(null, turmaId, encontroId, base)`). */
  adicionar: AcaoVisitante;
}

/** Busca de catequizando de outras turmas por nome e adição como visitante (4.2, 4.3). */
export function BuscaVisitante({ termo, candidatos, adicionar }: BuscaVisitanteProps) {
  const idCampo = useId();
  return (
    <section className="presenca-visitantes">
      <form method="get" role="search" className="campo">
        <label htmlFor={idCampo}>Buscar catequizando pelo nome</label>
        <input id={idCampo} name="q" type="search" defaultValue={termo ?? ""} maxLength={100} />
        <button type="submit" className="botao botao-secundario">
          Buscar
        </button>
      </form>
      {termo === null ? (
        <p className="presenca-origem">Digite o nome para buscar em outras turmas.</p>
      ) : candidatos.length === 0 ? (
        <p className="presenca-origem">Nenhum catequizando encontrado em outras turmas.</p>
      ) : (
        <ul className="presenca-lista-visitantes">
          {candidatos.map((c) => (
            <li key={c.catequizandoId}>
              <span>{c.nome}</span>
              {c.turmaOrigemNome ? (
                <span className="presenca-origem">Turma de origem: {c.turmaOrigemNome}</span>
              ) : null}
              <Confirmacao
                rotuloAbrir={`Adicionar ${c.nome}`}
                titulo={`Adicionar ${c.nome} como visitante?`}
                texto="O catequizando será registrado como presente neste encontro, sem mudar a inscrição na turma de origem."
                rotuloConfirmar="Adicionar"
                acao={async () => ({ erro: (await adicionar(c.catequizandoId)).erro })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
