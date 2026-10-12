import { compararDatas, type DataCivil } from "@/modules/compartilhado/datas";
import type { TemaDoProgresso } from "@/modules/programa/domain/progresso";

export type SituacaoReserva = "reservada" | "compareceu" | "nao_compareceu" | "cancelada";
export type MotivoObsolescencia =
  | "encontro-cancelado"
  | "tema-alterado"
  | "saiu-da-turma"
  | "catequizando-inativo"
  | "turma-encerrada";

export interface TemaARepor {
  id: string;
  numero: number;
  titulo: string;
}

export interface EncontroCandidato {
  encontroId: string;
  turmaId: string;
  turmaNome: string;
  diaSemana: string;
  data: DataCivil;
  horario: string;
  temaId: string;
}

export interface OpcaoDeReposicao extends EncontroCandidato {
  conflito: boolean;
}

export interface ReservaAtiva {
  encontroId: string;
  temaId: string;
  data: DataCivil;
}

/** Pendentes que já foram trabalhados na turma de origem, na ordem do programa (2.1, 2.2, 2.3). */
export function temasARepor(
  pendentes: readonly TemaDoProgresso[],
  trabalhadosNaOrigem: ReadonlySet<string>,
): TemaARepor[] {
  return pendentes
    .filter((tema) => trabalhadosNaOrigem.has(tema.id))
    .map(({ id, numero, titulo }) => ({ id, numero, titulo }))
    .sort((a, b) => a.numero - b.numero);
}

/**
 * Candidatos do tema, sem os encontros em que já há presença ou reserva ativa, por data e
 * depois por nome da turma; `conflito` marca as datas ocupadas (3.1–3.4).
 */
export function opcoesDoTema(
  temaId: string,
  candidatos: readonly EncontroCandidato[],
  jaConstam: ReadonlySet<string>,
  datasOcupadas: ReadonlySet<DataCivil>,
): OpcaoDeReposicao[] {
  return candidatos
    .filter((c) => c.temaId === temaId && !jaConstam.has(c.encontroId))
    .map((c) => ({ ...c, conflito: datasOcupadas.has(c.data) }))
    .sort(
      (a, b) => compararDatas(a.data, b.data) || a.turmaNome.localeCompare(b.turmaNome, "pt-BR"),
    );
}

/** A data coincide com encontro da turma de origem ou com outra reserva ativa (4.3). */
export function conflitoDeData(
  data: DataCivil,
  datasDaOrigem: ReadonlySet<DataCivil>,
  reservas: readonly ReservaAtiva[],
): boolean {
  return datasDaOrigem.has(data) || reservas.some((r) => r.data === data);
}
