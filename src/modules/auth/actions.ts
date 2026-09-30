"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginSchema } from "@/modules/auth/domain/credenciais";
import { destinoAposLogin } from "@/modules/auth/domain/destino-login";
import { isPapel } from "@/modules/auth/domain/papeis";
import { MSG_ERRO_INESPERADO, mensagemDeErroLogin } from "@/modules/auth/mensagens";

export type EstadoLogin = {
  erro?: string;
  errosCampos?: Partial<Record<"email" | "senha", string>>;
  email?: string;
};

function texto(dados: FormData, campo: string): string | undefined {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : undefined;
}

/** Extrai status/código de um APIError do Better Auth (ou similar). */
function erroDeLogin(e: unknown): { status?: number; code?: string } {
  if (typeof e !== "object" || e === null) return {};
  const obj = e as { statusCode?: unknown; status?: unknown; body?: { code?: unknown } };
  const status = typeof obj.statusCode === "number" ? obj.statusCode : undefined;
  const code = typeof obj.body?.code === "string" ? obj.body.code : undefined;
  return { status, code };
}

export async function entrarAction(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const emailDigitado = texto(dados, "email") ?? "";
  const resultado = loginSchema.safeParse({
    email: emailDigitado,
    senha: texto(dados, "senha") ?? "",
  });
  if (!resultado.success) {
    const errosCampos: EstadoLogin["errosCampos"] = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0];
      if ((campo === "email" || campo === "senha") && !errosCampos[campo]) {
        errosCampos[campo] = issue.message;
      }
    }
    return { errosCampos, email: emailDigitado };
  }

  const { email, senha } = resultado.data;
  let destino: string;
  try {
    const { user } = await auth.api.signInEmail({
      body: { email, password: senha, rememberMe: false },
      headers: await headers(),
    });
    const papel = (user as { role?: unknown }).role;
    if (!isPapel(papel)) {
      console.error("[auth] login com papel inválido", { email, papel });
      return { erro: MSG_ERRO_INESPERADO, email };
    }
    destino = destinoAposLogin(papel, texto(dados, "callbackUrl"));
  } catch (e) {
    const detalhe = erroDeLogin(e);
    // Sem senha no log (Error Handling).
    console.error("[auth] falha no login", { email, ...detalhe });
    return { erro: mensagemDeErroLogin(detalhe), email };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(destino);
}

export async function sairAction(): Promise<never> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (e) {
    console.error("[auth] falha ao sair", e instanceof Error ? e.message : e);
  }
  redirect("/login");
}
