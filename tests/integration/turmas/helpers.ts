import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TurmaDados } from "@/modules/turmas/domain/turma";
import type { MotivoSaida } from "@/modules/turmas/domain/inscricao";

/** Data civil para coluna `@db.Date` (meia-noite UTC). */
export const dia = (d: string): Date => new Date(`${d}T00:00:00Z`);

export async function criarUsuarioDireto(
  nome: string,
  opcoes: { role?: string | null; banned?: boolean } = {},
): Promise<string> {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: nome,
      email: `${id}@exemplo.com`,
      role: opcoes.role === undefined ? "catequista" : opcoes.role,
      banned: opcoes.banned ?? false,
    },
  });
  return id;
}

export async function criarCatequizandoDireto(
  nome: string,
  extra: { dataNascimento?: string; telefone?: string } = {},
): Promise<string> {
  const c = await prisma.catequizando.create({
    data: {
      nome,
      dataNascimento: dia(extra.dataNascimento ?? "2010-03-04"),
      telefone: extra.telefone ?? "11987654321",
      estado: "ativo",
    },
    select: { id: true },
  });
  return c.id;
}

export const dadosTurma = (extra: Partial<TurmaDados> = {}): TurmaDados => ({
  nome: "Turma São José",
  ciclo: 2026,
  diaSemana: "sabado",
  horario: "09:00",
  ...extra,
});

export async function criarTurmaDireta(
  extra: Partial<TurmaDados> & { encerradaEm?: string } = {},
): Promise<string> {
  const { encerradaEm, ...dados } = extra;
  const t = await prisma.turma.create({
    data: { ...dadosTurma(dados), encerradaEm: encerradaEm ? dia(encerradaEm) : null },
    select: { id: true },
  });
  return t.id;
}

export async function inscreverDireto(
  turmaId: string,
  catequizandoId: string,
  entrada: string,
  saida?: { data: string; motivo: MotivoSaida },
): Promise<string> {
  const i = await prisma.inscricao.create({
    data: {
      turmaId,
      catequizandoId,
      dataEntrada: dia(entrada),
      dataSaida: saida ? dia(saida.data) : null,
      motivoSaida: saida?.motivo ?? null,
    },
    select: { id: true },
  });
  return i.id;
}
