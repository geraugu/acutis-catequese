import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/modules/auth/dal";
import { registrarFalha } from "@/modules/auth/tentativas-login";
import { redefinirSenhaAction } from "@/modules/equipe/actions";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  entrarComo,
  form,
  limparSessao,
  SENHA_TESTE,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);

const NOVA = "nova-senha-456";

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

describe("redefinirSenhaAction (1.3, 5.1, 5.2, 5.4)", () => {
  it("define a nova senha e redireciona com 'senha-redefinida'; antiga falha, nova funciona", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista("maria@exemplo.com");
    usarSessao(coord);

    const url = await capturarRedirect(redefinirSenhaAction(alvo.id, {}, form({ senha: NOVA })));

    expect(url).toBe(`/coordenacao/equipe/${alvo.id}?aviso=senha-redefinida`);
    await expect(entrarComo(alvo.email, SENHA_TESTE)).rejects.toThrow();
    await expect(entrarComo(alvo.email, NOVA)).resolves.toBeTruthy();
  });

  it("encerra as sessões anteriores do membro (5.1)", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista();
    usarSessao(alvo);
    expect(await getSessao()).not.toBeNull();

    usarSessao(coord);
    await capturarRedirect(redefinirSenhaAction(alvo.id, {}, form({ senha: NOVA })));

    expect(await prisma.session.count({ where: { userId: alvo.id } })).toBe(0);
    usarSessao(alvo);
    expect(await getSessao()).toBeNull();
    // A sessão de quem redefiniu continua válida.
    usarSessao(coord);
    expect(await getSessao()).not.toBeNull();
  });

  it("libera o e-mail bloqueado por tentativas falhas (5.4)", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista("bloqueada@exemplo.com");
    for (let i = 0; i < 5; i++) await registrarFalha(alvo.email);
    await expect(entrarComo(alvo.email, SENHA_TESTE)).rejects.toThrow();

    usarSessao(coord);
    await capturarRedirect(redefinirSenhaAction(alvo.id, {}, form({ senha: NOVA })));

    expect(await prisma.loginAttempt.count({ where: { email: alvo.email } })).toBe(0);
    await expect(entrarComo(alvo.email, NOVA)).resolves.toBeTruthy();
  });

  it("recusa senha de 7 caracteres sem alterar nada (5.2)", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista();
    usarSessao(coord);

    const estado = await redefinirSenhaAction(alvo.id, {}, form({ senha: "1234567" }));

    expect(estado.errosCampos?.senha).toMatch(/mínimo 8/);
    await expect(entrarComo(alvo.email, SENHA_TESTE)).resolves.toBeTruthy();
  });

  it("catequista não pode redefinir senha (1.3)", async () => {
    const cat = await criarCatequista();
    const alvo = await criarCatequista();
    usarSessao(cat);

    await expect(redefinirSenhaAction(alvo.id, {}, form({ senha: NOVA }))).rejects.toThrow();
    await expect(entrarComo(alvo.email, SENHA_TESTE)).resolves.toBeTruthy();
  });
});
