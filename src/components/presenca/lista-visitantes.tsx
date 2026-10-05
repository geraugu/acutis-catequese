"use client";

import { Confirmacao } from "@/components/comum/confirmacao";
import type { EstadoPresenca } from "@/modules/presenca/actions";
import type { VisitanteDaChamada } from "./chamada-form";

/** Remoção já vinculada (`removerVisitanteAction.bind(null, turmaId, encontroId, base)`). */
export type AcaoVisitante = (catequizandoId: string) => Promise<EstadoPresenca>;

interface ListaVisitantesProps {
  visitantes: readonly VisitanteDaChamada[];
  remover: AcaoVisitante;
}

/** Visitantes do encontro, com remoção confirmada (4.2, 4.6, 4.9). */
export function ListaVisitantes({ visitantes, remover }: ListaVisitantesProps) {
  if (visitantes.length === 0) {
    return <p className="presenca-origem">Nenhum visitante neste encontro.</p>;
  }
  return (
    <ul className="presenca-lista-visitantes">
      {visitantes.map((v) => (
        <li key={v.catequizandoId}>
          <span>{v.nome}</span>
          <span className="presenca-selo-visitante">Visitante</span>
          {v.turmaOrigemNome ? (
            <span className="presenca-origem">Turma de origem: {v.turmaOrigemNome}</span>
          ) : null}
          <Confirmacao
            rotuloAbrir={`Remover ${v.nome}`}
            titulo={`Remover o visitante ${v.nome}?`}
            texto="A presença de visitante deste encontro será apagada. A inscrição na turma de origem não muda."
            rotuloConfirmar="Remover"
            perigo
            acao={async () => ({ erro: (await remover(v.catequizandoId)).erro })}
          />
        </li>
      ))}
    </ul>
  );
}
