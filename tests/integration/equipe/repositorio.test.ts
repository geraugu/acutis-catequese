import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  contarCoordenacoesAtivas,
  emailEmUso,
  listarMembros,
  obterMembro,
  salvarPerfil,
} from "@/modules/equipe/repositorio";
import { criarUsuario } from "./helpers";

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);

describe("repositório da equipe (2.5, 3.1, 4.3, 6.6, 7.3, 8.1)", () => {
  it("lista a conta sem perfil (seed) com telefone nulo e situação ativa", async () => {
    const seed = await criarUsuario("coordenacao", "seed@exemplo.com", "Seed");
    const lista = await listarMembros();
    expect(lista).toEqual([
      {
        id: seed.id,
        nome: "Seed",
        email: "seed@exemplo.com",
        papel: "coordenacao",
        telefone: null,
        situacao: "ativo",
      },
    ]);
  });

  it("mostra membro banido como inativo e inclui telefone do perfil", async () => {
    const u = await criarUsuario("catequista", "ana@exemplo.com", "Ana");
    await salvarPerfil(u.id, { telefone: "11987654321" });
    await prisma.user.update({ where: { id: u.id }, data: { banned: true } });
    const [m] = await listarMembros();
    expect(m).toMatchObject({
      id: u.id,
      telefone: "11987654321",
      situacao: "inativo",
      papel: "catequista",
    });
  });

  it("omite registros com papel inválido", async () => {
    const u = await criarUsuario("catequista");
    await prisma.user.update({ where: { id: u.id }, data: { role: "admin" } });
    expect(await listarMembros()).toEqual([]);
    expect(await obterMembro(u.id)).toBeNull();
  });

  it("obtém detalhe com observações e data de cadastro; atualiza via upsert", async () => {
    const u = await criarUsuario("catequista", "bia@exemplo.com", "Bia");
    await salvarPerfil(u.id, { telefone: "11911112222", observacoes: "Turma A" });
    await salvarPerfil(u.id, { telefone: "11933334444" });
    const d = await obterMembro(u.id);
    expect(d).toMatchObject({
      id: u.id,
      nome: "Bia",
      telefone: "11933334444",
      observacoes: null,
      situacao: "ativo",
    });
    expect(d?.criadoEm).toBeInstanceOf(Date);
    expect(await obterMembro("inexistente")).toBeNull();
  });

  it("checa e-mail em uso, respeitando a exceção de id", async () => {
    const u = await criarUsuario("catequista", "caio@exemplo.com");
    expect(await emailEmUso("caio@exemplo.com")).toBe(true);
    expect(await emailEmUso("caio@exemplo.com", u.id)).toBe(false);
    expect(await emailEmUso("outro@exemplo.com")).toBe(false);
  });

  it("conta só coordenações ativas", async () => {
    await criarUsuario("coordenacao");
    const inativa = await criarUsuario("coordenacao");
    await criarUsuario("catequista");
    await prisma.user.update({ where: { id: inativa.id }, data: { banned: true } });
    expect(await contarCoordenacoesAtivas()).toBe(1);
  });
});
