import { prisma } from "@/lib/prisma";
import { chaveDoTitulo } from "@/modules/programa/domain/tema";
import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";

/** Data civil para coluna `@db.Date` (meia-noite UTC). */
export const dia = (d: string): Date => new Date(`${d}T00:00:00Z`);

export async function criarTemaDireto(
  titulo: string,
  extra: { posicao?: number; ativo?: boolean; descricao?: string } = {},
): Promise<string> {
  const posicao =
    extra.posicao ??
    ((await prisma.tema.aggregate({ _max: { posicao: true } }))._max.posicao ?? 0) + 1;
  const t = await prisma.tema.create({
    data: {
      titulo,
      chave: chaveDoTitulo(titulo),
      descricao: extra.descricao ?? null,
      posicao,
      ativo: extra.ativo ?? true,
    },
    select: { id: true },
  });
  return t.id;
}

export async function criarTurmaDireta(
  extra: { nome?: string; horario?: string; encerradaEm?: string } = {},
): Promise<string> {
  const t = await prisma.turma.create({
    data: {
      nome: extra.nome ?? "Turma São José",
      ciclo: 2026,
      diaSemana: "sabado",
      horario: extra.horario ?? "09:00",
      encerradaEm: extra.encerradaEm ? dia(extra.encerradaEm) : null,
    },
    select: { id: true },
  });
  return t.id;
}

export async function criarEncontroDireto(
  turmaId: string,
  extra: {
    data?: string;
    horario?: string;
    temaId?: string | null;
    situacao?: SituacaoEncontro;
    motivoCancelamento?: string | null;
  } = {},
): Promise<string> {
  const e = await prisma.encontro.create({
    data: {
      turmaId,
      temaId: extra.temaId ?? null,
      data: dia(extra.data ?? "2026-09-05"),
      horario: extra.horario ?? "09:00",
      situacao: extra.situacao ?? "planejado",
      motivoCancelamento: extra.motivoCancelamento ?? null,
    },
    select: { id: true },
  });
  return e.id;
}
