import "server-only";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { DiaSemana } from "@/modules/turmas/domain/turma";
import { avaliarLimite, type PoliticaLimite } from "./domain/limites";

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
