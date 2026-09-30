import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

async function criarUsuarioComPerfil() {
  return prisma.user.create({
    data: {
      id: "u-perfil-1",
      name: "Maria",
      email: "maria@exemplo.com",
      perfil: { create: { telefone: "11987654321", observacoes: "Turma da manhã" } },
    },
    include: { perfil: true },
  });
}

describe("perfil_membro", () => {
  it("grava o perfil 1:1 do usuário", async () => {
    const user = await criarUsuarioComPerfil();
    expect(user.perfil?.telefone).toBe("11987654321");
    expect(user.perfil?.observacoes).toBe("Turma da manhã");
    expect(user.perfil?.createdAt).toBeInstanceOf(Date);
  });

  it("começa cada teste com a tabela vazia", async () => {
    expect(await prisma.perfilMembro.count()).toBe(0);
  });

  it("apaga o perfil em cascata ao remover o usuário", async () => {
    const user = await criarUsuarioComPerfil();
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.perfilMembro.count()).toBe(0);
  });
});
