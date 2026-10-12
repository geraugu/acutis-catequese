import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { TemaDoProgresso } from "@/modules/programa/domain/progresso";
import { calcularProgressoCatequizando } from "./domain/progresso-catequizando";
import {
  conflitoDeData,
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
async function resolverReservas(
  where: { catequizandoId?: string; encontroId?: string },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const reservas = await db.reservaReposicao.findMany({
    where,
    select: SELECAO_RESERVA,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (reservas.length === 0) return [];
  const inscricoes = await db.inscricao.findMany({
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

export type ResultadoReserva =
  | { ok: true; reservaId: string }
  | { ok: false; motivo: "indisponivel" | "conflito-de-data" | "ja-reservada" | "sem-origem" };

const INDISPONIVEL = { ok: false, motivo: "indisponivel" } as const;

/**
 * Reserva a reposição em transação (4.1–4.4, 6.1–6.3): revalida o encontro, grava como
 * `cancelada` as reservas obsoletas do catequizando, recusa conflito de data e insere.
 * Só escreve em `reserva_reposicao`.
 */
export async function reservar(
  entrada: { catequizandoId: string; encontroId: string; temaId: string; criadoPorId: string },
  hoje: DataCivil,
): Promise<ResultadoReserva> {
  const { catequizandoId, encontroId, temaId, criadoPorId } = entrada;
  if (![catequizandoId, encontroId, temaId].every((id) => UUID.test(id))) return INDISPONIVEL;
  try {
    return await prisma.$transaction(async (tx): Promise<ResultadoReserva> => {
      // Serializa as reservas do mesmo catequizando (temas ou datas concorrentes).
      await tx.$queryRaw`SELECT id FROM catequizando WHERE id = ${catequizandoId} FOR UPDATE`;

      const inscricoes = await tx.inscricao.findMany({
        where: { catequizandoId, dataSaida: null, turma: { encerradaEm: null } },
        select: { turmaId: true },
      });
      const origemTurmaIds = [...new Set(inscricoes.map((i) => i.turmaId))];
      if (origemTurmaIds.length === 0) return { ok: false, motivo: "sem-origem" };

      const encontro = await tx.encontro.findUnique({
        where: { id: encontroId },
        select: {
          turmaId: true,
          temaId: true,
          situacao: true,
          data: true,
          turma: { select: { encerradaEm: true } },
        },
      });
      if (
        !encontro ||
        encontro.situacao !== "planejado" ||
        encontro.temaId !== temaId ||
        paraCivil(encontro.data) < hoje ||
        encontro.turma.encerradaEm !== null ||
        origemTurmaIds.includes(encontro.turmaId)
      ) {
        return INDISPONIVEL;
      }

      // (2) Materializa as obsoletas: só a persistência muda, nunca presença/inscrição/encontro.
      const resolvidas = await resolverReservas({ catequizandoId }, tx);
      for (const { r, efetiva } of resolvidas) {
        if (r.situacao === "reservada" && efetiva.situacao === "cancelada") {
          await tx.reservaReposicao.updateMany({
            where: { id: r.id, situacao: "reservada" },
            data: { situacao: "cancelada", motivoCancelamento: efetiva.motivo },
          });
        }
      }
      const ativas = resolvidas.filter(
        ({ r, efetiva }) => r.situacao === "reservada" && efetiva.situacao === "reservada",
      );

      if (ativas.some(({ r }) => r.encontro.id === encontroId)) return INDISPONIVEL;
      const presenca = await tx.presenca.findFirst({
        where: { catequizandoId, encontroId },
        select: { id: true },
      });
      if (presenca) return INDISPONIVEL;
      if (ativas.some(({ r }) => r.temaId === temaId)) return { ok: false, motivo: "ja-reservada" };

      // (3) Conflito de data com a origem ou com outra reserva ativa (4.3).
      const encontrosDaOrigem = await tx.encontro.findMany({
        where: { turmaId: { in: origemTurmaIds }, situacao: { not: "cancelado" } },
        select: { data: true },
      });
      const conflito = conflitoDeData(
        paraCivil(encontro.data),
        new Set(encontrosDaOrigem.map((e) => paraCivil(e.data))),
        ativas.map(({ r }) => ({
          encontroId: r.encontro.id,
          temaId: r.temaId,
          data: paraCivil(r.encontro.data),
        })),
      );
      if (conflito) return { ok: false, motivo: "conflito-de-data" };

      // (4) Origem que trabalhou o tema; senão, a primeira vigente.
      const trabalhou = await tx.encontro.findFirst({
        where: { turmaId: { in: origemTurmaIds }, situacao: "realizado", temaId },
        select: { turmaId: true },
        orderBy: { data: "asc" },
      });
      const criada = await tx.reservaReposicao.create({
        data: {
          catequizandoId,
          temaId,
          encontroId,
          turmaOrigemId: trabalhou?.turmaId ?? origemTurmaIds[0],
          criadoPorId,
          situacao: "reservada",
        },
        select: { id: true },
      });
      return { ok: true, reservaId: criada.id };
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, motivo: "ja-reservada" };
    }
    throw erro;
  }
}

/** Cancela a reserva `reservada` do catequizando; sem motivo gravado = cancelada pelo usuário (4.5). */
export async function cancelar(
  reservaId: string,
  catequizandoId: string,
): Promise<"ok" | "indisponivel"> {
  if (!UUID.test(reservaId) || !UUID.test(catequizandoId)) return "indisponivel";
  const { count } = await prisma.reservaReposicao.updateMany({
    where: { id: reservaId, catequizandoId, situacao: "reservada" },
    data: { situacao: "cancelada", motivoCancelamento: null },
  });
  return count > 0 ? "ok" : "indisponivel";
}

/** `reservada` vigente → `nao_compareceu`, sem criar presença; repetir é idempotente (5.3). */
export async function marcarNaoCompareceu(
  encontroId: string,
  catequizandoId: string,
): Promise<"ok" | "indisponivel"> {
  if (!UUID.test(encontroId) || !UUID.test(catequizandoId)) return "indisponivel";
  return prisma.$transaction(async (tx) => {
    const resolvidas = await resolverReservas({ encontroId, catequizandoId }, tx);
    const vigente = resolvidas.find(
      ({ r, efetiva }) => r.situacao === "reservada" && efetiva.situacao === "reservada",
    );
    if (vigente) {
      const { count } = await tx.reservaReposicao.updateMany({
        where: { id: vigente.r.id, situacao: "reservada" },
        data: { situacao: "nao_compareceu" },
      });
      return count > 0 ? "ok" : "indisponivel";
    }
    return resolvidas.some(({ r }) => r.situacao === "nao_compareceu") ? "ok" : "indisponivel";
  });
}

/** Nome do catequizando para o título da página "o que falta"; nulo se o id não existe. */
export async function nomeDoCatequizando(catequizandoId: string): Promise<string | null> {
  if (!UUID.test(catequizandoId)) return null;
  const c = await prisma.catequizando.findUnique({
    where: { id: catequizandoId },
    select: { nome: true },
  });
  return c?.nome ?? null;
}
