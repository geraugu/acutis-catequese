"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireRole } from "@/modules/auth/dal";
import { chaveDoTitulo, criarTemaSchema, vizinhoParaMover } from "@/modules/programa/domain/tema";
import {
  type CodigoAviso,
  MSG_ERRO_INESPERADO,
  MSG_TEMA_EM_USO,
  MSG_TITULO_EM_USO,
} from "@/modules/programa/mensagens";
import {
  atualizarTema,
  chaveEmUso,
  criarTema,
  definirAtivo,
  excluirTema,
  listarTemas,
  obterTema,
  trocarPosicoes,
} from "@/modules/programa/repositorio";

export type EstadoPrograma = {
  errosCampos?: Partial<Record<string, string>>;
  erro?: string;
  valores?: Record<string, string>;
  temaRepetido?: { data: string }; // dd/mm/aaaa do encontro existente
};

const LISTA_TEMAS = "/coordenacao/programa";
const CAMPOS_TEMA = ["titulo", "descricao"];

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

function validarTema(dados: FormData) {
  const bruto: Record<string, unknown> = {};
  for (const campo of CAMPOS_TEMA) {
    const valor = dados.get(campo);
    if (typeof valor === "string") bruto[campo] = valor;
  }
  return criarTemaSchema().safeParse(bruto);
}

function codigoPrisma(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e && typeof e.code === "string") {
    return e.code;
  }
  return undefined;
}

function nomeDoErro(e: unknown): string {
  return e instanceof Error ? e.name : "desconhecido";
}

/** Criação (1.1, 2.1, 2.3, 2.4): entra ao fim da lista. */
export async function criarTemaAction(
  _anterior: EstadoPrograma,
  dados: FormData,
): Promise<EstadoPrograma> {
  await requireRole(["coordenacao"]); // 1.5: antes de qualquer leitura

  const valores = valoresDoFormulario(dados);
  const resultado = validarTema(dados);
  if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };

  const tema = resultado.data;
  try {
    if (await chaveEmUso(chaveDoTitulo(tema.titulo))) {
      return { errosCampos: { titulo: MSG_TITULO_EM_USO }, valores };
    }
    await criarTema(tema);
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { errosCampos: { titulo: MSG_TITULO_EM_USO }, valores };
    console.error("[programa] falha ao criar tema", { erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`${LISTA_TEMAS}?aviso=tema-criado`);
}

/** Edição (2.1, 2.3, 2.4, 2.5): a posição não muda. */
export async function editarTemaAction(
  id: string,
  _anterior: EstadoPrograma,
  dados: FormData,
): Promise<EstadoPrograma> {
  await requireRole(["coordenacao"]); // 1.5

  const valores = valoresDoFormulario(dados);
  try {
    // obterTema valida o UUID; atualizarTema lançaria com id inválido.
    if (!(await obterTema(id))) return { erro: MSG_ERRO_INESPERADO, valores };
    const resultado = validarTema(dados);
    if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };
    const tema = resultado.data;
    if (await chaveEmUso(chaveDoTitulo(tema.titulo), id)) {
      return { errosCampos: { titulo: MSG_TITULO_EM_USO }, valores };
    }
    await atualizarTema(id, tema);
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { errosCampos: { titulo: MSG_TITULO_EM_USO }, valores };
    console.error("[programa] falha ao editar tema", { id, erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`${LISTA_TEMAS}?aviso=alteracoes-salvas`);
}

/** Reordenação (2.6): troca com o vizinho ativo; no limite (ou id inválido) não faz nada. */
export async function moverTemaAction(id: string, direcao: "subir" | "descer"): Promise<void> {
  await requireRole(["coordenacao"]); // 1.5

  try {
    const vizinho = vizinhoParaMover(await listarTemas(), id, direcao);
    if (vizinho) await trocarPosicoes(id, vizinho.id);
  } catch (e) {
    console.error("[programa] falha ao mover tema", { id, erro: nomeDoErro(e) });
  }
  redirect(LISTA_TEMAS);
}

async function mudarAtivo(id: string, ativo: boolean, aviso: CodigoAviso): Promise<EstadoPrograma> {
  try {
    if (!(await definirAtivo(id, ativo))) return { erro: MSG_ERRO_INESPERADO };
  } catch (e) {
    console.error("[programa] falha ao mudar ativo do tema", { id, erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO };
  }
  redirect(`${LISTA_TEMAS}?aviso=${aviso}`);
}

/** Desativação (3.1): some da seleção, mantém o histórico. */
export async function desativarTemaAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoPrograma,
): Promise<EstadoPrograma> {
  await requireRole(["coordenacao"]); // 1.5
  return mudarAtivo(id, false, "tema-desativado");
}

/** Reativação (3.2). */
export async function reativarTemaAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoPrograma,
): Promise<EstadoPrograma> {
  await requireRole(["coordenacao"]); // 1.5
  return mudarAtivo(id, true, "tema-reativado");
}

/** Exclusão (3.3, 3.4): só tema nunca usado em encontro. */
export async function excluirTemaAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoPrograma,
): Promise<EstadoPrograma> {
  await requireRole(["coordenacao"]); // 1.5

  try {
    const resultado = await excluirTema(id);
    if (resultado === "em-uso") return { erro: MSG_TEMA_EM_USO };
    if (resultado === "inexistente") return { erro: MSG_ERRO_INESPERADO };
  } catch (e) {
    console.error("[programa] falha ao excluir tema", { id, erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO };
  }
  redirect(`${LISTA_TEMAS}?aviso=tema-excluido`);
}
