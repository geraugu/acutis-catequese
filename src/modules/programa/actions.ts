"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireRole } from "@/modules/auth/dal";
import { type DataCivil, formatarData, hojeCivil } from "@/modules/compartilhado/datas";
import {
  baseValida,
  criarEncontroSchema,
  motivoSchema,
  podeEditar,
  TRANSICOES,
  validarRealizacao,
} from "@/modules/programa/domain/encontro";
import { chaveDoTitulo, criarTemaSchema, vizinhoParaMover } from "@/modules/programa/domain/tema";
import {
  type CodigoAviso,
  MSG_CONFLITO_HORARIO,
  MSG_ERRO_INESPERADO,
  MSG_SITUACAO_MUDOU,
  MSG_SO_PLANEJADO,
  MSG_TEMA_EM_USO,
  MSG_TEMA_INDISPONIVEL,
  MSG_TITULO_EM_USO,
  MSG_TURMA_ENCERRADA,
} from "@/modules/programa/mensagens";
import {
  atualizarEncontro,
  atualizarTema,
  chaveEmUso,
  conflitoDeHorario,
  criarEncontro,
  criarTema,
  dadosDaTurma,
  encontroComMesmoTema,
  mudarSituacao,
  obterEncontro,
  definirAtivo,
  excluirTema,
  listarTemas,
  obterTema,
  trocarPosicoes,
} from "@/modules/programa/repositorio";
import { podeVerTurma } from "@/modules/turmas/acesso";

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

// ---------------------------------------------------------------- encontros

const CAMPOS_ENCONTRO = ["data", "horario", "temaId", "observacoes"];

/** requireRole (aceita a coordenação) e depois podeVerTurma (1.3, 1.4). */
async function exigirAcessoATurma(turmaId: string): Promise<void> {
  const sessao = await requireRole(["catequista"]);
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
}

function validarEncontro(dados: FormData, horarioDaTurma: string) {
  const bruto: Record<string, unknown> = {};
  for (const campo of CAMPOS_ENCONTRO) {
    const valor = dados.get(campo);
    if (typeof valor === "string") bruto[campo] = valor;
  }
  if (typeof bruto.horario !== "string" || bruto.horario.trim() === "") {
    bruto.horario = horarioDaTurma;
  }
  return criarEncontroSchema().safeParse(bruto);
}

/** Regras comuns a criar/editar; null quando pode gravar. */
async function checarRegrasEncontro(
  turmaId: string,
  dados: FormData,
  valores: Record<string, string>,
  horarioDaTurma: string,
  editando?: { id: string; temaAtualId: string | null },
) {
  const resultado = validarEncontro(dados, horarioDaTurma);
  if (!resultado.success) {
    return { estado: { errosCampos: errosPorCampo(resultado.error), valores } as EstadoPrograma };
  }
  const encontro = resultado.data;
  if (encontro.temaId && encontro.temaId !== editando?.temaAtualId) {
    const tema = await obterTema(encontro.temaId);
    if (!tema?.ativo) {
      return { estado: { errosCampos: { temaId: MSG_TEMA_INDISPONIVEL }, valores } };
    }
  }
  if (await conflitoDeHorario(turmaId, encontro.data, encontro.horario, editando?.id)) {
    return { estado: { errosCampos: { horario: MSG_CONFLITO_HORARIO }, valores } };
  }
  if (encontro.temaId && dados.get("confirmarTemaRepetido") !== "1") {
    const data = await encontroComMesmoTema(turmaId, encontro.temaId, editando?.id);
    if (data) return { estado: { temaRepetido: { data: formatarData(data) }, valores } };
  }
  return { encontro };
}

/** Criação (4.1-4.7, 7.1). */
export async function criarEncontroAction(
  turmaId: string,
  base: string,
  _anterior: EstadoPrograma,
  dados: FormData,
): Promise<EstadoPrograma> {
  await exigirAcessoATurma(turmaId);
  const destino = baseValida(base, turmaId);
  const valores = valoresDoFormulario(dados);

  try {
    const turma = await dadosDaTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO, valores };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA, valores };
    const r = await checarRegrasEncontro(turmaId, dados, valores, turma.horario);
    if (!r.encontro) return r.estado;
    await criarEncontro(turmaId, r.encontro);
  } catch (e) {
    if (codigoPrisma(e) === "P2002")
      return { errosCampos: { horario: MSG_CONFLITO_HORARIO }, valores };
    console.error("[programa] falha ao criar encontro", { turmaId, erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`${destino}?aviso=encontro-criado`);
}

/** Edição (4.8, 4.9, 5.7): só encontro planejado da própria turma. */
export async function editarEncontroAction(
  turmaId: string,
  encontroId: string,
  base: string,
  _anterior: EstadoPrograma,
  dados: FormData,
): Promise<EstadoPrograma> {
  await exigirAcessoATurma(turmaId);
  const destino = baseValida(base, turmaId);
  const valores = valoresDoFormulario(dados);

  try {
    const turma = await dadosDaTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO, valores };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA, valores };
    const atual = await obterEncontro(encontroId);
    if (!atual || atual.turmaId !== turmaId) return { erro: MSG_ERRO_INESPERADO, valores };
    if (!podeEditar(atual)) return { erro: MSG_SO_PLANEJADO, valores };
    const r = await checarRegrasEncontro(turmaId, dados, valores, turma.horario, {
      id: encontroId,
      temaAtualId: atual.tema?.id ?? null,
    });
    if (!r.encontro) return r.estado;
    if (!(await atualizarEncontro(encontroId, r.encontro))) {
      return { erro: MSG_SO_PLANEJADO, valores }; // corrida: deixou de estar planejado
    }
  } catch (e) {
    if (codigoPrisma(e) === "P2002")
      return { errosCampos: { horario: MSG_CONFLITO_HORARIO }, valores };
    console.error("[programa] falha ao editar encontro", {
      turmaId,
      encontroId,
      erro: nomeDoErro(e),
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`${destino}?aviso=alteracoes-salvas`);
}

// ---------------------------------------------------------------- situação

type Transicao = keyof typeof TRANSICOES;

/**
 * Barreiras comuns e a transição (5.1-5.4, 5.8, 7.1). `antes` roda após as
 * checagens de turma/encontro e pode recusar devolvendo um estado.
 */
async function transicionar(
  turmaId: string,
  encontroId: string,
  base: string,
  transicao: Transicao,
  aviso: CodigoAviso,
  antes?: (encontro: { data: DataCivil }) => EstadoPrograma | null,
  motivoCancelamento?: string | null,
): Promise<EstadoPrograma> {
  await exigirAcessoATurma(turmaId);
  const destino = baseValida(base, turmaId);
  const { de, para } = TRANSICOES[transicao];

  try {
    const turma = await dadosDaTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA };
    const atual = await obterEncontro(encontroId);
    if (!atual || atual.turmaId !== turmaId) return { erro: MSG_ERRO_INESPERADO };
    if (!de.includes(atual.situacao)) return { erro: MSG_SITUACAO_MUDOU };
    const recusa = antes?.(atual);
    if (recusa) return recusa;
    if (!(await mudarSituacao(encontroId, de, para, { motivoCancelamento }))) {
      return { erro: MSG_SITUACAO_MUDOU };
    }
  } catch (e) {
    if (codigoPrisma(e) === "P2002") return { erro: MSG_CONFLITO_HORARIO };
    console.error("[programa] falha ao mudar situação do encontro", {
      turmaId,
      encontroId,
      transicao,
      erro: nomeDoErro(e),
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  redirect(`${destino}?aviso=${aviso}`);
}

/** Realizar (5.1): só planejado com data até hoje. */
export async function marcarRealizadoAction(
  turmaId: string,
  encontroId: string,
  base: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoPrograma,
): Promise<EstadoPrograma> {
  return transicionar(turmaId, encontroId, base, "realizar", "encontro-realizado", (e) => {
    const erro = validarRealizacao(e.data, hojeCivil());
    return erro ? { erro } : null;
  });
}

/** Cancelar (5.2): motivo opcional, até 200 caracteres. */
export async function cancelarEncontroAction(
  turmaId: string,
  encontroId: string,
  base: string,
  _anterior: EstadoPrograma,
  dados: FormData,
): Promise<EstadoPrograma> {
  await exigirAcessoATurma(turmaId);
  const bruto = dados.get("motivo");
  const motivo = motivoSchema.safeParse(typeof bruto === "string" ? bruto : undefined);
  if (!motivo.success) {
    return {
      errosCampos: { motivo: motivo.error.issues[0]?.message },
      valores: valoresDoFormulario(dados),
    };
  }
  return transicionar(
    turmaId,
    encontroId,
    base,
    "cancelar",
    "encontro-cancelado",
    undefined,
    motivo.data ?? null,
  );
}

/** Reabrir (5.3): volta a planejado e limpa o motivo; conflito de horário recusa. */
export async function reabrirEncontroAction(
  turmaId: string,
  encontroId: string,
  base: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoPrograma,
): Promise<EstadoPrograma> {
  return transicionar(turmaId, encontroId, base, "reabrir", "encontro-reaberto");
}
