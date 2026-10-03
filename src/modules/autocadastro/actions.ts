"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { dataCivilSchema, hojeCivil, type DataCivil } from "@/modules/compartilhado/datas";
import { autorizarTurma } from "./autorizacao";
import { validarExpiracao } from "./domain/link";
import {
  MSG_ERRO_INESPERADO,
  MSG_LINK_JA_ATIVO,
  MSG_TURMA_ENCERRADA,
  type CodigoAviso,
} from "./mensagens";
import {
  criarLink,
  desativarLink,
  regenerarLink,
  salvarExpiracao,
  turmaAberta,
} from "./repositorio";
import { gerarToken } from "./token";

export type EstadoLink = { erro?: string };

const MSG_SEM_LINK_ATIVO = "A turma não tem um link ativo.";

function paginaDaTurma(sessao: SessaoUsuario, turmaId: string): string {
  const area = sessao.papel === "coordenacao" ? "coordenacao" : "catequista";
  return `/${area}/turmas/${turmaId}`;
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
  const pagina = paginaDaTurma(sessao, turmaId);
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
