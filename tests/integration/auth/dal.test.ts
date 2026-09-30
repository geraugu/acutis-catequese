import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessao, requireRole, requireSession } from "@/modules/auth/dal";

// Cookie da requisição simulada: headers() de next/headers devolve este valor.
let cookieAtual: string | null = null;

vi.mock("next/headers", () => ({
  headers: async () => {
    const h = new Headers();
    if (cookieAtual) h.set("cookie", cookieAtual);
    return h;
  },
}));

// Igual ao Next: redirect lança um erro (NEXT_REDIRECT) que interrompe a execução.
class RedirectErro extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT;${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectErro(url);
  },
}));

const SENHA = "senha-forte-123";

async function criarEEntrar(email: string, role: "coordenacao" | "catequista", name: string) {
  await auth.api.createUser({ body: { email, password: SENHA, name, role } });
  const resposta = await auth.api.signInEmail({
    body: { email, password: SENHA, rememberMe: false },
    asResponse: true,
  });
  expect(resposta.status).toBe(200);
  // Converte Set-Cookie em um cabeçalho Cookie.
  return resposta.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function redirecionamento(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectErro) return e.url;
    throw e;
  }
  throw new Error("esperava redirect");
}

describe("DAL de sessão e autorização", () => {
  beforeEach(() => {
    cookieAtual = null;
  });

  it("getSessao devolve o usuário da sessão válida (5.1)", async () => {
    cookieAtual = await criarEEntrar("cat@exemplo.com", "catequista", "Maria Catequista");
    const sessao = await getSessao();
    expect(sessao).toMatchObject({
      nome: "Maria Catequista",
      email: "cat@exemplo.com",
      papel: "catequista",
    });
    expect(typeof sessao?.userId).toBe("string");
  });

  it("getSessao devolve null sem cookie", async () => {
    expect(await getSessao()).toBeNull();
  });

  it("sessão encerrada é tratada como não autenticada (5.4, 6.2)", async () => {
    const cookie = await criarEEntrar("cat@exemplo.com", "catequista", "Maria");
    await auth.api.signOut({ headers: new Headers({ cookie }) });
    cookieAtual = cookie;
    expect(await getSessao()).toBeNull();
    expect(await redirecionamento(requireSession("/catequista?x=1"))).toBe(
      `/login?callbackUrl=${encodeURIComponent("/catequista?x=1")}`,
    );
  });

  it("requireSession sem caminho ou com caminho inválido vai para /login", async () => {
    expect(await redirecionamento(requireSession())).toBe("/login");
    expect(await redirecionamento(requireSession("//malicioso.com"))).toBe("/login");
  });

  it("catequista em ação da coordenação é redirecionado sem gravar nada (6.3, 6.4)", async () => {
    cookieAtual = await criarEEntrar("cat@exemplo.com", "catequista", "Maria");
    async function acaoDaCoordenacao() {
      await requireRole(["coordenacao"]);
      await prisma.verification.create({
        data: { id: "v1", identifier: "acao", value: "x", expiresAt: new Date() },
      });
    }
    expect(await redirecionamento(acaoDaCoordenacao())).toBe("/acesso-negado");
    expect(await prisma.verification.count()).toBe(0);
  });

  it("coordenação passa em exigência de catequista (6.5)", async () => {
    cookieAtual = await criarEEntrar("coord@exemplo.com", "coordenacao", "Ana");
    const sessao = await requireRole(["catequista"]);
    expect(sessao.papel).toBe("coordenacao");
  });

  it("requireRole sem sessão vai para o login com retorno", async () => {
    expect(await redirecionamento(requireRole(["catequista"], "/catequista"))).toBe(
      `/login?callbackUrl=${encodeURIComponent("/catequista")}`,
    );
  });

  it("papel inválido no banco é tratado como sem permissão", async () => {
    cookieAtual = await criarEEntrar("x@exemplo.com", "catequista", "X");
    await prisma.user.update({ where: { email: "x@exemplo.com" }, data: { role: "admin" } });
    expect(await getSessao()).toBeNull();
    expect(await redirecionamento(requireRole(["catequista"]))).toBe("/acesso-negado");
    expect(await redirecionamento(requireSession("/catequista"))).toBe("/acesso-negado");
  });
});
