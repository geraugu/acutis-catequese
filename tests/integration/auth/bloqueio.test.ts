import { afterEach, describe, expect, it, vi } from "vitest";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CODIGO_CONTA_DESABILITADA,
  CODIGO_CREDENCIAIS_INVALIDAS,
  MSG_BLOQUEIO,
  STATUS_BLOQUEIO,
} from "@/modules/auth/mensagens";

const EMAIL = "catequista@exemplo.com";
const SENHA = "senha-forte-123";
const ERRADA = "senha-errada-999";

async function criarCatequista() {
  return auth.api.createUser({
    body: { email: EMAIL, password: SENHA, name: "Maria Catequista", role: "catequista" },
  });
}

async function entrar(email: string, password: string) {
  // Um APIError lançado no hook "before" não é convertido em Response pelo asResponse
  // (o handler HTTP converte); aqui ele é tratado igual.
  const resposta = await auth.api
    .signInEmail({ body: { email, password, rememberMe: false }, asResponse: true })
    .catch((e: unknown) => {
      if (isAPIError(e)) return Response.json(e.body, { status: e.statusCode });
      throw e;
    });
  const corpo = resposta.status === 200 ? null : await resposta.json().catch(() => null);
  return { status: resposta.status, code: corpo?.code as string | undefined, corpo };
}

async function falhar(vezes: number, email = EMAIL) {
  for (let i = 0; i < vezes; i++) {
    const r = await entrar(email, ERRADA);
    expect(r.status).toBe(401);
  }
}

const tentativas = (email = EMAIL) => prisma.loginAttempt.count({ where: { email } });

describe("bloqueio por e-mail após tentativas falhas", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("5 falhas bloqueiam o e-mail mesmo com a senha correta (4.1, 4.2)", async () => {
    await criarCatequista();
    await falhar(5);
    expect(await tentativas()).toBe(5);

    const r = await entrar(EMAIL, SENHA);
    expect(r.status).toBe(STATUS_BLOQUEIO);
    expect(r.corpo?.message).toBe(MSG_BLOQUEIO);
    expect(await prisma.session.count()).toBe(0);
    // Tentativas durante o bloqueio não são registradas (não estendem o bloqueio).
    expect(await tentativas()).toBe(5);
  });

  it("avançar o relógio 15 minutos libera o login (4.3)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
    await criarCatequista();
    await falhar(5);
    expect((await entrar(EMAIL, SENHA)).status).toBe(STATUS_BLOQUEIO);

    vi.setSystemTime(new Date("2026-09-30T12:15:01Z"));
    const r = await entrar(EMAIL, SENHA);
    expect(r.status).toBe(200);
  });

  it("sucesso após 4 falhas zera a contagem (4.4)", async () => {
    await criarCatequista();
    await falhar(4);
    expect((await entrar(EMAIL, SENHA)).status).toBe(200);
    expect(await tentativas()).toBe(0);

    await falhar(4);
    expect((await entrar(EMAIL, SENHA)).status).toBe(200);
  });

  it("conta banida é recusada sem gerar tentativa falha (3.4)", async () => {
    const { user } = await criarCatequista();
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });

    const r = await entrar(EMAIL, SENHA);
    expect(r.status).toBe(403);
    expect(r.code).toBe(CODIGO_CONTA_DESABILITADA);
    expect(await tentativas()).toBe(0);
  });

  it("e-mail inexistente e senha errada recebem a mesma resposta e ambos contam (3.2)", async () => {
    await criarCatequista();
    const inexistente = await entrar("ninguem@exemplo.com", ERRADA);
    const senhaErrada = await entrar(EMAIL, ERRADA);

    expect(inexistente.status).toBe(401);
    expect(senhaErrada.status).toBe(401);
    expect(inexistente.code).toBe(CODIGO_CREDENCIAIS_INVALIDAS);
    expect(senhaErrada.code).toBe(CODIGO_CREDENCIAIS_INVALIDAS);
    expect(inexistente.corpo?.message).toBe(senhaErrada.corpo?.message);
    expect(await tentativas("ninguem@exemplo.com")).toBe(1);
    expect(await tentativas()).toBe(1);
  });

  it("normaliza o e-mail: falhas com maiúsculas e espaços contam para o mesmo e-mail", async () => {
    await criarCatequista();
    await falhar(5, "  Catequista@Exemplo.COM ");
    expect(await tentativas()).toBe(5);
    expect((await entrar(EMAIL, SENHA)).status).toBe(STATUS_BLOQUEIO);
  });
});
