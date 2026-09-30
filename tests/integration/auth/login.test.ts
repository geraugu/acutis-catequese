import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EMAIL = "catequista@exemplo.com";
const SENHA = "senha-forte-123";

async function criarCatequista(senha = SENHA) {
  return auth.api.createUser({
    body: { email: EMAIL, password: senha, name: "Maria Catequista", role: "catequista" },
  });
}

describe("login com e-mail e senha (Better Auth)", () => {
  it("usuário criado pelo servidor entra sem 'lembrar-me' e recebe cookie de sessão sem prazo (5.1, 5.2)", async () => {
    await criarCatequista();

    const resposta = await auth.api.signInEmail({
      body: { email: EMAIL, password: SENHA, rememberMe: false },
      asResponse: true,
    });
    expect(resposta.status).toBe(200);

    const cookies = resposta.headers.getSetCookie();
    const cookieSessao = cookies.find((c) => /session_token=/.test(c));
    expect(cookieSessao).toBeDefined();
    expect(cookieSessao).not.toMatch(/max-age/i);
    expect(cookieSessao).not.toMatch(/expires/i);
    expect(cookieSessao).toMatch(/httponly/i);

    const sessao = await prisma.session.findFirstOrThrow();
    const esperado = Date.now() + 12 * 60 * 60 * 1000;
    expect(Math.abs(sessao.expiresAt.getTime() - esperado)).toBeLessThan(60_000);
  });

  it("grava a senha como hash e o papel catequista (6.1, 7.3)", async () => {
    await criarCatequista();
    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(usuario.role).toBe("catequista");

    const conta = await prisma.account.findFirstOrThrow({ where: { userId: usuario.id } });
    expect(conta.providerId).toBe("credential");
    expect(conta.password).toBeTruthy();
    expect(conta.password).not.toBe(SENHA);
    expect(conta.password).not.toContain(SENHA);
    expect(conta.password!.length).toBeGreaterThan(40);
  });

  it("recusa senha com 7 caracteres (7.1)", async () => {
    await expect(criarCatequista("1234567")).rejects.toThrow();
    expect(await prisma.user.count()).toBe(0);
  });

  it("cadastro público está desabilitado", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "x@exemplo.com", password: SENHA, name: "X" } }),
    ).rejects.toThrow();
  });
});
