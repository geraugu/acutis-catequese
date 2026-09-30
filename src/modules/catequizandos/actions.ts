"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireRole } from "@/modules/auth/dal";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { encontrarDuplicado } from "@/modules/catequizandos/domain/duplicidade";
import {
  campoDoFormulario,
  criarFichaSchema,
  lerFichaDoFormulario,
  type FichaDados,
} from "@/modules/catequizandos/domain/ficha";
import { transicao, type Operacao } from "@/modules/catequizandos/domain/estado";
import {
  MSG_ERRO_INESPERADO,
  MSG_FICHA_INVALIDA,
  MSG_TRANSICAO_INVALIDA,
  type CodigoAviso,
} from "@/modules/catequizandos/mensagens";
import {
  atualizarFicha,
  criarCatequizando,
  listarCatequizandos,
  mudarEstado,
  obterCatequizando,
  type CatequizandoDetalhe,
} from "@/modules/catequizandos/repositorio";

export type EstadoFicha = {
  errosCampos?: Partial<Record<string, string>>;
  erro?: string;
  /** Campos planos do formulário para reapresentação (checkbox marcado = "on"). */
  valores?: Record<string, string>;
  duplicado?: { id: string; nome: string };
};

/** Controle do formulário, não é dado da ficha. */
const CAMPO_CONFIRMAR = "confirmarDuplicidade";

function valoresDoFormulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (typeof valor === "string" && campo !== CAMPO_CONFIRMAR && !campo.startsWith("$")) {
      valores[campo] = valor;
    }
  }
  return valores;
}

function errosPorCampo(error: z.ZodError): Partial<Record<string, string>> {
  const errosCampos: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const campo = campoDoFormulario(issue.path);
    if (campo && !errosCampos[campo]) errosCampos[campo] = issue.message;
  }
  return errosCampos;
}

function validarFicha(dados: FormData) {
  return criarFichaSchema({ hoje: hojeCivil() }).safeParse(lerFichaDoFormulario(dados));
}

/** Cadastro pela coordenação (2.1, 2.3, 2.8, 4.1–4.3, 6.4): grava ativo. */
export async function criarCatequizandoAction(
  _anterior: EstadoFicha,
  dados: FormData,
): Promise<EstadoFicha> {
  await requireRole(["coordenacao"]); // 1.3: antes de qualquer leitura

  const valores = valoresDoFormulario(dados);
  const resultado = validarFicha(dados);
  if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };

  const ficha = resultado.data;
  let id: string;
  try {
    if (dados.get(CAMPO_CONFIRMAR) !== "1") {
      const duplicado = encontrarDuplicado(
        await listarCatequizandos(),
        ficha.nome,
        ficha.dataNascimento,
      );
      if (duplicado) return { duplicado: { id: duplicado.id, nome: duplicado.nome }, valores };
    }
    id = await criarCatequizando(ficha, "ativo");
  } catch (e) {
    console.error("[catequizandos] falha ao cadastrar", {
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`/coordenacao/catequizandos/${id}?aviso=cadastrado`);
}

/** Edição da ficha (6.3, 8.4): não muda o estado nem checa duplicidade. */
export async function editarCatequizandoAction(
  id: string,
  _anterior: EstadoFicha,
  dados: FormData,
): Promise<EstadoFicha> {
  await requireRole(["coordenacao"]); // 1.3

  const valores = valoresDoFormulario(dados);
  try {
    if (!(await obterCatequizando(id))) return { erro: MSG_ERRO_INESPERADO, valores };
    const resultado = validarFicha(dados);
    if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };
    await atualizarFicha(id, resultado.data);
  } catch (e) {
    console.error("[catequizandos] falha ao editar", {
      id,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`/coordenacao/catequizandos/${id}?aviso=alteracoes-salvas`);
}

const AVISO_DA_OPERACAO: Record<Operacao, CodigoAviso> = {
  inativar: "inativado",
  reativar: "reativado",
  confirmar: "ficha-confirmada",
  recusar: "ficha-recusada",
};

/** Ficha gravada no formato do schema (revalidação na confirmação, 8.2). */
function fichaGravada(c: CatequizandoDetalhe): FichaDados {
  return {
    nome: c.nome,
    dataNascimento: c.dataNascimento,
    telefone: c.telefone,
    email: c.email ?? undefined,
    endereco: c.endereco ?? undefined,
    observacoes: c.observacoes ?? undefined,
    sacramentos: c.sacramentos,
  };
}

/** Fluxo comum das transições (7.2, 7.4, 7.5, 8.1–8.3). */
async function executarTransicao(id: string, op: Operacao): Promise<EstadoFicha> {
  await requireRole(["coordenacao"]); // 1.3: antes de qualquer leitura

  try {
    const atual = await obterCatequizando(id);
    if (!atual) return { erro: MSG_ERRO_INESPERADO };
    const novo = transicao(atual.estado, op);
    if (!novo) return { erro: MSG_TRANSICAO_INVALIDA };
    if (
      op === "confirmar" &&
      !criarFichaSchema({ hoje: hojeCivil() }).safeParse(fichaGravada(atual)).success
    ) {
      return { erro: MSG_FICHA_INVALIDA };
    }
    if (!(await mudarEstado(id, atual.estado, novo))) return { erro: MSG_TRANSICAO_INVALIDA };
  } catch (e) {
    console.error(`[catequizandos] falha ao ${op}`, {
      id,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`/coordenacao/catequizandos/${id}?aviso=${AVISO_DA_OPERACAO[op]}`);
}

export async function inativarCatequizandoAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoFicha,
): Promise<EstadoFicha> {
  return executarTransicao(id, "inativar");
}

export async function reativarCatequizandoAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoFicha,
): Promise<EstadoFicha> {
  return executarTransicao(id, "reativar");
}

/** Confirmação da ficha pendente: revalida a ficha gravada antes de ativar (8.1, 8.2). */
export async function confirmarFichaAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoFicha,
): Promise<EstadoFicha> {
  return executarTransicao(id, "confirmar");
}

/** Recusa: a ficha fica inativa, a linha não é excluída (8.3, 7.5). */
export async function recusarFichaAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoFicha,
): Promise<EstadoFicha> {
  return executarTransicao(id, "recusar");
}
