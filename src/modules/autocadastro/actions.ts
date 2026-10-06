"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { dataCivilSchema, hojeCivil, type DataCivil } from "@/modules/compartilhado/datas";
import {
  SACRAMENTOS,
  campoDoFormulario,
  criarFichaSchema,
  lerFichaDoFormulario,
} from "@/modules/catequizandos/domain/ficha";
import { estaLotada } from "@/modules/turmas/domain/turma";
import { autorizarTurma } from "./autorizacao";
import { validarExpiracao } from "./domain/link";
import {
  MSG_ERRO_INESPERADO,
  MSG_FICHA_INVALIDA,
  MSG_JA_REVISADA,
  MSG_LINK_JA_ATIVO,
  MSG_TURMA_ENCERRADA_FICHA,
  MSG_TURMA_ENCERRADA,
  type CodigoAviso,
} from "./mensagens";
import {
  atualizarFichaPendente,
  confirmarComInscricao,
  criarLink,
  descartar,
  desativarLink,
  obterFichaLink,
  situacaoTurma,
  type FichaLinkDetalhe,
  regenerarLink,
  salvarExpiracao,
  turmaAberta,
} from "./repositorio";
import { gerarToken } from "./token";

export type EstadoLink = { erro?: string };

const MSG_SEM_LINK_ATIVO = "A turma não tem um link ativo.";

/** Caminho da turma na área do chamador; com `aba`, o da aba (8.4, 8.5). */
function paginaDaTurma(
  sessao: SessaoUsuario,
  turmaId: string,
  aba?: "equipe" | "inscritos",
): string {
  const area = sessao.papel === "coordenacao" ? "coordenacao" : "catequista";
  const base = `/${area}/turmas/${turmaId}`;
  return aba ? `${base}/${aba}` : base;
}

function codigoPrisma(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e && typeof e.code === "string") {
    return e.code;
  }
  return undefined;
}

/**
 * Esqueleto comum: autoriza (1.10), exige turma aberta (1.7), executa a operação
 * e redireciona à página da turma da área do chamador com o aviso.
 */
async function executar(
  turmaId: string,
  aviso: CodigoAviso,
  operacao: (sessao: SessaoUsuario) => Promise<EstadoLink | undefined>,
): Promise<EstadoLink> {
  const sessao = await autorizarTurma(turmaId);
  try {
    const aberta = await turmaAberta(turmaId);
    if (aberta === null) return { erro: MSG_ERRO_INESPERADO };
    if (!aberta) return { erro: MSG_TURMA_ENCERRADA };
    const falha = await operacao(sessao);
    if (falha) return falha;
  } catch (e) {
    console.error("[autocadastro] falha na gestão do link", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  const pagina = paginaDaTurma(sessao, turmaId, "equipe");
  revalidatePath(pagina);
  redirect(`${pagina}?aviso=${aviso}`);
}

/** Gera o link da turma (1.1); com link ativo, erro amigável (P2002, 1.3). */
export async function gerarLinkAction(
  turmaId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoLink,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _dados?: FormData,
): Promise<EstadoLink> {
  return executar(turmaId, "link-gerado", async (sessao) => {
    try {
      await criarLink(turmaId, gerarToken(), sessao.userId);
    } catch (e) {
      if (codigoPrisma(e) === "P2002") return { erro: MSG_LINK_JA_ATIVO };
      throw e;
    }
    return undefined;
  });
}

/** Desativa o link ativo (1.4). */
export async function desativarLinkAction(
  turmaId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoLink,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _dados?: FormData,
): Promise<EstadoLink> {
  return executar(turmaId, "link-desativado", async () =>
    (await desativarLink(turmaId)) ? undefined : { erro: MSG_SEM_LINK_ATIVO },
  );
}

/** Desativa o atual e gera outro token (1.5). */
export async function regenerarLinkAction(
  turmaId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoLink,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _dados?: FormData,
): Promise<EstadoLink> {
  return executar(turmaId, "link-regenerado", async (sessao) => {
    await regenerarLink(turmaId, gerarToken(), sessao.userId);
    return undefined;
  });
}

/** Define ou remove (vazio) a expiração do link ativo; não aceita data passada (1.6). */
export async function salvarExpiracaoAction(
  turmaId: string,

  _anterior: EstadoLink,
  dados: FormData,
): Promise<EstadoLink> {
  return executar(turmaId, "expiracao-salva", async () => {
    const bruto = dados.get("expiraEm");
    let expiraEm: DataCivil | null = null;
    if (typeof bruto === "string" && bruto.trim() !== "") {
      const r = dataCivilSchema.safeParse(bruto.trim());
      if (!r.success) return { erro: "Data de expiração inválida." };
      expiraEm = r.data;
    }
    const v = validarExpiracao(expiraEm, hojeCivil());
    if (!v.ok) return { erro: v.erro };
    return (await salvarExpiracao(turmaId, expiraEm)) ? undefined : { erro: MSG_SEM_LINK_ATIVO };
  });
}

export type EstadoConfirmacao = {
  erro?: string;
  errosCampos?: Record<string, string>;
  lotada?: { inscritos: number; vagas: number };
};

/** Ficha gravada na forma de entrada de `criarFichaSchema` (campos vazios como ""). */
function entradaDaFicha(f: FichaLinkDetalhe): unknown {
  const sacramentos: Record<string, { recebido: boolean; data: string; paroquia: string }> = {};
  for (const s of SACRAMENTOS) {
    const sf = f.sacramentos[s];
    sacramentos[s] = { recebido: sf.recebido, data: sf.data ?? "", paroquia: sf.paroquia ?? "" };
  }
  return {
    nome: f.nome,
    dataNascimento: f.dataNascimento,
    telefone: f.telefone,
    email: f.email ?? "",
    endereco: f.endereco ?? "",
    observacoes: f.observacoes ?? "",
    sacramentos,
  };
}

/**
 * Confirma a ficha do link (7.1–7.6): revalida com o schema upstream, bloqueia turma
 * encerrada, pede confirmação de lotação (`confirmarLotacao=1`) e ativa + inscreve com a
 * data de hoje numa transação. Avisos de duplicata nunca bloqueiam (6.4).
 */
export async function confirmarFichaLinkAction(
  turmaId: string,
  catequizandoId: string,
  _anterior: EstadoConfirmacao,
  dados: FormData,
): Promise<EstadoConfirmacao> {
  const sessao = await autorizarTurma(turmaId);
  try {
    const ficha = await obterFichaLink(turmaId, catequizandoId);
    if (!ficha) return { erro: MSG_JA_REVISADA };
    const hoje = hojeCivil();
    const validacao = criarFichaSchema({ hoje }).safeParse(entradaDaFicha(ficha));
    if (!validacao.success) {
      const errosCampos: Record<string, string> = {};
      for (const issue of validacao.error.issues) {
        const campo = campoDoFormulario(issue.path);
        errosCampos[campo] ??= issue.message;
      }
      return { erro: MSG_FICHA_INVALIDA, errosCampos };
    }
    const turma = await situacaoTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA_FICHA };
    if (estaLotada(turma.inscritosVigentes, turma.vagas) && dados.get("confirmarLotacao") !== "1") {
      return { lotada: { inscritos: turma.inscritosVigentes, vagas: turma.vagas ?? 0 } };
    }
    if ((await confirmarComInscricao(catequizandoId, turmaId, hoje)) === "ja-revisada") {
      return { erro: MSG_JA_REVISADA };
    }
  } catch (e) {
    console.error("[autocadastro] falha na confirmação da ficha", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  // Layout revalidado para atualizar a contagem de pendentes (1.6).
  revalidatePath(paginaDaTurma(sessao, turmaId), "layout");
  redirect(`${paginaDaTurma(sessao, turmaId, "inscritos")}?aviso=ficha-confirmada`);
}

/** Estado compatível com o `CamposFicha` (EstadoFicha de catequizandos). */
export type EstadoRevisao = {
  erro?: string;
  errosCampos?: Partial<Record<string, string>>;
  valores?: Record<string, string>;
};

function valoresDoFormulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (typeof valor === "string" && !campo.startsWith("$")) valores[campo] = valor;
  }
  return valores;
}

/**
 * Corrige a ficha pendente (5.5): exige turma aberta, valida com o schema upstream e
 * mantém o estado pendente e a origem. Duplicatas não bloqueiam (6.4).
 */
export async function corrigirFichaLinkAction(
  turmaId: string,
  catequizandoId: string,
  _anterior: EstadoRevisao,
  dados: FormData,
): Promise<EstadoRevisao> {
  const sessao = await autorizarTurma(turmaId);
  const valores = valoresDoFormulario(dados);
  try {
    const turma = await situacaoTurma(turmaId);
    if (!turma) return { erro: MSG_ERRO_INESPERADO, valores };
    if (turma.encerrada) return { erro: MSG_TURMA_ENCERRADA_FICHA, valores };
    const validacao = criarFichaSchema({ hoje: hojeCivil() }).safeParse(
      lerFichaDoFormulario(dados),
    );
    if (!validacao.success) {
      const errosCampos: Partial<Record<string, string>> = {};
      for (const issue of validacao.error.issues) {
        const campo = campoDoFormulario(issue.path);
        errosCampos[campo] ??= issue.message;
      }
      return { errosCampos, valores };
    }
    if ((await atualizarFichaPendente(catequizandoId, turmaId, validacao.data)) === "ja-revisada") {
      return { erro: MSG_JA_REVISADA, valores };
    }
  } catch (e) {
    console.error("[autocadastro] falha na correção da ficha", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  const pagina = `${paginaDaTurma(sessao, turmaId)}/pendentes/${catequizandoId}`;
  revalidatePath(pagina);
  redirect(`${pagina}?aviso=ficha-corrigida`);
}

/**
 * Descarta a ficha pendente do link (8.1–8.4), com a turma aberta ou encerrada.
 * A confirmação explícita é da UI; o autor não é notificado (8.3).
 */
export async function descartarFichaLinkAction(
  turmaId: string,
  catequizandoId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _anterior: EstadoRevisao,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do useActionState
  _dados?: FormData,
): Promise<EstadoRevisao> {
  const sessao = await autorizarTurma(turmaId);
  try {
    if ((await descartar(catequizandoId, turmaId)) === "ja-revisada") {
      return { erro: MSG_JA_REVISADA };
    }
  } catch (e) {
    console.error("[autocadastro] falha no descarte da ficha", {
      turmaId,
      erro: e instanceof Error ? e.name : "desconhecido",
    });
    return { erro: MSG_ERRO_INESPERADO };
  }
  const pagina = `${paginaDaTurma(sessao, turmaId)}/pendentes`;
  revalidatePath(pagina);
  revalidatePath(paginaDaTurma(sessao, turmaId), "layout");
  redirect(`${pagina}?aviso=ficha-descartada`);
}
