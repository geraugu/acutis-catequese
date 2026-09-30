/**
 * Helpers compartilhados dos testes de integração da equipe (tarefas 3.x).
 *
 * 1. No arquivo de teste, declare os mocks (vi.mock é içado, por isso fica no teste):
 *      vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
 *      vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);
 * 2. Crie atores:  const coord = await criarCoordenacao();  const cat = await criarCatequista();
 *    Cada ator traz { id, email, headers } — `headers` carrega o cookie de sessão real
 *    (para chamar auth.api.* diretamente como aquele usuário).
 * 3. Para que Server Actions ajam como o ator: `usarSessao(coord)` (preenche a jarra do
 *    mock de next/headers); `limparSessao()` volta ao anônimo.
 * 4. Para capturar redirect: `const url = await capturarRedirect(acao(...))`.
 *
 * O setup global trunca as tabelas antes de cada teste — crie os atores dentro do teste
 * ou em `beforeEach`.
 */
import { auth } from "@/lib/auth";
import { jarra, RedirectErro } from "./next-mocks";

export { jarra, RedirectErro } from "./next-mocks";

export const SENHA_TESTE = "senha-forte-123";

export type Papel = "coordenacao" | "catequista";

export interface Ator {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  /** Cookie `nome=valor; ...` da sessão real. */
  cookie: string;
  /** Headers prontos para `auth.api.*({ headers })`. */
  headers: Headers;
}

let seq = 0;

/** Cria o usuário (sem sessão) pelo plugin admin, como no seed da fundação. */
export async function criarUsuario(papel: Papel, email?: string, nome?: string) {
  seq += 1;
  const e = email ?? `${papel}-${seq}-${Date.now()}@exemplo.com`;
  const { user } = await auth.api.createUser({
    body: { email: e, password: SENHA_TESTE, name: nome ?? `Membro ${seq}`, role: papel },
  });
  return user;
}

/** Faz login real e devolve o cookie de sessão. */
export async function entrarComo(email: string, senha = SENHA_TESTE): Promise<string> {
  const res = await auth.api.signInEmail({ body: { email, password: senha }, asResponse: true });
  if (!res.ok) throw new Error(`login falhou para ${email}: ${res.status}`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  return cookies.join("; ");
}

export async function criarAtor(papel: Papel, email?: string, nome?: string): Promise<Ator> {
  const user = await criarUsuario(papel, email, nome);
  const cookie = await entrarComo(user.email);
  return {
    id: user.id,
    email: user.email,
    nome: user.name,
    papel,
    cookie,
    headers: new Headers({ cookie }),
  };
}

export const criarCoordenacao = (email?: string, nome?: string) =>
  criarAtor("coordenacao", email, nome);
export const criarCatequista = (email?: string, nome?: string) =>
  criarAtor("catequista", email, nome);

/** Faz o mock de next/headers responder com a sessão do ator (Server Actions agem como ele). */
export function usarSessao(ator: Pick<Ator, "cookie">): void {
  jarra.clear();
  for (const par of ator.cookie.split("; ")) {
    const i = par.indexOf("=");
    if (i > 0) jarra.set(par.slice(0, i), par.slice(i + 1));
  }
}

export function limparSessao(): void {
  jarra.clear();
}

/** Aguarda a promessa e devolve a URL do redirect; falha se não houver redirect. */
export async function capturarRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectErro) return e.url;
    throw e;
  }
  throw new Error("esperava redirect");
}

export function form(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}
