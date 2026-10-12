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

export interface ContextoDaReserva {
  situacao: SituacaoReserva;
  encontroSituacao: "planejado" | "realizado" | "cancelado";
  temaDoEncontro: string | null;
  temaDaReserva: string;
  origemVigente: boolean;
  catequizandoAtivo: boolean;
  turmaVisitadaEncerrada: boolean;
  /** Motivo já gravado numa reserva `cancelada`; ausente ou nulo vale cancelamento pelo usuário. */
  motivoGravado?: MotivoObsolescencia | null;
}

export type SituacaoEfetiva =
  | { situacao: Exclude<SituacaoReserva, "cancelada"> }
  | { situacao: "cancelada"; motivo: MotivoObsolescencia | "cancelada-por-usuario" };

/**
 * Situação efetiva da reserva (6.1–6.3). Só `reservada` vira `cancelada` por obsolescência;
 * `compareceu`, `nao_compareceu` e `cancelada` seguem como gravadas. Quando mais de um motivo
 * vale, a precedência segue a ordem do design: encontro cancelado, tema alterado/retirado,
 * saída da turma de origem, catequizando inativo, turma visitada encerrada.
 */
export function situacaoEfetiva(contexto: ContextoDaReserva): SituacaoEfetiva {
  if (contexto.situacao === "cancelada") {
    return { situacao: "cancelada", motivo: contexto.motivoGravado ?? "cancelada-por-usuario" };
  }
  if (contexto.situacao !== "reservada") return { situacao: contexto.situacao };

  const cancelada = (motivo: MotivoObsolescencia): SituacaoEfetiva => ({
    situacao: "cancelada",
    motivo,
  });
  if (contexto.encontroSituacao === "cancelado") return cancelada("encontro-cancelado");
  if (contexto.temaDoEncontro !== contexto.temaDaReserva) return cancelada("tema-alterado");
  if (!contexto.origemVigente) return cancelada("saiu-da-turma");
  if (!contexto.catequizandoAtivo) return cancelada("catequizando-inativo");
  if (contexto.turmaVisitadaEncerrada) return cancelada("turma-encerrada");
  return { situacao: "reservada" };
}
