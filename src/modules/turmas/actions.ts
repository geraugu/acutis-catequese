"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireRole } from "@/modules/auth/dal";
import { dataCivilSchema, type DataCivil, hojeCivil } from "@/modules/compartilhado/datas";
import { validarDataEntrada, validarDataSaida } from "@/modules/turmas/domain/inscricao";
import { criarTurmaSchema, estaLotada } from "@/modules/turmas/domain/turma";
import {
  MSG_CATEQUISTA_INDISPONIVEL,
  MSG_CATEQUIZANDO_INATIVO,
  MSG_ERRO_INESPERADO,
  MSG_JA_INSCRITO,
  MSG_NOME_EM_USO,
  MSG_TURMA_ENCERRADA,
} from "@/modules/turmas/mensagens";
import {
  atualizarTurma,
  catequistasElegiveis,
  criarTurma,
  designar,
  desligar,
  encerrarTurma,
  inscrever,
  inscricaoVigente,
  nomeEmUso,
  obterCatequizandoParaInscricao,
  obterTurma,
  removerDesignacao,
  transferir,
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

/** Página da turma (coordenação) ou de uma de suas abas (8.1, 8.2, 8.3). */
function paginaDaTurma(turmaId: string, aba?: "inscritos" | "equipe"): string {
  return `/coordenacao/turmas/${turmaId}${aba ? `/${aba}` : ""}`;
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
  redirect(`${paginaDaTurma(id)}?aviso=turma-criada`);
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
  redirect(`${paginaDaTurma(id)}?aviso=alteracoes-salvas`);
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
  redirect(`${paginaDaTurma(id)}?aviso=turma-encerrada`);
}

/** Designação (4.1, 4.3, 4.4, 8.3): só catequistas elegíveis; duplicidade concorrente vira o mesmo erro. */
export async function designarCatequistaAction(
  turmaId: string,
  _anterior: EstadoTurma,
  dados: FormData,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4

  const bruto = dados.get("userId");
  const userId = typeof bruto === "string" ? bruto : "";
  try {
    const atual = await obterTurma(turmaId);
    if (!atual) return { erro: MSG_ERRO_INESPERADO };
    if (atual.encerrada) return { erro: MSG_TURMA_ENCERRADA };
    const elegiveis = await catequistasElegiveis(turmaId);
    if (!userId || !elegiveis.some((c) => c.id === userId)) {
      return { erro: MSG_CATEQUISTA_INDISPONIVEL };
    }
    await designar(turmaId, userId);
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { erro: MSG_CATEQUISTA_INDISPONIVEL };
    console.error("[turmas] falha ao designar", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  redirect(`${paginaDaTurma(turmaId, "equipe")}?aviso=catequista-designado`);
}

/** Remoção de designação (4.2, 8.3): encerra a designação vigente, preservando o histórico. */
export async function removerCatequistaAction(
  turmaId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoTurma,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4

  try {
    const atual = await obterTurma(turmaId);
    if (!atual) return { erro: MSG_ERRO_INESPERADO };
    if (atual.encerrada) return { erro: MSG_TURMA_ENCERRADA };
    if (!(await removerDesignacao(turmaId, userId))) return { erro: MSG_ERRO_INESPERADO };
  } catch (e) {
    console.error("[turmas] falha ao remover designação", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  redirect(`${paginaDaTurma(turmaId, "equipe")}?aviso=catequista-removido`);
}

const DATA_INVALIDA = "Data inválida";

/** Data do formulário; vazia → hoje; malformada → null. */
function lerData(dados: FormData, campo: string, hoje: DataCivil): DataCivil | null {
  const bruto = dados.get(campo);
  if (typeof bruto !== "string" || bruto.trim() === "") return hoje;
  const r = dataCivilSchema.safeParse(bruto.trim());
  return r.success ? r.data : null;
}

/**
 * Inscrição (5.1, 5.3, 5.4, 5.5, 8.3, 11.5, 11.6): lotação é checada antes da transferência,
 * com confirmações separadas para os dois avisos aparecerem em sequência.
 */
export async function inscreverAction(
  turmaId: string,
  _anterior: EstadoTurma,
  dados: FormData,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4

  const valores = valoresDoFormulario(dados);
  const bruto = dados.get("catequizandoId");
  const catequizandoId = typeof bruto === "string" ? bruto : "";
  const confirmarTransferencia = dados.get("confirmarTransferencia") === "1";
  const confirmarLotacao = dados.get("confirmarLotacao") === "1";
  let aviso: "inscrito" | "transferido";
  try {
    const turma = await obterTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO, valores };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA, valores };
    const catequizando = await obterCatequizandoParaInscricao(catequizandoId);
    if (!catequizando || catequizando.estado !== "ativo") {
      return { erro: MSG_CATEQUIZANDO_INATIVO, valores };
    }
    const hoje = hojeCivil();
    const entrada = lerData(dados, "dataEntrada", hoje);
    if (!entrada || validarDataEntrada(entrada, catequizando.dataNascimento, hoje)) {
      return { errosCampos: { dataEntrada: DATA_INVALIDA }, valores };
    }
    const vigente = await inscricaoVigente(catequizandoId);
    if (vigente?.turmaId === turmaId) return { erro: MSG_JA_INSCRITO, valores };
    const inscritos = turma.vigentes.length;
    if (estaLotada(inscritos, turma.vagas) && !confirmarLotacao) {
      return { lotada: { inscritos, vagas: turma.vagas ?? 0 }, valores };
    }
    if (vigente && !confirmarTransferencia) {
      return { transferir: { turmaAtualNome: vigente.turmaNome }, valores };
    }
    if (vigente) {
      await transferir(turmaId, catequizandoId, entrada);
      aviso = "transferido";
    } else {
      await inscrever(turmaId, catequizandoId, entrada);
      aviso = "inscrito";
    }
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { erro: MSG_JA_INSCRITO, valores };
    console.error("[turmas] falha ao inscrever", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`${paginaDaTurma(turmaId, "inscritos")}?aviso=${aviso}`);
}

/** Desligamento (6.1, 6.3, 8.3): só a inscrição vigente desta turma; nunca exclui. */
export async function desligarAction(
  turmaId: string,
  inscricaoId: string,
  _anterior: EstadoTurma,
  dados: FormData,
): Promise<EstadoTurma> {
  await requireRole(["coordenacao"]); // 1.4

  const valores = valoresDoFormulario(dados);
  try {
    const turma = await obterTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO, valores };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA, valores };
    const inscricao = turma.vigentes.find((i) => i.inscricaoId === inscricaoId);
    if (!inscricao) return { erro: MSG_ERRO_INESPERADO, valores };
    const hoje = hojeCivil();
    const saida = lerData(dados, "dataSaida", hoje);
    if (!saida || validarDataSaida(saida, inscricao.dataEntrada, hoje)) {
      return { errosCampos: { dataSaida: DATA_INVALIDA }, valores };
    }
    if (!(await desligar(inscricaoId, saida))) return { erro: MSG_ERRO_INESPERADO, valores };
  } catch (e) {
    console.error("[turmas] falha ao desligar", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`${paginaDaTurma(turmaId, "inscritos")}?aviso=desligado`);
}
