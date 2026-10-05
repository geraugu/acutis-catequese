import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizarBusca } from "@/modules/compartilhado/busca";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";
import { numerarTemas } from "@/modules/programa/domain/tema";
import type { ModoChamada } from "./domain/chamada";
import type { StatusPresenca } from "./domain/frequencia";

export interface DadosDoEncontro {
  id: string;
  turmaId: string;
  turmaNome: string;
  turmaEncerrada: boolean;
  data: DataCivil;
  horario: string;
  situacao: SituacaoEncontro;
  temaId: string | null;
  temaTitulo: string | null;
  temaNumero: number | null;
}

export interface RegistroPresenca {
  catequizandoId: string;
  nome: string;
  status: StatusPresenca;
  visitante: boolean;
  turmaOrigemNome: string | null;
}

export interface Elegivel {
  catequizandoId: string;
  nome: string;
}

export interface CandidatoVisitante {
  catequizandoId: string;
  nome: string;
  turmaOrigemId: string;
  turmaOrigemNome: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Data civil para coluna `@db.Date` (meia-noite UTC). */
const paraData = (d: DataCivil): Date => new Date(`${d}T00:00:00Z`);
const paraCivil = (d: Date): DataCivil => d.toISOString().slice(0, 10) as DataCivil;

/** Limite de candidatos devolvidos pela busca de visitantes (4.2). */
const LIMITE_BUSCA_VISITANTES = 20;

/** Os ids vêm da URL: se não forem UUID, são tratados como inexistentes sem consultar. */
export async function dadosDoEncontro(
  turmaId: string,
  encontroId: string,
): Promise<DadosDoEncontro | null> {
  if (!UUID.test(turmaId) || !UUID.test(encontroId)) return null;
  const e = await prisma.encontro.findFirst({
    where: { id: encontroId, turmaId },
    select: {
      id: true,
      turmaId: true,
      data: true,
      horario: true,
      situacao: true,
      temaId: true,
      turma: { select: { nome: true, encerradaEm: true } },
      tema: { select: { titulo: true } },
    },
  });
  if (!e) return null;
  let temaNumero: number | null = null;
  if (e.temaId) {
    const temas = await prisma.tema.findMany({ select: { id: true, ativo: true, posicao: true } });
    temaNumero = numerarTemas(temas).find((t) => t.id === e.temaId)?.numero ?? null;
  }
  return {
    id: e.id,
    turmaId: e.turmaId,
    turmaNome: e.turma.nome,
    turmaEncerrada: e.turma.encerradaEm !== null,
    data: paraCivil(e.data),
    horario: e.horario,
    situacao: e.situacao,
    temaId: e.temaId,
    temaTitulo: e.tema?.titulo ?? null,
    temaNumero,
  };
}

/** Inscritos na data (entrada até a data, saída exclusiva), de qualquer estado, por nome (2.1, 3.3). */
export async function inscritosNaData(turmaId: string, data: DataCivil): Promise<Elegivel[]> {
  if (!UUID.test(turmaId)) return [];
  const linhas = await prisma.inscricao.findMany({
    where: {
      turmaId,
      dataEntrada: { lte: paraData(data) },
      OR: [{ dataSaida: null }, { dataSaida: { gt: paraData(data) } }],
    },
    select: { catequizandoId: true, catequizando: { select: { nome: true } } },
  });
  return linhas
    .map((l) => ({ catequizandoId: l.catequizandoId, nome: l.catequizando.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function presencasDoEncontro(encontroId: string): Promise<RegistroPresenca[]> {
  if (!UUID.test(encontroId)) return [];
  const linhas = await prisma.presenca.findMany({
    where: { encontroId },
    select: {
      catequizandoId: true,
      status: true,
      visitante: true,
      catequizando: { select: { nome: true } },
      turmaOrigem: { select: { nome: true } },
    },
  });
  return linhas
    .map((l) => ({
      catequizandoId: l.catequizandoId,
      nome: l.catequizando.nome,
      status: l.status,
      visitante: l.visitante,
      turmaOrigemNome: l.visitante ? (l.turmaOrigem?.nome ?? null) : null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Grava a chamada numa transação (3.2, 4.8). Em modo `nova`, a mudança de situação vem primeiro:
 * se outra chamada já a fez, nada foi gravado e o resultado é "situacao-mudou". Registros de
 * visitante nunca são sobrescritos com status de inscrito: a marcação é ignorada.
 */
export async function salvarChamada(
  e: { encontroId: string; turmaId: string; modo: ModoChamada },
  marcacoes: ReadonlyMap<string, StatusPresenca>,
): Promise<"ok" | "situacao-mudou"> {
  if (!UUID.test(e.encontroId) || !UUID.test(e.turmaId)) return "situacao-mudou";
  return prisma.$transaction(async (tx) => {
    if (e.modo === "nova") {
      const { count } = await tx.encontro.updateMany({
        where: { id: e.encontroId, turmaId: e.turmaId, situacao: "planejado" },
        data: { situacao: "realizado" },
      });
      if (count === 0) return "situacao-mudou";
    }
    const visitantes = new Set(
      (
        await tx.presenca.findMany({
          where: { encontroId: e.encontroId, visitante: true },
          select: { catequizandoId: true },
        })
      ).map((v) => v.catequizandoId),
    );
    for (const [catequizandoId, status] of marcacoes) {
      if (visitantes.has(catequizandoId)) continue;
      await tx.presenca.upsert({
        where: { encontroId_catequizandoId: { encontroId: e.encontroId, catequizandoId } },
        create: {
          encontroId: e.encontroId,
          turmaId: e.turmaId,
          catequizandoId,
          status,
          visitante: false,
        },
        update: { status },
      });
    }
    return "ok";
  });
}

/** Candidatos: ativos com inscrição vigente em outra turma aberta, ainda fora do encontro (4.2). */
export async function buscarVisitantes(
  turmaId: string,
  encontroId: string,
  termo: string,
): Promise<CandidatoVisitante[]> {
  if (!UUID.test(turmaId) || !UUID.test(encontroId)) return [];
  const encontro = await prisma.encontro.findFirst({
    where: { id: encontroId, turmaId },
    select: { data: true },
  });
  if (!encontro) return [];
  const [inscritos, registros, candidatos] = await Promise.all([
    inscritosNaData(turmaId, paraCivil(encontro.data)),
    prisma.presenca.findMany({ where: { encontroId }, select: { catequizandoId: true } }),
    prisma.inscricao.findMany({
      where: {
        dataSaida: null,
        turmaId: { not: turmaId },
        turma: { encerradaEm: null },
        catequizando: { estado: "ativo" },
      },
      select: {
        catequizandoId: true,
        turmaId: true,
        turma: { select: { nome: true } },
        catequizando: { select: { nome: true } },
      },
    }),
  ]);
  const jaConstam = new Set([
    ...inscritos.map((i) => i.catequizandoId),
    ...registros.map((r) => r.catequizandoId),
  ]);
  const busca = normalizarBusca(termo);
  const vistos = new Set<string>();
  return candidatos
    .filter((c) => {
      if (jaConstam.has(c.catequizandoId) || vistos.has(c.catequizandoId)) return false;
      if (!normalizarBusca(c.catequizando.nome).includes(busca)) return false;
      vistos.add(c.catequizandoId);
      return true;
    })
    .map((c) => ({
      catequizandoId: c.catequizandoId,
      nome: c.catequizando.nome,
      turmaOrigemId: c.turmaId,
      turmaOrigemNome: c.turma.nome,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, LIMITE_BUSCA_VISITANTES);
}

/** Registra o visitante como presente; a inscrição de origem só é lida, nunca alterada (4.3, 4.5). */
export async function adicionarVisitante(
  e: { encontroId: string; turmaId: string },
  catequizandoId: string,
): Promise<"ok" | "duplicado" | "indisponivel"> {
  if (!UUID.test(e.encontroId) || !UUID.test(e.turmaId) || !UUID.test(catequizandoId)) {
    return "indisponivel";
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const origem = await tx.inscricao.findFirst({
        where: {
          catequizandoId,
          dataSaida: null,
          turmaId: { not: e.turmaId },
          turma: { encerradaEm: null },
          catequizando: { estado: "ativo" },
        },
        select: { turmaId: true },
      });
      if (!origem) return "indisponivel";
      const existente = await tx.presenca.findUnique({
        where: {
          encontroId_catequizandoId: { encontroId: e.encontroId, catequizandoId },
        },
        select: { id: true },
      });
      if (existente) return "duplicado";
      await tx.presenca.create({
        data: {
          encontroId: e.encontroId,
          turmaId: e.turmaId,
          catequizandoId,
          status: "presente",
          visitante: true,
          turmaOrigemId: origem.turmaId,
        },
      });
      return "ok";
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return "duplicado";
    }
    throw erro;
  }
}

/** Só apaga linhas de visitante; presenças de inscritos nunca são excluídas (4.6). */
export async function removerVisitante(
  encontroId: string,
  catequizandoId: string,
): Promise<boolean> {
  if (!UUID.test(encontroId) || !UUID.test(catequizandoId)) return false;
  const { count } = await prisma.presenca.deleteMany({
    where: { encontroId, catequizandoId, visitante: true },
  });
  return count > 0;
}
