import "server-only";
import type { EstadoCatequizando, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { filtrarPorTermo } from "@/modules/compartilhado/busca";
import type { DataCivil } from "@/modules/compartilhado/datas";
import { ordenarTurmas, type DiaSemana, type TurmaDados } from "./domain/turma";
import type { MotivoSaida } from "./domain/inscricao";

export interface TurmaResumo {
  id: string;
  nome: string;
  ciclo: number;
  diaSemana: DiaSemana;
  horario: string;
  local: string | null;
  encerrada: boolean;
  catequistas: { id: string; nome: string }[];
  inscritosVigentes: number;
  vagas: number | null;
}

export interface InscritoResumo {
  inscricaoId: string;
  catequizandoId: string;
  nome: string;
  dataNascimento: DataCivil;
  telefone: string;
  dataEntrada: DataCivil;
  dataSaida: DataCivil | null;
  motivoSaida: MotivoSaida | null;
}

export interface TurmaDetalhe extends TurmaResumo {
  observacoes: string | null;
  encerradaEm: DataCivil | null;
  vigentes: InscritoResumo[];
  anteriores: InscritoResumo[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `@db.Date` é gravado à meia-noite UTC; o dia civil é a parte ISO. */
function paraData(data: DataCivil): Date {
  return new Date(`${data}T00:00:00Z`);
}

function paraDataCivil(data: Date): DataCivil {
  return data.toISOString().slice(0, 10) as DataCivil;
}

/** Só designações vigentes contam nas leituras. */
const selecaoResumo = {
  id: true,
  nome: true,
  ciclo: true,
  diaSemana: true,
  horario: true,
  local: true,
  vagas: true,
  encerradaEm: true,
  designacoes: {
    where: { removidoEm: null },
    orderBy: { user: { name: "asc" } },
    select: { user: { select: { id: true, name: true } } },
  },
  _count: { select: { inscricoes: { where: { dataSaida: null } } } },
} satisfies Prisma.TurmaSelect;

type LinhaResumo = Prisma.TurmaGetPayload<{ select: typeof selecaoResumo }>;

function paraResumo(l: LinhaResumo): TurmaResumo {
  return {
    id: l.id,
    nome: l.nome,
    ciclo: l.ciclo,
    diaSemana: l.diaSemana,
    horario: l.horario,
    local: l.local,
    encerrada: l.encerradaEm !== null,
    catequistas: l.designacoes.map((d) => ({ id: d.user.id, nome: d.user.name })),
    inscritosVigentes: l._count.inscricoes,
    vagas: l.vagas,
  };
}

/** Dia da semana, horário e nome (3.5), sem separar abertas e encerradas. */
function ordenar(turmas: TurmaResumo[]): TurmaResumo[] {
  return ordenarTurmas(turmas);
}

function dadosDaTurma(d: TurmaDados) {
  return {
    nome: d.nome,
    ciclo: d.ciclo,
    diaSemana: d.diaSemana,
    horario: d.horario,
    local: d.local ?? null,
    observacoes: d.observacoes ?? null,
    vagas: d.vagas ?? null,
  };
}

export async function listarTurmas(): Promise<TurmaResumo[]> {
  const linhas = await prisma.turma.findMany({ select: selecaoResumo });
  return ordenar(linhas.map(paraResumo));
}

export async function listarTurmasDoCatequista(userId: string): Promise<TurmaResumo[]> {
  const linhas = await prisma.turma.findMany({
    where: { encerradaEm: null, designacoes: { some: { userId, removidoEm: null } } },
    select: selecaoResumo,
  });
  return ordenar(linhas.map(paraResumo));
}

/** O id vem da URL: se não for UUID, é tratado como inexistente sem consultar. */
export async function obterTurma(id: string): Promise<TurmaDetalhe | null> {
  if (!UUID.test(id)) return null;
  const l = await prisma.turma.findUnique({
    where: { id },
    select: {
      ...selecaoResumo,
      observacoes: true,
      inscricoes: {
        orderBy: [{ catequizando: { nome: "asc" } }],
        select: {
          id: true,
          dataEntrada: true,
          dataSaida: true,
          motivoSaida: true,
          catequizando: {
            select: { id: true, nome: true, dataNascimento: true, telefone: true },
          },
        },
      },
    },
  });
  if (!l) return null;
  const inscritos: InscritoResumo[] = l.inscricoes.map((i) => ({
    inscricaoId: i.id,
    catequizandoId: i.catequizando.id,
    nome: i.catequizando.nome,
    dataNascimento: paraDataCivil(i.catequizando.dataNascimento),
    telefone: i.catequizando.telefone,
    dataEntrada: paraDataCivil(i.dataEntrada),
    dataSaida: i.dataSaida ? paraDataCivil(i.dataSaida) : null,
    motivoSaida: i.motivoSaida,
  }));
  return {
    ...paraResumo(l),
    observacoes: l.observacoes,
    encerradaEm: l.encerradaEm ? paraDataCivil(l.encerradaEm) : null,
    vigentes: inscritos.filter((i) => i.dataSaida === null),
    anteriores: inscritos
      .filter((i) => i.dataSaida !== null)
      .sort((a, b) => b.dataSaida!.localeCompare(a.dataSaida!)),
  };
}

/** Mesma regra do índice `turma_nome_aberta_unica`: lower(nome) + ciclo entre abertas. */
export async function nomeEmUso(nome: string, ciclo: number, ignorarId?: string): Promise<boolean> {
  // SQL cru com lower() (não ILIKE), para "_" e "%" no nome não virarem curingas.
  const linhas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM turma
    WHERE lower(nome) = lower(${nome.trim()}) AND ciclo = ${ciclo} AND "encerradaEm" IS NULL
      AND id <> ${ignorarId ?? ""}
    LIMIT 1`;
  return linhas.length > 0;
}

export async function criarTurma(d: TurmaDados): Promise<string> {
  const criada = await prisma.turma.create({ data: dadosDaTurma(d), select: { id: true } });
  return criada.id;
}

export async function atualizarTurma(id: string, d: TurmaDados): Promise<void> {
  await prisma.turma.update({ where: { id }, data: dadosDaTurma(d) });
}

/** Encerra e desliga todos os inscritos vigentes numa transação; devolve quantos. */
export async function encerrarTurma(id: string, hoje: DataCivil): Promise<number> {
  const data = paraData(hoje);
  const [, desligados] = await prisma.$transaction([
    prisma.turma.update({ where: { id }, data: { encerradaEm: data } }),
    prisma.inscricao.updateMany({
      where: { turmaId: id, dataSaida: null },
      data: { dataSaida: data, motivoSaida: "encerramento" },
    }),
  ]);
  return desligados.count;
}

/** Ativos (não banidos), papel catequista, sem designação vigente nesta turma. */
export async function catequistasElegiveis(
  turmaId: string,
): Promise<{ id: string; nome: string }[]> {
  const linhas = await prisma.user.findMany({
    where: {
      role: "catequista",
      OR: [{ banned: false }, { banned: null }],
      designacoes: { none: { turmaId, removidoEm: null } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return linhas.map((u) => ({ id: u.id, nome: u.name }));
}

/** Duplicidade vigente viola `designacao_vigente_unica` (P2002); o chamador converte. */
export async function designar(turmaId: string, userId: string): Promise<void> {
  await prisma.designacao.create({ data: { turmaId, userId } });
}

export async function removerDesignacao(turmaId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.designacao.updateMany({
    where: { turmaId, userId, removidoEm: null },
    data: { removidoEm: new Date() },
  });
  return count > 0;
}

export async function designadosVigentes(turmaId: string): Promise<string[]> {
  const linhas = await prisma.designacao.findMany({
    where: { turmaId, removidoEm: null },
    orderBy: { designadoEm: "asc" },
    select: { userId: true },
  });
  return linhas.map((l) => l.userId);
}

export interface CandidatoInscricao {
  id: string;
  nome: string;
  dataNascimento: DataCivil;
  turmaAtual: { id: string; nome: string } | null;
}

/** Só ativos; o termo casa sem caixa nem acentos (filtro em memória, como em catequizandos). */
export async function catequizandosParaInscricao(termo: string): Promise<CandidatoInscricao[]> {
  const linhas = await prisma.catequizando.findMany({
    where: { estado: "ativo" },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      dataNascimento: true,
      inscricoes: {
        where: { dataSaida: null },
        select: { turma: { select: { id: true, nome: true } } },
      },
    },
  });
  const candidatos = linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    dataNascimento: paraDataCivil(l.dataNascimento),
    turmaAtual: l.inscricoes[0]?.turma ?? null,
  }));
  return filtrarPorTermo(candidatos, termo, (c) => ({ textos: [c.nome] }));
}

/** Estado e nascimento para validar a inscrição; id não-UUID é tratado como inexistente. */
export async function obterCatequizandoParaInscricao(
  id: string,
): Promise<{ estado: EstadoCatequizando; dataNascimento: DataCivil } | null> {
  if (!UUID.test(id)) return null;
  const l = await prisma.catequizando.findUnique({
    where: { id },
    select: { estado: true, dataNascimento: true },
  });
  return l ? { estado: l.estado, dataNascimento: paraDataCivil(l.dataNascimento) } : null;
}

export async function inscricaoVigente(
  catequizandoId: string,
): Promise<{ id: string; turmaId: string; turmaNome: string; dataEntrada: DataCivil } | null> {
  const l = await prisma.inscricao.findFirst({
    where: { catequizandoId, dataSaida: null },
    select: { id: true, turmaId: true, dataEntrada: true, turma: { select: { nome: true } } },
  });
  if (!l) return null;
  return {
    id: l.id,
    turmaId: l.turmaId,
    turmaNome: l.turma.nome,
    dataEntrada: paraDataCivil(l.dataEntrada),
  };
}

/** Segunda inscrição vigente viola `inscricao_vigente_unica` (P2002); o chamador converte. */
export async function inscrever(
  turmaId: string,
  catequizandoId: string,
  entrada: DataCivil,
): Promise<void> {
  await prisma.inscricao.create({
    data: { turmaId, catequizandoId, dataEntrada: paraData(entrada) },
  });
}

/** Fecha a vigente (motivo transferencia) e abre a nova com a mesma data, numa transação. */
export async function transferir(
  turmaId: string,
  catequizandoId: string,
  data: DataCivil,
): Promise<void> {
  const d = paraData(data);
  await prisma.$transaction([
    prisma.inscricao.updateMany({
      where: { catequizandoId, dataSaida: null },
      data: { dataSaida: d, motivoSaida: "transferencia" },
    }),
    prisma.inscricao.create({ data: { turmaId, catequizandoId, dataEntrada: d } }),
  ]);
}

/** Encerra só a inscrição vigente; nunca exclui. */
export async function desligar(inscricaoId: string, saida: DataCivil): Promise<boolean> {
  const { count } = await prisma.inscricao.updateMany({
    where: { id: inscricaoId, dataSaida: null },
    data: { dataSaida: paraData(saida), motivoSaida: "desligamento" },
  });
  return count > 0;
}

export async function historicoDoCatequizando(catequizandoId: string): Promise<
  {
    turmaId: string;
    turmaNome: string;
    ciclo: number;
    dataEntrada: DataCivil;
    dataSaida: DataCivil | null;
    motivoSaida: MotivoSaida | null;
  }[]
> {
  const linhas = await prisma.inscricao.findMany({
    where: { catequizandoId },
    orderBy: { dataEntrada: "desc" },
    select: {
      turmaId: true,
      dataEntrada: true,
      dataSaida: true,
      motivoSaida: true,
      turma: { select: { nome: true, ciclo: true } },
    },
  });
  return linhas.map((l) => ({
    turmaId: l.turmaId,
    turmaNome: l.turma.nome,
    ciclo: l.turma.ciclo,
    dataEntrada: paraDataCivil(l.dataEntrada),
    dataSaida: l.dataSaida ? paraDataCivil(l.dataSaida) : null,
    motivoSaida: l.motivoSaida,
  }));
}

/** Catequistas com designação vigente em turmas onde o catequizando tem inscrição vigente. */
export async function catequistasDoCatequizando(catequizandoId: string): Promise<string[]> {
  const linhas = await prisma.designacao.findMany({
    where: {
      removidoEm: null,
      turma: { inscricoes: { some: { catequizandoId, dataSaida: null } } },
    },
    select: { userId: true },
  });
  return [...new Set(linhas.map((l) => l.userId))];
}
