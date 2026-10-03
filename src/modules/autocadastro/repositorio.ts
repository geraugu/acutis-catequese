import "server-only";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  SACRAMENTOS,
  type FichaDados,
  type Sacramento,
  type SacramentoFicha,
} from "@/modules/catequizandos/domain/ficha";
import type { Papel } from "@/modules/auth/domain/papeis";
import type { DiaSemana } from "@/modules/turmas/domain/turma";
import { avaliarLimite, type PoliticaLimite } from "./domain/limites";
import { normalizarEmail, normalizarTelefone, type Coincidente } from "./domain/avisos";

export interface LinkResumo {
  id: string;
  token: string;
  expiraEm: DataCivil | null;
  desativadoEm: Date | null;
  createdAt: Date;
  /** Fichas recebidas por este link ainda não revisadas (catequizando pendente). */
  pendentes: number;
}

/** Projeção pública: só o necessário para exibir a turma e calcular a situação (2.3). */
export interface LinkPublico {
  linkId: string;
  turmaId: string;
  desativadoEm: Date | null;
  expiraEm: DataCivil | null;
  turmaEncerrada: boolean;
  turma: { nome: string; diaSemana: DiaSemana; horario: string; local: string | null };
}

const paraDataCivil = (d: Date): DataCivil => d.toISOString().slice(0, 10) as DataCivil;
const paraDate = (d: DataCivil): Date => new Date(`${d}T00:00:00Z`);

/** O link ativo da turma ou, sem ativo, o mais recente (para exibir a situação). */
export async function obterLinkDaTurma(turmaId: string): Promise<LinkResumo | null> {
  const link = await prisma.linkAutocadastro.findFirst({
    where: { turmaId },
    orderBy: [{ desativadoEm: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    select: { id: true, token: true, expiraEm: true, desativadoEm: true, createdAt: true },
  });
  if (!link) return null;
  const pendentes = await prisma.fichaAutocadastro.count({
    where: { linkId: link.id, turmaId, revisadaEm: null, catequizando: { estado: "pendente" } },
  });
  return {
    ...link,
    expiraEm: link.expiraEm ? paraDataCivil(link.expiraEm) : null,
    pendentes,
  };
}

/** Lança P2002 se já existir link ativo na turma (índice único parcial, 1.3). */
export async function criarLink(turmaId: string, token: string, userId: string): Promise<void> {
  await prisma.linkAutocadastro.create({ data: { turmaId, token, criadoPorId: userId } });
}

export async function desativarLink(turmaId: string): Promise<boolean> {
  const r = await prisma.linkAutocadastro.updateMany({
    where: { turmaId, desativadoEm: null },
    data: { desativadoEm: new Date() },
  });
  return r.count > 0;
}

/** Desativa o link ativo e cria outro numa única transação (1.5). */
export async function regenerarLink(turmaId: string, token: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.linkAutocadastro.updateMany({
      where: { turmaId, desativadoEm: null },
      data: { desativadoEm: new Date() },
    });
    await tx.linkAutocadastro.create({ data: { turmaId, token, criadoPorId: userId } });
  });
}

export async function salvarExpiracao(turmaId: string, expiraEm: DataCivil | null): Promise<boolean> {
  const r = await prisma.linkAutocadastro.updateMany({
    where: { turmaId, desativadoEm: null },
    data: { expiraEm: expiraEm ? paraDate(expiraEm) : null },
  });
  return r.count > 0;
}

export async function obterLinkPublico(token: string): Promise<LinkPublico | null> {
  const link = await prisma.linkAutocadastro.findUnique({
    where: { token },
    select: {
      id: true,
      turmaId: true,
      desativadoEm: true,
      expiraEm: true,
      turma: {
        select: { nome: true, diaSemana: true, horario: true, local: true, encerradaEm: true },
      },
    },
  });
  if (!link) return null;
  const { encerradaEm, ...turma } = link.turma;
  return {
    linkId: link.id,
    turmaId: link.turmaId,
    desativadoEm: link.desativadoEm,
    expiraEm: link.expiraEm ? paraDataCivil(link.expiraEm) : null,
    turmaEncerrada: encerradaEm !== null,
    turma,
  };
}

/**
 * Conta uma tentativa na janela da chave, com a linha travada (`FOR UPDATE`) para que
 * envios concorrentes nunca excedam o máximo. Devolve `false` quando o limite é excedido.
 */
export async function registrarTentativa(
  chave: string,
  politica: PoliticaLimite,
  agora: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Garante a linha (janela já expirada) para que o FOR UPDATE sempre tenha o que travar.
    await tx.$executeRaw`
      INSERT INTO "limite_autocadastro" ("chave", "contagem", "janelaInicio")
      VALUES (${chave}, 0, to_timestamp(0))
      ON CONFLICT ("chave") DO NOTHING`;
    const [atual] = await tx.$queryRaw<{ contagem: number; janelaInicio: Date }[]>`
      SELECT "contagem", "janelaInicio" FROM "limite_autocadastro"
      WHERE "chave" = ${chave} FOR UPDATE`;
    const { permitido, proxima } = avaliarLimite(atual, agora, politica);
    if (permitido) {
      await tx.limiteAutocadastro.update({
        where: { chave },
        data: { contagem: proxima.contagem, janelaInicio: proxima.janelaInicio },
      });
    }
    return permitido;
  });
}

export type ResultadoTransicao = "ok" | "ja-revisada";

export interface Consentimento {
  em: Date;
  versao: string;
}

function dadosDaFicha(ficha: FichaDados) {
  return {
    nome: ficha.nome,
    dataNascimento: paraDate(ficha.dataNascimento),
    telefone: ficha.telefone,
    email: ficha.email ?? null,
    endereco: ficha.endereco ?? null,
    observacoes: ficha.observacoes ?? null,
  };
}

function sacramentosDaFicha(ficha: FichaDados) {
  return SACRAMENTOS.filter((s) => ficha.sacramentos[s].recebido).map((s) => {
    const { data, paroquia } = ficha.sacramentos[s];
    return { sacramento: s, data: data ? paraDate(data) : null, paroquia: paroquia ?? null };
  });
}

/** Ficha ainda em revisão: catequizando pendente com origem nesta turma e não revisada. */
const emRevisao = (catequizandoId: string, turmaId: string) => ({
  id: catequizandoId,
  estado: "pendente" as const,
  autocadastro: { is: { turmaId, revisadaEm: null } },
});

/** Cria catequizando pendente, sacramentos e origem numa única transação (3.5, 7.1). */
export async function criarFichaPendente(
  ficha: FichaDados,
  linkId: string,
  turmaId: string,
  consentimento: Consentimento,
): Promise<string> {
  const criado = await prisma.catequizando.create({
    data: {
      ...dadosDaFicha(ficha),
      estado: "pendente",
      sacramentos: { create: sacramentosDaFicha(ficha) },
      autocadastro: {
        create: {
          turmaId,
          linkId,
          consentidoEm: consentimento.em,
          versaoConsentimento: consentimento.versao,
        },
      },
    },
    select: { id: true },
  });
  return criado.id;
}

/**
 * `pendente → ativo` condicional (trava a linha do catequizando), inscrição com a entrada
 * informada e marca de revisão, tudo numa transação (5.5, 8.1). Concorrência: só uma vence.
 */
export async function confirmarComInscricao(
  catequizandoId: string,
  turmaId: string,
  entrada: DataCivil,
): Promise<ResultadoTransicao> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.catequizando.updateMany({
      where: emRevisao(catequizandoId, turmaId),
      data: { estado: "ativo" },
    });
    if (count === 0) return "ja-revisada";
    await tx.inscricao.create({
      data: { turmaId, catequizandoId, dataEntrada: paraDate(entrada) },
    });
    await tx.fichaAutocadastro.update({
      where: { catequizandoId },
      data: { revisadaEm: new Date() },
    });
    return "ok";
  });
}

/** Corrige dados e sacramentos da ficha pendente, mantendo estado e origem (7.5). */
export async function atualizarFichaPendente(
  catequizandoId: string,
  turmaId: string,
  ficha: FichaDados,
): Promise<ResultadoTransicao> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.catequizando.updateMany({
      where: emRevisao(catequizandoId, turmaId),
      data: dadosDaFicha(ficha),
    });
    if (count === 0) return "ja-revisada";
    await tx.sacramentoRecebido.deleteMany({ where: { catequizandoId } });
    await tx.sacramentoRecebido.createMany({
      data: sacramentosDaFicha(ficha).map((s) => ({ ...s, catequizandoId })),
    });
    return "ok";
  });
}

/** Exclui sacramentos, origem e catequizando de uma ficha pendente desta turma (8.1, 8.2). */
export async function descartar(
  catequizandoId: string,
  turmaId: string,
): Promise<ResultadoTransicao> {
  return prisma.$transaction(async (tx) => {
    // Trava a linha do catequizando primeiro (mesma ordem da confirmação) e valida a condição.
    const { count } = await tx.catequizando.updateMany({
      where: emRevisao(catequizandoId, turmaId),
      data: { estado: "pendente" },
    });
    if (count === 0) return "ja-revisada";
    await tx.sacramentoRecebido.deleteMany({ where: { catequizandoId } });
    await tx.fichaAutocadastro.delete({ where: { catequizandoId } });
    await tx.catequizando.delete({ where: { id: catequizandoId } });
    return "ok";
  });
}

// ---------------------------------------------------------------------------
// Leituras da revisão (5.1, 5.2, 5.3, 6.1–6.3). Nenhuma filtra turma aberta: a fila e o
// detalhe continuam legíveis em turma encerrada (8.4).
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pendentes do link na turma: origem nesta turma, não revisada, catequizando pendente. */
const pendentesDaTurma = (turmaId: string) => ({
  turmaId,
  revisadaEm: null,
  catequizando: { estado: "pendente" as const },
});

/**
 * Item da fila. Traz e-mail e telefone para quem chama calcular as coincidências com
 * `buscarCoincidencias` (que depende do revisor); a fila em si não as inclui.
 */
export interface ItemFila {
  catequizandoId: string;
  nome: string;
  recebidaEm: Date;
  email: string | null;
  telefone: string;
}

export interface FichaLinkDetalhe {
  catequizandoId: string;
  nome: string;
  dataNascimento: DataCivil;
  telefone: string;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  sacramentos: Record<Sacramento, SacramentoFicha>;
  consentidoEm: Date;
  versaoConsentimento: string;
  recebidaEm: Date;
}

export interface Revisor {
  papel: Papel;
  userId: string;
}

/** Fila da turma, da mais antiga para a mais recente (5.1). */
export async function listarFila(turmaId: string): Promise<ItemFila[]> {
  const linhas = await prisma.fichaAutocadastro.findMany({
    where: pendentesDaTurma(turmaId),
    orderBy: [{ recebidaEm: "asc" }, { catequizandoId: "asc" }],
    select: {
      catequizandoId: true,
      recebidaEm: true,
      catequizando: { select: { nome: true, email: true, telefone: true } },
    },
  });
  return linhas.map(({ catequizando, ...l }) => ({ ...l, ...catequizando }));
}

/** Ficha completa com o consentimento, ou null se não for pendente do link desta turma (5.2). */
export async function obterFichaLink(
  turmaId: string,
  catequizandoId: string,
): Promise<FichaLinkDetalhe | null> {
  if (!UUID.test(catequizandoId)) return null;
  const l = await prisma.fichaAutocadastro.findFirst({
    where: { catequizandoId, ...pendentesDaTurma(turmaId) },
    select: {
      consentidoEm: true,
      versaoConsentimento: true,
      recebidaEm: true,
      catequizando: { include: { sacramentos: true } },
    },
  });
  if (!l) return null;
  const c = l.catequizando;
  const sacramentos = {} as Record<Sacramento, SacramentoFicha>;
  for (const s of SACRAMENTOS) {
    const r = c.sacramentos.find((x) => x.sacramento === s);
    const sf: SacramentoFicha = { recebido: Boolean(r) };
    if (r?.data) sf.data = paraDataCivil(r.data);
    if (r?.paroquia) sf.paroquia = r.paroquia;
    sacramentos[s] = sf;
  }
  return {
    catequizandoId: c.id,
    nome: c.nome,
    dataNascimento: paraDataCivil(c.dataNascimento),
    telefone: c.telefone,
    email: c.email,
    endereco: c.endereco,
    observacoes: c.observacoes,
    sacramentos,
    consentidoEm: l.consentidoEm,
    versaoConsentimento: l.versaoConsentimento,
    recebidaEm: l.recebidaEm,
  };
}

/**
 * Catequizandos em qualquer estado com o mesmo e-mail ou telefone normalizados (6.1).
 * O telefone pode estar gravado formatado, então a normalização é feita no SQL com as
 * mesmas regras de `normalizarEmail`/`normalizarTelefone` (minúsculas sem espaços; só dígitos).
 * `visivel`: sempre para a coordenação; para o catequista, só se o coincidente tem inscrição
 * vigente numa turma em que ele tem designação vigente (6.2, 6.3).
 */
export async function buscarCoincidencias(
  email: string | null,
  telefone: string,
  ignorarId: string,
  revisor: Revisor,
): Promise<Coincidente[]> {
  const emailNorm = normalizarEmail(email);
  const telNorm = normalizarTelefone(telefone);
  if (emailNorm === null && telNorm === "") return [];
  const linhas = await prisma.$queryRaw<{ id: string; nome: string }[]>`
    SELECT "id", "nome" FROM "catequizando"
    WHERE "id" <> ${ignorarId}
      AND (
        (${emailNorm}::text IS NOT NULL
          AND lower(regexp_replace(coalesce("email", ''), '[[:space:]]', '', 'g')) = ${emailNorm}::text)
        OR (${telNorm}::text <> '' AND regexp_replace("telefone", '[^0-9]', '', 'g') = ${telNorm}::text)
      )
    ORDER BY "nome", "id"`;
  if (linhas.length === 0) return [];
  if (revisor.papel === "coordenacao") return linhas.map((l) => ({ ...l, visivel: true }));
  const visiveis = await prisma.inscricao.findMany({
    where: {
      catequizandoId: { in: linhas.map((l) => l.id) },
      dataSaida: null,
      turma: { designacoes: { some: { userId: revisor.userId, removidoEm: null } } },
    },
    select: { catequizandoId: true },
  });
  const ids = new Set(visiveis.map((v) => v.catequizandoId));
  return linhas.map((l) => ({ ...l, visivel: ids.has(l.id) }));
}

/** Pendentes por turma; turmas sem pendências ficam fora do mapa (5.3). */
export async function contarPendentesPorTurma(turmaIds: string[]): Promise<Map<string, number>> {
  if (turmaIds.length === 0) return new Map();
  const grupos = await prisma.fichaAutocadastro.groupBy({
    by: ["turmaId"],
    where: {
      turmaId: { in: turmaIds },
      revisadaEm: null,
      catequizando: { estado: "pendente" },
    },
    _count: { _all: true },
  });
  return new Map(grupos.map((g) => [g.turmaId, g._count._all]));
}
