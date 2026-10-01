"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireRole } from "@/modules/auth/dal";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { criarTurmaSchema } from "@/modules/turmas/domain/turma";
import {
  MSG_ERRO_INESPERADO,
  MSG_NOME_EM_USO,
  MSG_TURMA_ENCERRADA,
} from "@/modules/turmas/mensagens";
import {
  atualizarTurma,
  criarTurma,
  encerrarTurma,
  nomeEmUso,
  obterTurma,
} from "@/modules/turmas/repositorio";

export type EstadoTurma = {
  errosCampos?: Partial<Record<string, string>>;
  erro?: string;
  valores?: Record<string, string>;
  transferir?: { turmaAtualNome: string };
  lotada?: { inscritos: number; vagas: number };
};

const CAMPOS_TURMA = ["nome", "ciclo", "diaSemana", "horario", "local", "observacoes", "vagas"];

function valoresDoFormulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (typeof valor === "string" && !campo.startsWith("$")) valores[campo] = valor;
  }
  return valores;
}

function errosPorCampo(error: z.ZodError): Partial<Record<string, string>> {
  const errosCampos: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const campo = issue.path[0];
    if (typeof campo === "string" && !errosCampos[campo]) errosCampos[campo] = issue.message;
  }
  return errosCampos;
}

function validarTurma(dados: FormData) {
  const bruto: Record<string, unknown> = {};
  for (const campo of CAMPOS_TURMA) {
    const valor = dados.get(campo);
    if (typeof valor === "string") bruto[campo] = valor;
  }
  const anoAtual = Number(hojeCivil().slice(0, 4)); // ano corrente em São Paulo
  return criarTurmaSchema({ anoAtual }).safeParse(bruto);
}

function codigoPrisma(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e && typeof e.code === "string") {
    return e.code;
  }
  return undefined;
}

/** Criação (1.1, 2.1, 2.3, 2.4). */
export async function criarTurmaAction(
  _anterior: EstadoTurma,
  dados: FormData,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4: antes de qualquer leitura

  const valores = valoresDoFormulario(dados);
  const resultado = validarTurma(dados);
  if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };

  const turma = resultado.data;
  let id: string;
  try {
    if (await nomeEmUso(turma.nome, turma.ciclo)) {
      return { errosCampos: { nome: MSG_NOME_EM_USO }, valores };
    }
    id = await criarTurma(turma);
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { errosCampos: { nome: MSG_NOME_EM_USO }, valores };
    console.error("[turmas] falha ao criar", {
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`/coordenacao/turmas/${id}?aviso=turma-criada`);
}

/** Edição (2.1, 2.3, 2.5, 8.3): reduzir vagas abaixo dos inscritos é permitido. */
export async function editarTurmaAction(
  id: string,
  _anterior: EstadoTurma,
  dados: FormData,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4

  const valores = valoresDoFormulario(dados);
  try {
    const atual = await obterTurma(id);
    if (!atual) return { erro: MSG_ERRO_INESPERADO, valores };
    if (atual.encerrada) return { erro: MSG_TURMA_ENCERRADA, valores };
    const resultado = validarTurma(dados);
    if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };
    const turma = resultado.data;
    if (await nomeEmUso(turma.nome, turma.ciclo, id)) {
      return { errosCampos: { nome: MSG_NOME_EM_USO }, valores };
    }
    await atualizarTurma(id, turma);
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { errosCampos: { nome: MSG_NOME_EM_USO }, valores };
    console.error("[turmas] falha ao editar", {
      id,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`/coordenacao/turmas/${id}?aviso=alteracoes-salvas`);
}

/** Encerramento (8.1, 8.3, 11.7): desliga todos os inscritos vigentes com a data de hoje. */
export async function encerrarTurmaAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoTurma,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4

  try {
    const atual = await obterTurma(id);
    if (!atual) return { erro: MSG_ERRO_INESPERADO };
    if (atual.encerrada) return { erro: MSG_TURMA_ENCERRADA };
    await encerrarTurma(id, hojeCivil());
  } catch (e) {
    console.error("[turmas] falha ao encerrar", {
      id,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  redirect(`/coordenacao/turmas/${id}?aviso=turma-encerrada`);
}
