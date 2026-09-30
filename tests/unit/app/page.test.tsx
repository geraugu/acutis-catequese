import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessao = vi.fn();
vi.mock("@/modules/auth/dal", () => ({ getSessao: () => getSessao() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => getSessao.mockReset());

  it("redireciona para o login quando não há sessão", async () => {
    getSessao.mockResolvedValue(null);
    await expect(HomePage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redireciona a coordenação para /coordenacao", async () => {
    getSessao.mockResolvedValue({ userId: "1", nome: "A", email: "a@x", papel: "coordenacao" });
    await expect(HomePage()).rejects.toThrow("REDIRECT:/coordenacao");
  });

  it("redireciona o catequista para /catequista", async () => {
    getSessao.mockResolvedValue({ userId: "2", nome: "B", email: "b@x", papel: "catequista" });
    await expect(HomePage()).rejects.toThrow("REDIRECT:/catequista");
  });
});
