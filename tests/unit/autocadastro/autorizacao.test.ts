import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const podeVerTurma = vi.fn();
vi.mock("@/modules/auth/dal", () => ({ requireSession: () => requireSession() }));
vi.mock("@/modules/turmas/acesso", () => ({
  podeVerTurma: (s: unknown, t: string) => podeVerTurma(s, t),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { autorizarTurma } from "@/modules/autocadastro/autorizacao";

const sessao = { userId: "u1", nome: "Ana", email: "a@x", papel: "catequista" as const };
const TURMA = "11111111-1111-4111-8111-111111111111";

describe("autorizarTurma", () => {
  beforeEach(() => {
    requireSession.mockReset().mockResolvedValue(sessao);
    podeVerTurma.mockReset();
  });

  it("devolve a sessão quando o usuário pode ver a turma", async () => {
    podeVerTurma.mockResolvedValue(true);
    await expect(autorizarTurma(TURMA)).resolves.toEqual(sessao);
    expect(podeVerTurma).toHaveBeenCalledWith(sessao, TURMA);
  });

  it("redireciona para /acesso-negado quando não pode ver a turma", async () => {
    podeVerTurma.mockResolvedValue(false);
    await expect(autorizarTurma(TURMA)).rejects.toThrow("REDIRECT:/acesso-negado");
  });

  it("propaga o redirecionamento de sessão ausente sem consultar a turma", async () => {
    requireSession.mockRejectedValue(new Error("REDIRECT:/login"));
    await expect(autorizarTurma(TURMA)).rejects.toThrow("REDIRECT:/login");
    expect(podeVerTurma).not.toHaveBeenCalled();
  });
});
