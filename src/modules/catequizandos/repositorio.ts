import "server-only";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { EstadoCatequizando } from "./domain/estado";
import {
  SACRAMENTOS,
  type FichaDados,
  type Sacramento,
  type SacramentoFicha,
} from "./domain/ficha";

export interface CatequizandoResumo {
  id: string;
  nome: string;
  dataNascimento: DataCivil;
  telefone: string;
  email: string | null;
  estado: EstadoCatequizando;
  sacramentosRecebidos: Sacramento[];
}

export interface CatequizandoDetalhe extends CatequizandoResumo {
  endereco: string | null;
  observacoes: string | null;
  criadoEm: Date;
  sacramentos: Record<Sacramento, SacramentoFicha>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `@db.Date` é gravado à meia-noite UTC; o dia civil é a parte ISO. */
function paraData(data: DataCivil): Date {
  return new Date(`${data}T00:00:00Z`);
}

function paraDataCivil(data: Date): DataCivil {
  return data.toISOString().slice(0, 10) as DataCivil;
}

function recebidos(sacramentos: { sacramento: Sacramento }[]): Sacramento[] {
  const presentes = new Set(sacramentos.map((s) => s.sacramento));
  return SACRAMENTOS.filter((s) => presentes.has(s));
}

function dadosDaFicha(ficha: FichaDados) {
  return {
    nome: ficha.nome,
    dataNascimento: paraData(ficha.dataNascimento),
    telefone: ficha.telefone,
    email: ficha.email ?? null,
    endereco: ficha.endereco ?? null,
    observacoes: ficha.observacoes ?? null,
  };
}

function sacramentosDaFicha(ficha: FichaDados) {
  return SACRAMENTOS.filter((s) => ficha.sacramentos[s].recebido).map((s) => {
    const { data, paroquia } = ficha.sacramentos[s];
    return { sacramento: s, data: data ? paraData(data) : null, paroquia: paroquia ?? null };
  });
}

export async function listarCatequizandos(): Promise<CatequizandoResumo[]> {
  const linhas = await prisma.catequizando.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      dataNascimento: true,
      telefone: true,
      email: true,
      estado: true,
      sacramentos: { select: { sacramento: true } },
    },
  });
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    dataNascimento: paraDataCivil(l.dataNascimento),
    telefone: l.telefone,
    email: l.email,
    estado: l.estado,
    sacramentosRecebidos: recebidos(l.sacramentos),
  }));
}

/** O id vem da URL: se não for UUID, é tratado como inexistente sem consultar. */
export async function obterCatequizando(id: string): Promise<CatequizandoDetalhe | null> {
  if (!UUID.test(id)) return null;
  const l = await prisma.catequizando.findUnique({
    where: { id },
    include: { sacramentos: true },
  });
  if (!l) return null;
  const sacramentos = {} as Record<Sacramento, SacramentoFicha>;
  for (const s of SACRAMENTOS) {
    const r = l.sacramentos.find((x) => x.sacramento === s);
    const ficha: SacramentoFicha = { recebido: Boolean(r) };
    if (r?.data) ficha.data = paraDataCivil(r.data);
    if (r?.paroquia) ficha.paroquia = r.paroquia;
    sacramentos[s] = ficha;
  }
  return {
    id: l.id,
    nome: l.nome,
    dataNascimento: paraDataCivil(l.dataNascimento),
    telefone: l.telefone,
    email: l.email,
    estado: l.estado,
    sacramentosRecebidos: recebidos(l.sacramentos),
    endereco: l.endereco,
    observacoes: l.observacoes,
    criadoEm: l.createdAt,
    sacramentos,
  };
}

export async function criarCatequizando(
  ficha: FichaDados,
  estado: EstadoCatequizando,
): Promise<string> {
  const criado = await prisma.catequizando.create({
    data: {
      ...dadosDaFicha(ficha),
      estado,
      sacramentos: { create: sacramentosDaFicha(ficha) },
    },
    select: { id: true },
  });
  return criado.id;
}

/** Atualiza os dados e substitui os sacramentos numa única transação. */
export async function atualizarFicha(id: string, ficha: FichaDados): Promise<void> {
  await prisma.$transaction([
    prisma.catequizando.update({ where: { id }, data: dadosDaFicha(ficha) }),
    prisma.sacramentoRecebido.deleteMany({ where: { catequizandoId: id } }),
    prisma.sacramentoRecebido.createMany({
      data: sacramentosDaFicha(ficha).map((s) => ({ ...s, catequizandoId: id })),
    }),
  ]);
}

/** Condição no `where` evita corrida entre transições; false se não mudou. */
export async function mudarEstado(
  id: string,
  de: EstadoCatequizando,
  para: EstadoCatequizando,
): Promise<boolean> {
  const { count } = await prisma.catequizando.updateMany({
    where: { id, estado: de },
    data: { estado: para },
  });
  return count === 1;
}

export async function contarPendentes(): Promise<number> {
  return prisma.catequizando.count({ where: { estado: "pendente" } });
}
