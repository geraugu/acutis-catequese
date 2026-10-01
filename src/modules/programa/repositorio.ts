import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { SituacaoEncontro } from "./domain/encontro";
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
