import { afterEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/modules/auth/dal";
import { CODIGO_CONTA_DESABILITADA, MSG_CONTA_DESABILITADA } from "@/modules/auth/mensagens";
import { inativarMembroAction, reativarMembroAction } from "@/modules/equipe/actions";
import { MENSAGEM_VIOLACAO } from "@/modules/equipe/mensagens";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  entrarComo,
  limparSessao,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

async function loginBruto(email: string) {
  const res = await auth.api.signInEmail({
    body: { email, password: "senha-forte-123" },
    asResponse: true,
  });
  const corpo = res.ok ? null : ((await res.json()) as { code?: string; message?: string });
  return { status: res.status, code: corpo?.code, message: corpo?.message };
}

describe("inativarMembroAction / reativarMembroAction (1.3, 6.1, 6.3–6.5, 7.1, 7.3)", () => {
  it("inativa: redireciona com 'inativado', encerra sessões e login é recusado (6.1, 6.3, 6.5)", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista();
    usarSessao(alvo);
    expect(await getSessao()).not.toBeNull();

    usarSessao(coord);
    const url = await capturarRedirect(inativarMembroAction(alvo.id, {}));

    expect(url).toBe(`/coordenacao/equipe/${alvo.id}?aviso=inativado`);
    const u = await prisma.user.findUnique({ where: { id: alvo.id } });
    expect(u).not.toBeNull(); // 6.5: nada é excluído
    expect(u?.banned).toBe(true);
    expect(u?.banExpires).toBeNull();
    expect(await prisma.session.count({ where: { userId: alvo.id } })).toBe(0);
    usarSessao(alvo);
    expect(await getSessao()).toBeNull();

    const r = await loginBruto(alvo.email);
    expect(r.status).toBe(403);
    expect(r.code).toBe(CODIGO_CONTA_DESABILITADA);
    expect(r.message).toBe(MSG_CONTA_DESABILITADA);
  });

  it("reativa: redireciona com 'reativado' e o membro volta a entrar com a senha anterior (6.4)", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista();
    usarSessao(coord);
    await capturarRedirect(inativarMembroAction(alvo.id, {}));

    const url = await capturarRedirect(reativarMembroAction(alvo.id, {}));

    expect(url).toBe(`/coordenacao/equipe/${alvo.id}?aviso=reativado`);
    await expect(entrarComo(alvo.email)).resolves.toBeTruthy();
  });

  it("recusa inativar a si mesmo sem alterar nada (7.1)", async () => {
    await criarCoordenacao();
    const coord = await criarCoordenacao();
    usarSessao(coord);

    const estado = await inativarMembroAction(coord.id, {});

    expect(estado.erro).toBe(MENSAGEM_VIOLACAO["a-si-mesmo"]);
    const u = await prisma.user.findUnique({ where: { id: coord.id } });
    expect(u?.banned).toBeFalsy();
    expect(await getSessao()).not.toBeNull();
  });

  it("a última coordenação ativa não consegue se inativar; nada muda (7.1, 7.3)", async () => {
    // Pela action, quem age é sempre uma coordenação ativa; logo a única forma de
    // mirar a última coordenação é ela mesma — a regra a-si-mesmo tem precedência.
    const coord = await criarCoordenacao();
    usarSessao(coord);

    const estado = await inativarMembroAction(coord.id, {});

    expect(estado.erro).toBeDefined();
    expect(await prisma.user.count({ where: { role: "coordenacao", banned: false } })).toBe(1);
  });

  it("inativa uma coordenação quando há duas ativas (7.3)", async () => {
    const coord = await criarCoordenacao();
    const outra = await criarCoordenacao();
    usarSessao(coord);

    const url = await capturarRedirect(inativarMembroAction(outra.id, {}));

    expect(url).toBe(`/coordenacao/equipe/${outra.id}?aviso=inativado`);
    expect((await prisma.user.findUnique({ where: { id: outra.id } }))?.banned).toBe(true);
  });

  it("catequista não pode inativar nem reativar (1.3)", async () => {
    const coord = await criarCoordenacao();
    const cat = await criarCatequista();
    const alvo = await criarCatequista();
    usarSessao(coord);
    await capturarRedirect(inativarMembroAction(alvo.id, {}));

    usarSessao(cat);
    await expect(inativarMembroAction(coord.id, {})).rejects.toThrow();
    await expect(reativarMembroAction(alvo.id, {})).rejects.toThrow();
    expect((await prisma.user.findUnique({ where: { id: coord.id } }))?.banned).toBeFalsy();
    expect((await prisma.user.findUnique({ where: { id: alvo.id } }))?.banned).toBe(true);
  });
});
