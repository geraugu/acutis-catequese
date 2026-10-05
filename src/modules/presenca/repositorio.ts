import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizarBusca } from "@/modules/compartilhado/busca";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";
import { numerarTemas } from "@/modules/programa/domain/tema";
import type { ModoChamada } from "./domain/chamada";
import type { TemaDoProgresso } from "@/modules/programa/domain/progresso";
import {
  contarPresencas,
  emAlerta,
  LIMITE_PADRAO,
  type ContagemFrequencia,
  type StatusPresenca,
} from "./domain/frequencia";

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

export interface ContagemPorCatequizando {
  catequizandoId: string;
  nome: string;
  contagem: ContagemFrequencia;
}

export interface Alerta {
  catequizandoId: string;
  nome: string;
  turmaId: string;
  turmaNome: string;
  contagem: ContagemFrequencia;
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

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

/** Presença que conta na frequência: encontro realizado e não visitante (5.3, 8.7). */
const PRESENCA_DE_FREQUENCIA = {
  visitante: false,
  encontro: { situacao: "realizado" },
} satisfies Prisma.PresencaWhereInput;

/** Contagem por encontro realizado da turma: inscritos e, à parte, o número de visitantes (6.3). */
export async function resumoPorEncontro(
  turmaId: string,
): Promise<Map<string, ContagemFrequencia & { visitantes: number }>> {
  const resumo = new Map<string, ContagemFrequencia & { visitantes: number }>();
  if (!UUID.test(turmaId)) return resumo;
  const linhas = await prisma.presenca.findMany({
    where: { encontro: { turmaId, situacao: "realizado" } },
    select: { encontroId: true, status: true, visitante: true },
  });
  const porEncontro = new Map<string, { status: StatusPresenca[]; visitantes: number }>();
  for (const l of linhas) {
    const acc = porEncontro.get(l.encontroId) ?? { status: [], visitantes: 0 };
    if (l.visitante) acc.visitantes += 1;
    else acc.status.push(l.status);
    porEncontro.set(l.encontroId, acc);
  }
  for (const [encontroId, acc] of porEncontro) {
    resumo.set(encontroId, { ...contarPresencas(acc.status), visitantes: acc.visitantes });
  }
  return resumo;
}

/**
 * Frequência por catequizando da turma, por nome (6.1). Só conta presenças registradas na
 * própria turma, então quem entrou depois só tem os encontros em que constava na chamada (5.2).
 * Turma aberta: os inscritos vigentes, mesmo sem presenças (contagem zerada). Turma encerrada
 * (consultável, 6.5): todos têm a inscrição encerrada, então entram os que tiveram inscrição
 * ou presença de inscrito na turma.
 */
export async function frequenciaDaTurma(turmaId: string): Promise<ContagemPorCatequizando[]> {
  if (!UUID.test(turmaId)) return [];
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { encerradaEm: true },
  });
  if (!turma) return [];
  const encerrada = turma.encerradaEm !== null;
  const [inscricoes, presencas] = await Promise.all([
    prisma.inscricao.findMany({
      where: { turmaId, ...(encerrada ? {} : { dataSaida: null }) },
      select: { catequizandoId: true, catequizando: { select: { nome: true } } },
    }),
    prisma.presenca.findMany({
      where: { turmaId, ...PRESENCA_DE_FREQUENCIA },
      select: {
        catequizandoId: true,
        status: true,
        catequizando: { select: { nome: true } },
      },
    }),
  ]);
  const nomes = new Map<string, string>();
  for (const i of inscricoes) nomes.set(i.catequizandoId, i.catequizando.nome);
  if (encerrada) for (const p of presencas) nomes.set(p.catequizandoId, p.catequizando.nome);
  const status = new Map<string, StatusPresenca[]>();
  for (const p of presencas) {
    if (!nomes.has(p.catequizandoId)) continue;
    status.set(p.catequizandoId, [...(status.get(p.catequizandoId) ?? []), p.status]);
  }
  return [...nomes]
    .map(([catequizandoId, nome]) => ({
      catequizandoId,
      nome,
      contagem: contarPresencas(status.get(catequizandoId) ?? []),
    }))
    .sort(porNome);
}

/** Uma entrada por turma com inscrição ou presença de inscrito; a atual primeiro, depois ciclo desc (5.6). */
export async function frequenciaPorTurma(catequizandoId: string): Promise<
  {
    turmaId: string;
    turmaNome: string;
    ciclo: number;
    atual: boolean;
    contagem: ContagemFrequencia;
  }[]
> {
  if (!UUID.test(catequizandoId)) return [];
  const [inscricoes, presencas] = await Promise.all([
    prisma.inscricao.findMany({
      where: { catequizandoId },
      select: {
        turmaId: true,
        dataSaida: true,
        turma: { select: { nome: true, ciclo: true, encerradaEm: true } },
      },
    }),
    prisma.presenca.findMany({
      where: { catequizandoId, ...PRESENCA_DE_FREQUENCIA },
      select: {
        turmaId: true,
        status: true,
        turma: { select: { nome: true, ciclo: true } },
      },
    }),
  ]);
  const turmas = new Map<string, { turmaNome: string; ciclo: number; atual: boolean }>();
  for (const i of inscricoes) {
    const vigenteEmAberta = i.dataSaida === null && i.turma.encerradaEm === null;
    const antes = turmas.get(i.turmaId);
    turmas.set(i.turmaId, {
      turmaNome: i.turma.nome,
      ciclo: i.turma.ciclo,
      atual: (antes?.atual ?? false) || vigenteEmAberta,
    });
  }
  for (const p of presencas) {
    if (!turmas.has(p.turmaId)) {
      turmas.set(p.turmaId, { turmaNome: p.turma.nome, ciclo: p.turma.ciclo, atual: false });
    }
  }
  return [...turmas]
    .map(([turmaId, t]) => ({
      turmaId,
      ...t,
      contagem: contarPresencas(
        presencas.filter((p) => p.turmaId === turmaId).map((p) => p.status),
      ),
    }))
    .sort((a, b) => Number(b.atual) - Number(a.atual) || b.ciclo - a.ciclo);
}

/** Presenças em encontros realizados, as mais recentes primeiro (5.7). */
export async function presencasDoCatequizando(catequizandoId: string): Promise<
  {
    data: DataCivil;
    turmaNome: string;
    temaTitulo: string | null;
    status: StatusPresenca;
    visitante: boolean;
  }[]
> {
  if (!UUID.test(catequizandoId)) return [];
  const linhas = await prisma.presenca.findMany({
    where: { catequizandoId, encontro: { situacao: "realizado" } },
    orderBy: [{ encontro: { data: "desc" } }, { encontro: { horario: "desc" } }],
    select: {
      status: true,
      visitante: true,
      encontro: {
        select: {
          data: true,
          turma: { select: { nome: true } },
          tema: { select: { titulo: true } },
        },
      },
    },
  });
  return linhas.map((l) => ({
    data: paraCivil(l.encontro.data),
    turmaNome: l.encontro.turma.nome,
    temaTitulo: l.encontro.tema?.titulo ?? null,
    status: l.status,
    visitante: l.visitante,
  }));
}

/** Presenças `presente` em encontro realizado com tema, como inscrito ou visitante (8.2, 8.4). */
export async function cumpridosDoCatequizando(
  catequizandoId: string,
): Promise<{ temaId: string; turmaNome: string; data: DataCivil; visitante: boolean }[]> {
  if (!UUID.test(catequizandoId)) return [];
  const linhas = await prisma.presenca.findMany({
    where: {
      catequizandoId,
      status: "presente",
      encontro: { situacao: "realizado", temaId: { not: null } },
    },
    select: {
      visitante: true,
      encontro: {
        select: { temaId: true, data: true, turma: { select: { nome: true } } },
      },
    },
  });
  return linhas.flatMap((l) =>
    l.encontro.temaId
      ? [
          {
            temaId: l.encontro.temaId,
            turmaNome: l.encontro.turma.nome,
            data: paraCivil(l.encontro.data),
            visitante: l.visitante,
          },
        ]
      : [],
  );
}

/** Temas ativos na ordem do programa, com o número (8.2). */
export async function temasAtivosNumerados(): Promise<TemaDoProgresso[]> {
  const temas = await prisma.tema.findMany({
    select: { id: true, titulo: true, ativo: true, posicao: true },
  });
  return numerarTemas(temas).flatMap((t) =>
    t.numero === null ? [] : [{ id: t.id, titulo: t.titulo, numero: t.numero }],
  );
}

/** Inscritos na data sem presença `presente` no tema, em qualquer turma, inclusive reposição (8.5). */
export async function inscritosSemOTema(
  turmaId: string,
  data: DataCivil,
  temaId: string,
): Promise<Elegivel[]> {
  if (!UUID.test(turmaId) || !UUID.test(temaId)) return [];
  const inscritos = await inscritosNaData(turmaId, data);
  if (inscritos.length === 0) return [];
  const cumpriram = await prisma.presenca.findMany({
    where: {
      catequizandoId: { in: inscritos.map((i) => i.catequizandoId) },
      status: "presente",
      encontro: { situacao: "realizado", temaId },
    },
    select: { catequizandoId: true },
  });
  const ids = new Set(cumpriram.map((c) => c.catequizandoId));
  return inscritos.filter((i) => !ids.has(i.catequizandoId));
}

/**
 * Baixa frequência: só inscrição vigente em turma aberta, restrita a `turmaIds` quando informado,
 * da menor frequência para a maior (7.6, 7.7, 9.3-9.5). Desligado ou inativado não aparece.
 */
export async function alertasDeFrequencia(
  turmaIds: readonly string[] | "todas",
  limite: number,
): Promise<Alerta[]> {
  const ids = turmaIds === "todas" ? null : turmaIds.filter((t) => UUID.test(t));
  if (ids && ids.length === 0) return [];
  const inscricoes = await prisma.inscricao.findMany({
    where: {
      dataSaida: null,
      turma: { encerradaEm: null },
      catequizando: { estado: "ativo" },
      ...(ids ? { turmaId: { in: ids } } : {}),
    },
    select: {
      catequizandoId: true,
      turmaId: true,
      turma: { select: { nome: true } },
      catequizando: { select: { nome: true } },
    },
  });
  if (inscricoes.length === 0) return [];
  const presencas = await prisma.presenca.findMany({
    where: {
      ...PRESENCA_DE_FREQUENCIA,
      turmaId: { in: [...new Set(inscricoes.map((i) => i.turmaId))] },
      catequizandoId: { in: [...new Set(inscricoes.map((i) => i.catequizandoId))] },
    },
    select: { turmaId: true, catequizandoId: true, status: true },
  });
  const status = new Map<string, StatusPresenca[]>();
  for (const p of presencas) {
    const chave = `${p.turmaId}:${p.catequizandoId}`;
    status.set(chave, [...(status.get(chave) ?? []), p.status]);
  }
  return inscricoes
    .map((i) => ({
      catequizandoId: i.catequizandoId,
      nome: i.catequizando.nome,
      turmaId: i.turmaId,
      turmaNome: i.turma.nome,
      contagem: contarPresencas(status.get(`${i.turmaId}:${i.catequizandoId}`) ?? []),
    }))
    .filter((a) => emAlerta(a.contagem, limite))
    .sort(
      (a, b) =>
        a.contagem.presentes / a.contagem.total - b.contagem.presentes / b.contagem.total ||
        porNome(a, b),
    );
}

/** Limite de baixa frequência (percentual); sem linha, vale o padrão (7.1, 7.11). */
export async function obterLimite(): Promise<number> {
  const linha = await prisma.limiteFrequencia.findUnique({
    where: { id: 1 },
    select: { percentual: true },
  });
  return linha?.percentual ?? LIMITE_PADRAO;
}

/** Linha única (id 1). Fora de 1 a 100 o CHECK do banco recusa; a validação amigável é da ação (7.2). */
export async function salvarLimite(percentual: number): Promise<void> {
  await prisma.limiteFrequencia.upsert({
    where: { id: 1 },
    create: { id: 1, percentual },
    update: { percentual },
  });
}

/** Turmas abertas com designação vigente do catequista; base de `turmasDoUsuario` (1.2, 7.7). */
export async function turmasAbertasDoCatequista(userId: string): Promise<string[]> {
  if (!userId) return [];
  const linhas = await prisma.designacao.findMany({
    where: { userId, removidoEm: null, turma: { encerradaEm: null } },
    select: { turmaId: true },
  });
  return [...new Set(linhas.map((l) => l.turmaId))];
}
