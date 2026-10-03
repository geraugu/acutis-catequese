"use server";

import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  campoDoFormulario,
  criarFichaSchema,
  lerFichaDoFormulario,
} from "@/modules/catequizandos/domain/ficha";
import { VERSAO_CONSENTIMENTO } from "@/modules/autocadastro/domain/consentimento";
import { POLITICA_LIMITES } from "@/modules/autocadastro/domain/limites";
import { situacaoDoLink } from "@/modules/autocadastro/domain/link";
import { CAMPO_CONSENTIMENTO, MSG_CONSENTIMENTO } from "@/modules/autocadastro/mensagens";
import { lerOrigem } from "@/modules/autocadastro/origem";
import {
  criarFichaPendente,
  obterLinkPublico,
  registrarTentativa,
} from "@/modules/autocadastro/repositorio";
import { hashOrigem } from "@/modules/autocadastro/token";

/**
 * Estado do formulário público. `invalido` traz `errosCampos` e `valores` no formato que
 * `CamposFicha` espera (como `EstadoFicha`), mais o erro do consentimento.
 * `recebida` nunca carrega dados (3.6).
 */
export type EstadoEnvio =
  | { tipo: "inicial" }
  | {
      tipo: "invalido";
      errosCampos: Record<string, string>;
      valores: Record<string, string>;
      erroConsentimento?: string;
    }
  | { tipo: "limite" }
  | { tipo: "indisponivel" }
  | { tipo: "recebida" };

function valoresDoFormulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (typeof valor === "string" && !campo.startsWith("$")) valores[campo] = valor;
  }
  return valores;
}

export async function enviarFichaAction(
  token: string,
  _anterior: EstadoEnvio,
  dados: FormData,
): Promise<EstadoEnvio> {
  try {
    // Tokens têm 43 caracteres base64url; qualquer outra coisa nem chega ao banco.
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { tipo: "indisponivel" };
    const link = await obterLinkPublico(token);
    if (!link || situacaoDoLink(link, link.turmaEncerrada, hojeCivil()) !== "ativo") {
      return { tipo: "indisponivel" };
    }

    // Limites antes de qualquer gravação; sem x-forwarded-for, vale só o limite por link (4.1–4.3).
    const agora = new Date();
    const origem = await lerOrigem();
    if (origem.tipo === "ip") {
      const chave = `origem:${hashOrigem(origem.chave)}`;
      if (!(await registrarTentativa(chave, POLITICA_LIMITES.origem, agora))) {
        return { tipo: "limite" };
      }
    }
    if (!(await registrarTentativa(`link:${link.linkId}`, POLITICA_LIMITES.link, agora))) {
      return { tipo: "limite" };
    }

    const resultado = criarFichaSchema({ hoje: hojeCivil() }).safeParse(
      lerFichaDoFormulario(dados),
    );
    const consentiu = dados.get(CAMPO_CONSENTIMENTO) === "on";
    if (!resultado.success || !consentiu) {
      const errosCampos: Record<string, string> = {};
      for (const issue of resultado.error?.issues ?? []) {
        const campo = campoDoFormulario(issue.path);
        if (campo && !errosCampos[campo]) errosCampos[campo] = issue.message;
      }
      return {
        tipo: "invalido",
        errosCampos,
        valores: valoresDoFormulario(dados),
        ...(consentiu ? {} : { erroConsentimento: MSG_CONSENTIMENTO }),
      };
    }

    // Coincidência com cadastros existentes não muda a resposta (3.7).
    await criarFichaPendente(resultado.data, link.linkId, link.turmaId, {
      em: agora,
      versao: VERSAO_CONSENTIMENTO,
    });
    return { tipo: "recebida" };
  } catch (erro) {
    // Sem dados pessoais nem IP: só o tipo do erro.
    console.error("[autocadastro] falha no envio público:", (erro as Error)?.name ?? "erro");
    return { tipo: "indisponivel" };
  }
}
