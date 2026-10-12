import { prisma } from "@/lib/prisma";
import type { SituacaoReserva } from "@/generated/prisma/client";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers";

export {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTemaDireto,
  criarTurmaDireta,
};

/** Encontro realizado da turma, com tema (a "origem" da reposição). */
export async function criarEncontroRealizadoDireto(
  turmaId: string,
  temaId: string | null,
  data = "2026-09-05",
): Promise<string> {
  return criarEncontroDireto(turmaId, { data, temaId, situacao: "realizado" });
}

/** Encontro planejado da turma, com tema (o "destino" possível da reposição). */
export async function criarEncontroPlanejadoDireto(
  turmaId: string,
  temaId: string | null,
  data = "2026-09-12",
): Promise<string> {
  return criarEncontroDireto(turmaId, { data, temaId, situacao: "planejado" });
}

export async function criarReservaDireta(dados: {
  catequizandoId: string;
  temaId: string;
  encontroId: string;
  turmaOrigemId: string;
  situacao?: SituacaoReserva;
  criadoPorId?: string;
  motivoCancelamento?: string | null;
}): Promise<string> {
  const r = await prisma.reservaReposicao.create({
    data: {
      catequizandoId: dados.catequizandoId,
      temaId: dados.temaId,
      encontroId: dados.encontroId,
      turmaOrigemId: dados.turmaOrigemId,
      criadoPorId: dados.criadoPorId ?? "usuario-teste",
      situacao: dados.situacao ?? "reservada",
      motivoCancelamento: dados.motivoCancelamento ?? null,
    },
    select: { id: true },
  });
  return r.id;
}
