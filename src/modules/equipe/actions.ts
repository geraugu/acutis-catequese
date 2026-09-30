"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireRole } from "@/modules/auth/dal";
import type { z } from "zod";
import { membroCriacaoSchema, membroEdicaoSchema } from "@/modules/equipe/domain/membro";
import { verificarProtecaoCoordenacao } from "@/modules/equipe/domain/protecao-coordenacao";
import {
  MENSAGEM_VIOLACAO,
  MSG_EMAIL_EM_USO,
  MSG_ERRO_INESPERADO,
} from "@/modules/equipe/mensagens";
import {
  contarCoordenacoesAtivas,
  emailEmUso,
  obterMembro,
  salvarPerfil,
} from "@/modules/equipe/repositorio";

type CampoValor = "nome" | "email" | "telefone" | "papel" | "observacoes";
type CampoErro = CampoValor | "senha";

export type EstadoFormulario = {
  erro?: string;
  errosCampos?: Partial<Record<CampoErro, string>>;
  /** Valores preenchidos para reexibir o formulário — nunca a senha (2.10). */
  valores?: Partial<Record<CampoValor, string>>;
};

const CAMPOS_VALOR: readonly CampoValor[] = ["nome", "email", "telefone", "papel", "observacoes"];
const CAMPOS_ERRO: readonly CampoErro[] = [...CAMPOS_VALOR, "senha"];

function texto(dados: FormData, campo: string): string | undefined {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : undefined;
}

function valoresPreenchidos(dados: FormData): EstadoFormulario["valores"] {
  const valores: EstadoFormulario["valores"] = {};
  for (const campo of CAMPOS_VALOR) {
    const v = texto(dados, campo);
    if (v !== undefined) valores[campo] = v;
  }
  return valores;
}

function isCampoErro(c: unknown): c is CampoErro {
  return (CAMPOS_ERRO as readonly unknown[]).includes(c);
}

function errosPorCampo(error: z.ZodError): EstadoFormulario["errosCampos"] {
  const errosCampos: EstadoFormulario["errosCampos"] = {};
  for (const issue of error.issues) {
    const campo = issue.path[0];
    if (isCampoErro(campo) && !errosCampos[campo]) errosCampos[campo] = issue.message;
  }
  return errosCampos;
}

function camposMembro(dados: FormData) {
  return {
    nome: texto(dados, "nome") ?? "",
    email: texto(dados, "email") ?? "",
    telefone: texto(dados, "telefone") ?? "",
    papel: texto(dados, "papel"),
    observacoes: texto(dados, "observacoes"),
  };
}

export async function criarMembroAction(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  await requireRole(["coordenacao"]); // 1.3: antes de qualquer leitura ou escrita

  const valores = valoresPreenchidos(dados);
  const resultado = membroCriacaoSchema.safeParse({
    ...camposMembro(dados),
    senha: texto(dados, "senha") ?? "",
  });
  if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };

  const { nome, email, telefone, papel, observacoes, senha } = resultado.data;
  let userId: string;
  try {
    if (await emailEmUso(email)) {
      return { errosCampos: { email: MSG_EMAIL_EM_USO }, valores };
    }
    const cabecalhos = await headers();
    const { user } = await auth.api.createUser({
      headers: cabecalhos,
      body: { email, password: senha, name: nome, role: papel },
    });
    userId = user.id;
    try {
      await salvarPerfil(userId, { telefone, observacoes });
    } catch (e) {
      // Compensação: sem perfil, a conta recém-criada é removida.
      console.error("[equipe] falha ao gravar perfil; removendo conta", {
        userId,
        erro: e instanceof Error ? e.message : String(e),
      });
      await auth.api.removeUser({ headers: cabecalhos, body: { userId } });
      return { erro: MSG_ERRO_INESPERADO, valores };
    }
  } catch (e) {
    console.error("[equipe] falha ao cadastrar membro", {
      email,
      erro: e instanceof Error ? e.message : String(e),
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`/coordenacao/equipe/${userId}?aviso=cadastrado`);
}

/** Edição de membro (4.1–4.5); o `id` é vinculado via `.bind` na página. */
export async function editarMembroAction(
  id: string,
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const ator = await requireRole(["coordenacao"]); // 1.3

  const valores = valoresPreenchidos(dados);
  const resultado = membroEdicaoSchema.safeParse(camposMembro(dados));
  if (!resultado.success) return { errosCampos: errosPorCampo(resultado.error), valores };

  const { nome, email, telefone, papel, observacoes } = resultado.data;
  try {
    const alvo = await obterMembro(id);
    if (!alvo) return { erro: MSG_ERRO_INESPERADO, valores };
    if (await emailEmUso(email, id)) return { erro: MSG_EMAIL_EM_USO, valores };

    const mudouPapel = papel !== alvo.papel;
    if (mudouPapel) {
      const violacao = verificarProtecaoCoordenacao({
        atorId: ator.userId,
        alvo,
        operacao: { tipo: "mudar-papel", novoPapel: papel },
        coordenacoesAtivas: await contarCoordenacoesAtivas(),
      });
      if (violacao) return { erro: MENSAGEM_VIOLACAO[violacao], valores };
    }

    const cabecalhos = await headers();
    await auth.api.adminUpdateUser({
      headers: cabecalhos,
      body: { userId: id, data: { name: nome, email } },
    });
    if (mudouPapel) {
      await auth.api.setRole({ headers: cabecalhos, body: { userId: id, role: papel } });
    }
    await salvarPerfil(id, { telefone, observacoes });
  } catch (e) {
    console.error("[equipe] falha ao editar membro", {
      userId: id,
      erro: e instanceof Error ? e.message : String(e),
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  redirect(`/coordenacao/equipe/${id}?aviso=alteracoes-salvas`);
}
