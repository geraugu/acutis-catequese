import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { criarTurmaDireta, criarUsuarioDireto } from "../turmas/helpers";

async function criarLink(turmaId: string, criadoPorId: string, token: string) {
  return prisma.linkAutocadastro.create({
    data: { turmaId, criadoPorId, token },
    select: { id: true },
  });
}

describe("link_autocadastro: um link ativo por turma (1.3)", () => {
  it("recusa um segundo link não desativado na mesma turma", async () => {
    const turmaId = await criarTurmaDireta();
    const userId = await criarUsuarioDireto("Coordenação", { role: "coordenacao" });
    await criarLink(turmaId, userId, "token-1");

    await expect(criarLink(turmaId, userId, "token-2")).rejects.toThrow();
    expect(await prisma.linkAutocadastro.count({ where: { turmaId } })).toBe(1);
  });

  it("aceita um novo link depois que o anterior é desativado", async () => {
    const turmaId = await criarTurmaDireta();
    const userId = await criarUsuarioDireto("Coordenação", { role: "coordenacao" });
    const primeiro = await criarLink(turmaId, userId, "token-1");
    await prisma.linkAutocadastro.update({
      where: { id: primeiro.id },
      data: { desativadoEm: new Date() },
    });

    await criarLink(turmaId, userId, "token-2");
    expect(await prisma.linkAutocadastro.count({ where: { turmaId } })).toBe(2);
  });

  it("permite links ativos em turmas diferentes", async () => {
    const userId = await criarUsuarioDireto("Coordenação", { role: "coordenacao" });
    const a = await criarTurmaDireta({ nome: "Turma A" });
    const b = await criarTurmaDireta({ nome: "Turma B" });
    await criarLink(a, userId, "token-a");
    await criarLink(b, userId, "token-b");
    expect(await prisma.linkAutocadastro.count()).toBe(2);
  });
});
