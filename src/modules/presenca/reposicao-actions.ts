"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { baseValida } from "@/modules/programa/domain/encontro";
import type { EstadoPresenca } from "./actions";
import { autorizarCatequizando, autorizarTurma } from "./autorizacao";
import { podeGerenciarVisitantes } from "./domain/chamada";
import {
  MSG_CONFLITO_DATA_RESERVA,
  MSG_ERRO_INESPERADO,
  MSG_OPCAO_INDISPONIVEL,
  MSG_RESERVA_SEM_TURMA_ORIGEM,
  MSG_TEMA_JA_RESERVADO,
} from "./mensagens";
import { cancelar, marcarNaoCompareceu, reservar, visaoOQueFalta } from "./reposicao-repositorio";
import { dadosDoEncontro } from "./repositorio";

const camposSchema = z.object({ encontroId: z.uuid(), temaId: z.uuid() });

const idsSchema = z.object({ encontroId: z.uuid(), catequizandoId: z.uuid() });

const MENSAGEM_DO_MOTIVO = {
  indisponivel: MSG_OPCAO_INDISPONIVEL,
  "conflito-de-data": MSG_CONFLITO_DATA_RESERVA,
  "ja-reservada": MSG_TEMA_JA_RESERVADO,
  "sem-origem": MSG_RESERVA_SEM_TURMA_ORIGEM,
} as const;

function nomeDoErro(e: unknown): string {
  return e instanceof Error ? e.name : "desconhecido";
}

/**
 * Convenção de `base` nas ações do catequizando: é a rota do catequizando
 * (`/catequista/catequizandos/{id}` ou `/coordenacao/catequizandos/{id}`); a página
 * "o que falta" é `${base}/reposicao`. Qualquer outro valor (incluindo URLs externas)
 * vira a rota da coordenação, evitando open redirect.
 */
function paginaReposicao(base: string, catequizandoId: string): string {
  const catequista = `/catequista/catequizandos/${catequizandoId}`;
  const raiz = base === catequista ? catequista : `/coordenacao/catequizandos/${catequizandoId}`;
  return `${raiz}/reposicao`;
}

/** Reservar reposição (1.1 a 1.4, 4.5, 7.2): valida a opção na visão do catequizando antes de gravar. */
export async function reservarReposicaoAction(
  catequizandoId: string,
  base: string,
  _anterior: EstadoPresenca,
  dados: FormData,
): Promise<EstadoPresenca> {
  const sessao = await autorizarCatequizando(catequizandoId); // 1.4: antes de qualquer leitura

  const pagina = paginaReposicao(base, catequizandoId);
  const campos = camposSchema.safeParse({
    encontroId: dados.get("encontroId"),
    temaId: dados.get("temaId"),
  });
  if (!campos.success) return { erro: MSG_OPCAO_INDISPONIVEL };
  const { encontroId, temaId } = campos.data;

  try {
    const hoje = hojeCivil();
    // O repositório não confere se o tema ainda é "a repor": a opção tem de constar da visão atual.
    const visao = await visaoOQueFalta(catequizandoId, hoje);
    const consta = visao.temas.some(
      (t) => t.tema.id === temaId && t.opcoes.some((o) => o.encontroId === encontroId),
    );
    if (!consta) return { erro: MSG_OPCAO_INDISPONIVEL };

    const resultado = await reservar(
      { catequizandoId, encontroId, temaId, criadoPorId: sessao.userId },
      hoje,
    );
    if (!resultado.ok) return { erro: MENSAGEM_DO_MOTIVO[resultado.motivo] };
  } catch (e) {
    console.error("[presenca] falha ao reservar a reposição", {
      catequizandoId,
      erro: nomeDoErro(e),
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  revalidatePath(pagina);
  redirect(`${pagina}?aviso=reserva-criada`);
}

/** Cancelar reserva (4.5, 7.2): reserva já encerrada volta à página sem aviso. */
export async function cancelarReservaAction(
  catequizandoId: string,
  reservaId: string,
  base: string,
): Promise<void> {
  await autorizarCatequizando(catequizandoId); // 1.4: antes de qualquer leitura

  const pagina = paginaReposicao(base, catequizandoId);
  let cancelada = false;
  try {
    cancelada = (await cancelar(reservaId, catequizandoId)) === "ok";
  } catch (e) {
    console.error("[presenca] falha ao cancelar a reserva", {
      catequizandoId,
      erro: nomeDoErro(e),
    });
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  revalidatePath(pagina);
  redirect(cancelada ? `${pagina}?aviso=reserva-cancelada` : pagina);
}

/**
 * Marcar ausência do visitante com reserva (5.3, 7.2). `base` é a do cronograma da turma
 * visitada (como nas ações de visitante); a volta é a chamada do encontro.
 */
export async function naoCompareceuAction(
  turmaId: string,
  encontroId: string,
  catequizandoId: string,
  base: string,
): Promise<void> {
  await autorizarTurma(turmaId); // 1.5: antes de qualquer leitura; sem sessão, vai ao login

  const lista = baseValida(base, turmaId);
  // Valores do cliente só entram em caminho depois de validados como UUID.
  const ids = idsSchema.safeParse({ encontroId, catequizandoId });
  if (!ids.success) {
    revalidatePath(lista);
    redirect(lista);
  }
  const chamada = `${lista}/${ids.data.encontroId}/chamada`;
  let marcada = false;
  try {
    const encontro = await dadosDoEncontro(turmaId, ids.data.encontroId);
    const disponivel =
      encontro !== null &&
      podeGerenciarVisitantes(encontro, { encerrada: encontro.turmaEncerrada }, hojeCivil());
    if (disponivel)
      marcada = (await marcarNaoCompareceu(ids.data.encontroId, ids.data.catequizandoId)) === "ok";
  } catch (e) {
    console.error("[presenca] falha ao marcar a ausência", {
      turmaId,
      encontroId,
      erro: nomeDoErro(e),
    });
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  revalidatePath(chamada);
  redirect(marcada ? `${chamada}?aviso=ausencia-marcada` : chamada);
}
