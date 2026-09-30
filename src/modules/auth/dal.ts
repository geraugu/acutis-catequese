import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sanitizarCallbackUrl } from "@/modules/auth/domain/callback-url";
import { isPapel, podeAcessar, type Papel } from "@/modules/auth/domain/papeis";

// Camada de sessão e autorização: usar apenas no servidor (páginas, layouts e Server Actions).

export interface SessaoUsuario {
  userId: string;
  nome: string;
  email: string;
  papel: Papel;
}

interface SessaoBruta {
  userId: string;
  nome: string;
  email: string;
  papel: unknown;
}

/** Sessão validada no banco (sem cookie cache), memorizada por requisição. */
const lerSessao = cache(async (): Promise<SessaoBruta | null> => {
  const resultado = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!resultado) return null;
  const { user } = resultado;
  return { userId: user.id, nome: user.name, email: user.email, papel: user.role };
});

function comPapelValido(s: SessaoBruta): SessaoUsuario | null {
  return isPapel(s.papel) ? { ...s, papel: s.papel } : null;
}

/** Sessão validada no banco, ou null (sem sessão, sessão encerrada/expirada ou papel inválido). */
export async function getSessao(): Promise<SessaoUsuario | null> {
  const bruta = await lerSessao();
  return bruta ? comPapelValido(bruta) : null;
}

function redirecionarParaLogin(caminhoAtual?: string): never {
  const caminho = sanitizarCallbackUrl(caminhoAtual);
  redirect(caminho ? `/login?callbackUrl=${encodeURIComponent(caminho)}` : "/login");
}

/** Sem sessão: redireciona ao login com o endereço de retorno (6.2). Papel inválido: acesso negado. */
export async function requireSession(caminhoAtual?: string): Promise<SessaoUsuario> {
  const bruta = await lerSessao();
  if (!bruta) redirecionarParaLogin(caminhoAtual);
  const sessao = comPapelValido(bruta);
  if (!sessao) redirect("/acesso-negado");
  return sessao;
}

/**
 * Sem permissão: redireciona para "/acesso-negado" (6.3). Deve ser a primeira chamada
 * de toda página e Server Action protegida, antes de qualquer leitura ou escrita (6.4).
 * A coordenação satisfaz exigências de catequista (6.5).
 */
export async function requireRole(
  permitidos: readonly Papel[],
  caminhoAtual?: string,
): Promise<SessaoUsuario> {
  const sessao = await requireSession(caminhoAtual);
  if (!podeAcessar(sessao.papel, permitidos)) redirect("/acesso-negado");
  return sessao;
}
