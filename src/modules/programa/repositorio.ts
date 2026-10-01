import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { EncontroDados, SituacaoEncontro } from "./domain/encontro";
import { chaveDoTitulo, numerarTemas, type TemaDados } from "./domain/tema";

export interface TemaResumo {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  posicao: number;
  encontros: number;
}

export interface EncontroResumo {
  id: string;
  turmaId: string;
  data: DataCivil;
  horario: string;
  situacao: SituacaoEncontro;
  observacoes: string | null;
  motivoCancelamento: string | null;
  tema: { id: string; titulo: string; ativo: boolean; numero: number | null } | null;
}

export interface DadosTurma {
  id: string;
  nome: string;
  horario: string;
  encerrada: boolean;
}

export interface EncontroEquivalente {
  id: string;
  turmaId: string;
  turmaNome: string;
  data: DataCivil;
  horario: string;
  situacao: SituacaoEncontro;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Todos os encontros contam, inclusive os cancelados. */
const selecaoTema = {
  id: true,
  titulo: true,
  descricao: true,
  ativo: true,
  posicao: true,
  _count: { select: { encontros: true } },
} satisfies Prisma.TemaSelect;

type LinhaTema = Prisma.TemaGetPayload<{ select: typeof selecaoTema }>;

function paraTemaResumo(l: LinhaTema): TemaResumo {
  return {
    id: l.id,
    titulo: l.titulo,
    descricao: l.descricao,
    ativo: l.ativo,
    posicao: l.posicao,
    encontros: l._count.encontros,
  };
}

function dadosDoTema(d: TemaDados) {
  const titulo = d.titulo.trim();
  return { titulo, chave: chaveDoTitulo(titulo), descricao: d.descricao ?? null };
}

export async function listarTemas(): Promise<TemaResumo[]> {
  const linhas = await prisma.tema.findMany({
    orderBy: [{ posicao: "asc" }, { titulo: "asc" }],
    select: selecaoTema,
  });
  return linhas.map(paraTemaResumo);
}

/** O id vem da URL: se não for UUID, é tratado como inexistente sem consultar. */
export async function obterTema(id: string): Promise<TemaResumo | null> {
  if (!UUID.test(id)) return null;
  const l = await prisma.tema.findUnique({ where: { id }, select: selecaoTema });
  return l ? paraTemaResumo(l) : null;
}

/** Mesma regra do índice `tema_chave_unica`; `chave` já deve vir de `chaveDoTitulo`. */
export async function chaveEmUso(chave: string, ignorarId?: string): Promise<boolean> {
  const l = await prisma.tema.findFirst({
    where: { chave, ...(ignorarId && UUID.test(ignorarId) ? { id: { not: ignorarId } } : {}) },
    select: { id: true },
  });
  return l !== null;
}

/** Posição = maior + 1, numa transação. Chave repetida viola o índice (P2002); o chamador converte. */
export async function criarTema(d: TemaDados): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const { _max } = await tx.tema.aggregate({ _max: { posicao: true } });
    const criado = await tx.tema.create({
      data: { ...dadosDoTema(d), posicao: (_max.posicao ?? 0) + 1 },
      select: { id: true },
    });
    return criado.id;
  });
}

/** Atualiza também a chave; P2002 sobe para o chamador. */
export async function atualizarTema(id: string, d: TemaDados): Promise<void> {
  await prisma.tema.update({ where: { id }, data: dadosDoTema(d) });
}

export async function trocarPosicoes(a: string, b: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const [ta, tb] = await Promise.all([
      tx.tema.findUniqueOrThrow({ where: { id: a }, select: { posicao: true } }),
      tx.tema.findUniqueOrThrow({ where: { id: b }, select: { posicao: true } }),
    ]);
    await tx.tema.update({ where: { id: a }, data: { posicao: tb.posicao } });
    await tx.tema.update({ where: { id: b }, data: { posicao: ta.posicao } });
  });
}

export async function definirAtivo(id: string, ativo: boolean): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { count } = await prisma.tema.updateMany({ where: { id }, data: { ativo } });
  return count > 0;
}

/** Tema com qualquer encontro (inclusive cancelado) não é excluído; a FK Restrict cobre a corrida. */
export async function excluirTema(id: string): Promise<"excluido" | "em-uso" | "inexistente"> {
  if (!UUID.test(id)) return "inexistente";
  if ((await prisma.encontro.count({ where: { temaId: id } })) > 0) return "em-uso";
  try {
    const { count } = await prisma.tema.deleteMany({ where: { id } });
    return count > 0 ? "excluido" : "inexistente";
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return "em-uso";
    throw e;
  }
}

/** Ativos numerados; o tema `incluirId` entra ao fim, se estiver desativado (4.9). */
export async function temasParaSelecao(
  incluirId?: string,
): Promise<{ id: string; titulo: string; numero: number | null; ativo: boolean }[]> {
  const incluir = incluirId && UUID.test(incluirId) ? [{ id: incluirId }] : [];
  const linhas = await prisma.tema.findMany({
    where: { OR: [{ ativo: true }, ...incluir] },
    select: { id: true, titulo: true, ativo: true, posicao: true },
    // Mesmo desempate de listarTemas; numerarTemas preserva a ordem entre posições iguais.
    orderBy: [{ posicao: "asc" }, { titulo: "asc" }],
  });
  return numerarTemas(linhas).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    numero: t.numero,
    ativo: t.ativo,
  }));
}

// ---------------------------------------------------------------- encontros

/** Coluna `@db.Date` (meia-noite UTC) ↔ DataCivil, sem passar pelo fuso local. */
const paraData = (d: DataCivil): Date => new Date(`${d}T00:00:00Z`);
const paraCivil = (d: Date): DataCivil => d.toISOString().slice(0, 10) as DataCivil;

const selecaoEncontro = {
  id: true,
  turmaId: true,
  data: true,
  horario: true,
  situacao: true,
  observacoes: true,
  motivoCancelamento: true,
  tema: { select: { id: true, titulo: true, ativo: true } },
} satisfies Prisma.EncontroSelect;

type LinhaEncontro = Prisma.EncontroGetPayload<{ select: typeof selecaoEncontro }>;

/** Número exibido de cada tema, calculado sobre todos os temas (desativados → null). */
async function numerosDosTemas(): Promise<Map<string, number | null>> {
  const temas = await prisma.tema.findMany({
    select: { id: true, ativo: true, posicao: true },
    orderBy: [{ posicao: "asc" }, { titulo: "asc" }],
  });
  return new Map(numerarTemas(temas).map((t) => [t.id, t.numero]));
}

function paraEncontroResumo(l: LinhaEncontro, numeros: Map<string, number | null>): EncontroResumo {
  return {
    id: l.id,
    turmaId: l.turmaId,
    data: paraCivil(l.data),
    horario: l.horario,
    situacao: l.situacao,
    observacoes: l.observacoes,
    motivoCancelamento: l.motivoCancelamento,
    tema: l.tema ? { ...l.tema, numero: numeros.get(l.tema.id) ?? null } : null,
  };
}

const naoCancelado = { situacao: { not: "cancelado" } } satisfies Prisma.EncontroWhereInput;

function ignorando(ignorarId?: string): Prisma.EncontroWhereInput {
  return ignorarId && UUID.test(ignorarId) ? { id: { not: ignorarId } } : {};
}

function dadosDoEncontro(d: EncontroDados) {
  return {
    data: paraData(d.data),
    horario: d.horario,
    temaId: d.temaId ?? null,
    observacoes: d.observacoes ?? null,
  };
}

/** Lê a tabela turma diretamente (o módulo não depende de @/modules/turmas). */
export async function dadosDaTurma(turmaId: string): Promise<DadosTurma | null> {
  if (!UUID.test(turmaId)) return null;
  const t = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { id: true, nome: true, horario: true, encerradaEm: true },
  });
  return t
    ? { id: t.id, nome: t.nome, horario: t.horario, encerrada: t.encerradaEm !== null }
    : null;
}

export async function listarEncontros(turmaId: string): Promise<EncontroResumo[]> {
  if (!UUID.test(turmaId)) return [];
  const [linhas, numeros] = await Promise.all([
    prisma.encontro.findMany({
      where: { turmaId },
      select: selecaoEncontro,
      orderBy: [{ data: "asc" }, { horario: "asc" }],
    }),
    numerosDosTemas(),
  ]);
  return linhas.map((l) => paraEncontroResumo(l, numeros));
}

export async function obterEncontro(id: string): Promise<EncontroResumo | null> {
  if (!UUID.test(id)) return null;
  const l = await prisma.encontro.findUnique({ where: { id }, select: selecaoEncontro });
  return l ? paraEncontroResumo(l, await numerosDosTemas()) : null;
}

/** Data do encontro não cancelado mais antigo da turma com esse tema (4.5). */
export async function encontroComMesmoTema(
  turmaId: string,
  temaId: string,
  ignorarId?: string,
): Promise<DataCivil | null> {
  if (!UUID.test(turmaId) || !UUID.test(temaId)) return null;
  const l = await prisma.encontro.findFirst({
    where: { turmaId, temaId, ...naoCancelado, ...ignorando(ignorarId) },
    select: { data: true },
    orderBy: [{ data: "asc" }, { horario: "asc" }],
  });
  return l ? paraCivil(l.data) : null;
}

/** Mesma regra do índice `encontro_horario_unico` (só não cancelados). */
export async function conflitoDeHorario(
  turmaId: string,
  data: DataCivil,
  horario: string,
  ignorarId?: string,
): Promise<boolean> {
  if (!UUID.test(turmaId)) return false;
  const l = await prisma.encontro.findFirst({
    where: { turmaId, data: paraData(data), horario, ...naoCancelado, ...ignorando(ignorarId) },
    select: { id: true },
  });
  return l !== null;
}

/** P2002 (índice de horário) sobe para o chamador. */
export async function criarEncontro(turmaId: string, d: EncontroDados): Promise<string> {
  const e = await prisma.encontro.create({
    data: { turmaId, ...dadosDoEncontro(d) },
    select: { id: true },
  });
  return e.id;
}

/** Update condicional: só grava se o encontro ainda estiver planejado (5.7). */
export async function atualizarEncontro(id: string, d: EncontroDados): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { count } = await prisma.encontro.updateMany({
    where: { id, situacao: "planejado" },
    data: dadosDoEncontro(d),
  });
  return count > 0;
}

/**
 * Update condicional por `situacao IN de`. Cancelar grava o motivo; reabrir (para planejado)
 * limpa o motivo. P2002 (reabrir em horário ocupado) sobe para o chamador.
 */
export async function mudarSituacao(
  id: string,
  de: readonly SituacaoEncontro[],
  para: SituacaoEncontro,
  extras?: { motivoCancelamento?: string | null },
): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const motivo =
    para === "cancelado"
      ? { motivoCancelamento: extras?.motivoCancelamento ?? null }
      : para === "planejado"
        ? { motivoCancelamento: null }
        : {};
  const { count } = await prisma.encontro.updateMany({
    where: { id, situacao: { in: [...de] } },
    data: { situacao: para, ...motivo },
  });
  return count > 0;
}

/** Encontros não cancelados com o tema, só de turmas abertas, em ordem cronológica (8.3). */
export async function encontrosEquivalentes(temaId: string): Promise<EncontroEquivalente[]> {
  if (!UUID.test(temaId)) return [];
  const linhas = await prisma.encontro.findMany({
    where: { temaId, ...naoCancelado, turma: { encerradaEm: null } },
    select: {
      id: true,
      turmaId: true,
      data: true,
      horario: true,
      situacao: true,
      turma: { select: { nome: true } },
    },
    orderBy: [{ data: "asc" }, { horario: "asc" }],
  });
  return linhas.map((l) => ({
    id: l.id,
    turmaId: l.turmaId,
    turmaNome: l.turma.nome,
    data: paraCivil(l.data),
    horario: l.horario,
    situacao: l.situacao,
  }));
}
