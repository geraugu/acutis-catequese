import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obterLimite,
  salvarLimite,
  turmasAbertasDoCatequista,
} from "@/modules/presenca/repositorio";
import { LIMITE_PADRAO } from "@/modules/presenca/domain/frequencia";
import { criarTurmaDireta } from "./helpers";

async function criarUsuario(id: string) {
  await prisma.user.create({ data: { id, name: id, email: `${id}@teste.local` } });
}

const designar = (turmaId: string, userId: string, removidoEm: Date | null = null) =>
  prisma.designacao.create({ data: { turmaId, userId, removidoEm } });

describe("limite de frequência (7.1, 7.2, 7.11)", () => {
  it("sem linha, devolve o limite padrão", async () => {
    expect(await obterLimite()).toBe(LIMITE_PADRAO);
  });

  it("devolve o valor salvo", async () => {
    await salvarLimite(60);
    expect(await obterLimite()).toBe(60);
  });

  it("o segundo salvamento atualiza a mesma linha", async () => {
    await salvarLimite(60);
    await salvarLimite(80);
    expect(await obterLimite()).toBe(80);
    expect(await prisma.limiteFrequencia.count()).toBe(1);
  });

  it("o banco recusa valores fora de 1 a 100", async () => {
    await expect(salvarLimite(0)).rejects.toThrow();
    await expect(salvarLimite(101)).rejects.toThrow();
    expect(await obterLimite()).toBe(LIMITE_PADRAO);
  });
});

describe("turmasAbertasDoCatequista (1.2, 7.7)", () => {
  it("devolve só turmas abertas com designação vigente do catequista", async () => {
    await criarUsuario("cat-1");
    await criarUsuario("cat-2");
    const aberta = await criarTurmaDireta({ nome: "Aberta" });
    const encerrada = await criarTurmaDireta({ nome: "Encerrada", encerradaEm: "2026-06-01" });
    const removida = await criarTurmaDireta({ nome: "Removida" });
    const deOutro = await criarTurmaDireta({ nome: "De outro" });
    await designar(aberta, "cat-1");
    await designar(encerrada, "cat-1");
    await designar(removida, "cat-1", new Date("2026-03-01T00:00:00Z"));
    await designar(deOutro, "cat-2");
    expect(await turmasAbertasDoCatequista("cat-1")).toEqual([aberta]);
  });

  it("sem designações, devolve lista vazia", async () => {
    await criarUsuario("cat-1");
    expect(await turmasAbertasDoCatequista("cat-1")).toEqual([]);
  });
});
