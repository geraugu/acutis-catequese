import { prisma } from "@/lib/prisma";
import type { StatusPresenca } from "@/generated/prisma/client";
import { dia } from "../programa/helpers";

export { criarEncontroDireto, criarTemaDireto, criarTurmaDireta, dia } from "../programa/helpers";

export async function criarCatequizandoDireto(
  extra: { nome?: string; estado?: "ativo" | "inativo" } = {},
): Promise<string> {
  const c = await prisma.catequizando.create({
    data: {
      nome: extra.nome ?? "Maria da Silva",
      dataNascimento: dia("2015-03-10"),
      telefone: "11999990000",
      ...(extra.estado ? { estado: extra.estado } : {}),
    },
    select: { id: true },
  });
  return c.id;
}

export async function criarInscricaoDireta(
  turmaId: string,
  catequizandoId: string,
  extra: { dataEntrada?: string; dataSaida?: string | null } = {},
): Promise<string> {
  const i = await prisma.inscricao.create({
    data: {
      turmaId,
      catequizandoId,
      dataEntrada: dia(extra.dataEntrada ?? "2026-02-01"),
      dataSaida: extra.dataSaida ? dia(extra.dataSaida) : null,
    },
    select: { id: true },
  });
  return i.id;
}

export async function criarPresencaDireta(dados: {
  encontroId: string;
  turmaId: string;
  catequizandoId: string;
  status?: StatusPresenca;
  visitante?: boolean;
  turmaOrigemId?: string | null;
}): Promise<string> {
  const p = await prisma.presenca.create({
    data: {
      encontroId: dados.encontroId,
      turmaId: dados.turmaId,
      catequizandoId: dados.catequizandoId,
      status: dados.status ?? "presente",
      visitante: dados.visitante ?? false,
      turmaOrigemId: dados.turmaOrigemId ?? null,
    },
    select: { id: true },
  });
  return p.id;
}
