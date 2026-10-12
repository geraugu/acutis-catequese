import "server-only";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { TemaDoProgresso } from "@/modules/programa/domain/progresso";
import { calcularProgressoCatequizando } from "./domain/progresso-catequizando";
import {
  opcoesDoTema,
  situacaoEfetiva,
  temasARepor,
  type EncontroCandidato,
  type MotivoObsolescencia,
  type OpcaoDeReposicao,
  type SituacaoEfetiva,
  type SituacaoReserva,
  type TemaARepor,
} from "./domain/reposicao";
import { cumpridosDoCatequizando, temasAtivosNumerados } from "./repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Data civil para coluna `@db.Date` (meia-noite UTC). */
const paraData = (d: DataCivil): Date => new Date(`${d}T00:00:00Z`);
const paraCivil = (d: Date): DataCivil => d.toISOString().slice(0, 10) as DataCivil;

const MOTIVOS: ReadonlySet<string> = new Set<MotivoObsolescencia>([
  "encontro-cancelado",
  "tema-alterado",
  "saiu-da-turma",
  "catequizando-inativo",
  "turma-encerrada",
]);

const motivoGravado = (texto: string | null): MotivoObsolescencia | null =>
  texto !== null && MOTIVOS.has(texto) ? (texto as MotivoObsolescencia) : null;

/** Reserva com o destino e a situação efetiva já aplicada (6.4). */
export interface ReservaDetalhada {
  id: string;
  catequizandoId: string;
  temaId: string;
  /** Posição no programa; nulo quando o tema está inativo. */
  temaNumero: number | null;
  temaTitulo: string;
  turmaOrigemId: string;
  turmaOrigemNome: string;
  encontroId: string;
  turmaDestinoId: string;
  turmaDestinoNome: string;
  diaSemana: string;
  data: DataCivil;
  horario: string;
  /** Situação efetiva: uma `reservada` obsoleta já sai como `cancelada`. */
  situacao: SituacaoReserva;
  /** Presente apenas quando `situacao` é `cancelada`. */
  motivo: MotivoObsolescencia | "cancelada-por-usuario" | null;
  criadoEm: Date;
}

/** Reserva de um encontro, para o bloco da chamada (5.1). Inclui as não ativas; a tela filtra. */
export interface ReservaDaChamada {
  reservaId: string;
  catequizandoId: string;
  nome: string;
  turmaOrigemId: string;
  turmaOrigemNome: string;
  situacao: SituacaoReserva;
  motivo: MotivoObsolescencia | "cancelada-por-usuario" | null;
}

export interface VisaoDoCatequizando {
  origemTurmaIds: string[];
  /** `opcoes` fica vazio enquanto o tema tem reserva ativa (a reserva vem em destaque, 3.6). */
  temas: { tema: TemaARepor; opcoes: OpcaoDeReposicao[]; reserva: ReservaDetalhada | null }[];
}

const SEM_VISAO: VisaoDoCatequizando = { origemTurmaIds: [], temas: [] };

const desfecho = (s: SituacaoEfetiva) => ({
  situacao: s.situacao,
  motivo: s.situacao === "cancelada" ? s.motivo : null,
});

/** Temas de encontros realizados nas turmas de origem (base de `temasARepor`, 2.2, 2.4). */
export async function temasTrabalhados(origemTurmaIds: readonly string[]): Promise<Set<string>> {
  const ids = origemTurmaIds.filter((t) => UUID.test(t));
  if (ids.length === 0) return new Set();
  const linhas = await prisma.encontro.findMany({
    where: { turmaId: { in: ids }, situacao: "realizado", temaId: { not: null } },
    select: { temaId: true },
  });
  return new Set(linhas.flatMap((l) => (l.temaId ? [l.temaId] : [])));
}

/** Encontros planejados, de hoje em diante, de turmas abertas fora da origem, com algum dos temas (3.2, 3.3). */
export async function candidatosDeReposicao(
  temaIds: readonly string[],
  origemTurmaIds: readonly string[],
  hoje: DataCivil,
): Promise<EncontroCandidato[]> {
  const temas = temaIds.filter((t) => UUID.test(t));
  if (temas.length === 0) return [];
  const origem = origemTurmaIds.filter((t) => UUID.test(t));
  const linhas = await prisma.encontro.findMany({
    where: {
      situacao: "planejado",
      temaId: { in: temas },
      data: { gte: paraData(hoje) },
      turmaId: { notIn: origem },
      turma: { encerradaEm: null },
    },
    select: {
      id: true,
      turmaId: true,
      temaId: true,
      data: true,
      horario: true,
      turma: { select: { nome: true, diaSemana: true } },
    },
  });
  return linhas.flatMap((l) =>
    l.temaId
      ? [
          {
            encontroId: l.id,
            turmaId: l.turmaId,
            turmaNome: l.turma.nome,
            diaSemana: l.turma.diaSemana,
            data: paraCivil(l.data),
            horario: l.horario,
            temaId: l.temaId,
          },
        ]
      : [],
  );
}

const SELECAO_RESERVA = {
  id: true,
  catequizandoId: true,
  temaId: true,
  turmaOrigemId: true,
  situacao: true,
  motivoCancelamento: true,
  createdAt: true,
  catequizando: { select: { nome: true, estado: true } },
  tema: { select: { titulo: true } },
  turmaOrigem: { select: { nome: true } },
  encontro: {
    select: {
      id: true,
      turmaId: true,
      data: true,
      horario: true,
      situacao: true,
      temaId: true,
      turma: { select: { nome: true, diaSemana: true, encerradaEm: true } },
    },
  },
} as const;

/** Aplica `situacaoEfetiva` a reservas lidas, com as inscrições vigentes dos catequizandos. */
async function resolverReservas(where: { catequizandoId: string } | { encontroId: string }) {
  const reservas = await prisma.reservaReposicao.findMany({
    where,
    select: SELECAO_RESERVA,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (reservas.length === 0) return [];
  const inscricoes = await prisma.inscricao.findMany({
    where: {
      catequizandoId: { in: [...new Set(reservas.map((r) => r.catequizandoId))] },
      dataSaida: null,
    },
    select: { catequizandoId: true, turmaId: true },
  });
  const vigentes = new Set(inscricoes.map((i) => `${i.catequizandoId}:${i.turmaId}`));
  return reservas.map((r) => ({
    r,
    efetiva: situacaoEfetiva({
      situacao: r.situacao,
      encontroSituacao: r.encontro.situacao,
      temaDoEncontro: r.encontro.temaId,
      temaDaReserva: r.temaId,
      origemVigente: vigentes.has(`${r.catequizandoId}:${r.turmaOrigemId}`),
      catequizandoAtivo: r.catequizando.estado === "ativo",
      turmaVisitadaEncerrada: r.encontro.turma.encerradaEm !== null,
      motivoGravado: motivoGravado(r.motivoCancelamento),
    }),
  }));
}

/** Histórico completo do catequizando, da mais recente para a mais antiga (6.4). */
export async function reservasDoCatequizando(catequizandoId: string): Promise<ReservaDetalhada[]> {
  if (!UUID.test(catequizandoId)) return [];
  const [resolvidas, temas] = await Promise.all([
    resolverReservas({ catequizandoId }),
    temasAtivosNumerados(),
  ]);
  const numero = new Map(temas.map((t) => [t.id, t.numero]));
  return resolvidas
    .map(({ r, efetiva }) => ({
      id: r.id,
      catequizandoId: r.catequizandoId,
      temaId: r.temaId,
      temaNumero: numero.get(r.temaId) ?? null,
      temaTitulo: r.tema.titulo,
      turmaOrigemId: r.turmaOrigemId,
      turmaOrigemNome: r.turmaOrigem.nome,
      encontroId: r.encontro.id,
      turmaDestinoId: r.encontro.turmaId,
      turmaDestinoNome: r.encontro.turma.nome,
      diaSemana: r.encontro.turma.diaSemana,
      data: paraCivil(r.encontro.data),
      horario: r.encontro.horario,
      ...desfecho(efetiva),
      criadoEm: r.createdAt,
    }))
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime() || a.id.localeCompare(b.id));
}

/** Reservas do encontro com a situação efetiva, por nome do catequizando (5.1). */
export async function reservasDoEncontro(encontroId: string): Promise<ReservaDaChamada[]> {
  if (!UUID.test(encontroId)) return [];
  const resolvidas = await resolverReservas({ encontroId });
  return resolvidas
    .map(({ r, efetiva }) => ({
      reservaId: r.id,
      catequizandoId: r.catequizandoId,
      nome: r.catequizando.nome,
      turmaOrigemId: r.turmaOrigemId,
      turmaOrigemNome: r.turmaOrigem.nome,
      ...desfecho(efetiva),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Temas a repor do catequizando com as opções de cada um e a reserva ativa (2, 3). */
export async function visaoOQueFalta(
  catequizandoId: string,
  hoje: DataCivil,
): Promise<VisaoDoCatequizando> {
  if (!UUID.test(catequizandoId)) return SEM_VISAO;
  const inscricoes = await prisma.inscricao.findMany({
    where: { catequizandoId, dataSaida: null, turma: { encerradaEm: null } },
    select: { turmaId: true },
  });
  const origemTurmaIds = [...new Set(inscricoes.map((i) => i.turmaId))];
  if (origemTurmaIds.length === 0) return SEM_VISAO;

  const [cumpridos, temasAtivos, trabalhados, reservas, presencas, encontrosDaOrigem] =
    await Promise.all([
      cumpridosDoCatequizando(catequizandoId),
      temasAtivosNumerados(),
      temasTrabalhados(origemTurmaIds),
      reservasDoCatequizando(catequizandoId),
      prisma.presenca.findMany({ where: { catequizandoId }, select: { encontroId: true } }),
      prisma.encontro.findMany({
        where: { turmaId: { in: origemTurmaIds }, situacao: { not: "cancelado" } },
        select: { data: true },
      }),
    ]);
  const pendentes: TemaDoProgresso[] = calcularProgressoCatequizando(
    temasAtivos,
    cumpridos,
  ).pendentes;
  const aRepor = temasARepor(pendentes, trabalhados);
  if (aRepor.length === 0) return { origemTurmaIds, temas: [] };

  const ativas = reservas.filter((r) => r.situacao === "reservada");
  const candidatos = await candidatosDeReposicao(
    aRepor.map((t) => t.id),
    origemTurmaIds,
    hoje,
  );
  const jaConstam = new Set([
    ...presencas.map((p) => p.encontroId),
    ...ativas.map((r) => r.encontroId),
  ]);
  const datasOcupadas = new Set<DataCivil>([
    ...encontrosDaOrigem.map((e) => paraCivil(e.data)),
    ...ativas.map((r) => r.data),
  ]);
  return {
    origemTurmaIds,
    temas: aRepor.map((tema) => {
      const reserva = ativas.find((r) => r.temaId === tema.id) ?? null;
      return {
        tema,
        reserva,
        opcoes: reserva ? [] : opcoesDoTema(tema.id, candidatos, jaConstam, datasOcupadas),
      };
    }),
  };
}
