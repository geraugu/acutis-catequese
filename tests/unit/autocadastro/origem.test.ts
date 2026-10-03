import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "198.51.100.1" }),
}));

import { lerOrigem, origemDaRequisicao } from "@/modules/autocadastro/origem";

describe("origemDaRequisicao", () => {
  it("usa o primeiro valor do x-forwarded-for, sem espaços", () => {
    const h = new Headers({ "x-forwarded-for": "  203.0.113.7 , 10.0.0.1, 10.0.0.2" });
    expect(origemDaRequisicao(h)).toEqual({ tipo: "ip", chave: "203.0.113.7" });
  });

  it("aceita um único valor", () => {
    expect(origemDaRequisicao(new Headers({ "x-forwarded-for": "2001:db8::1" }))).toEqual({
      tipo: "ip",
      chave: "2001:db8::1",
    });
  });

  it("sem o cabeçalho, devolve sem origem", () => {
    expect(origemDaRequisicao(new Headers())).toEqual({ tipo: "sem-origem" });
  });

  it("cabeçalho vazio ou com primeiro valor vazio devolve sem origem", () => {
    expect(origemDaRequisicao(new Headers({ "x-forwarded-for": "   " }))).toEqual({
      tipo: "sem-origem",
    });
    expect(origemDaRequisicao(new Headers({ "x-forwarded-for": " , 10.0.0.1" }))).toEqual({
      tipo: "sem-origem",
    });
  });
});

describe("lerOrigem", () => {
  it("lê os cabeçalhos da requisição atual", async () => {
    await expect(lerOrigem()).resolves.toEqual({ tipo: "ip", chave: "198.51.100.1" });
  });
});
