import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { designarCatequistaAction, removerCatequistaAction } from "@/modules/turmas/actions";
import {
  MSG_CATEQUISTA_INDISPONIVEL,
  MSG_ERRO_INESPERADO,
  MSG_TURMA_ENCERRADA,
} from "@/modules/turmas/mensagens";
import * as repositorio from "@/modules/turmas/repositorio";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarTurmaDireta, criarUsuarioDireto } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const vigentes = (turmaId: string) =>
  prisma.designacao.count({ where: { turmaId, removidoEm: null } });

describe("acesso (1.4)", () => {
  it("catequista é recusado em designar e remover sem alterar dados", async () => {
    const turmaId = await criarTurmaDireta();
    const alvo = await criarUsuarioDireto("Bia");
    const designado = await criarUsuarioDireto("Caio");
    await prisma.designacao.create({ data: { turmaId, userId: designado } });
    usarSessao(await criarCatequista());

    expect(
      await capturarRedirect(designarCatequistaAction(turmaId, {}, form({ userId: alvo }))),
    ).toBe("/acesso-negado");
    expect(await capturarRedirect(removerCatequistaAction(turmaId, designado, {}))).toBe(
      "/acesso-negado",
    );
    expect(await vigentes(turmaId)).toBe(1);
    expect(await prisma.designacao.count({ where: { userId: alvo } })).toBe(0);
  });
});

describe("designarCatequistaAction (4.1, 4.3, 4.4)", () => {
  it("designa um catequista elegível e redireciona com catequista-designado", async () => {
    const turmaId = await criarTurmaDireta();
    const alvo = await criarUsuarioDireto("Bia");
    usarSessao(await criarCoordenacao());

    const url = await capturarRedirect(
      designarCatequistaAction(turmaId, {}, form({ userId: alvo })),
    );
    expect(url).toBe(`/coordenacao/turmas/${turmaId}/equipe?aviso=catequista-designado`);
    expect(
      await prisma.designacao.count({ where: { turmaId, userId: alvo, removidoEm: null } }),
    ).toBe(1);
  });

  it("recusa não elegíveis: inativo, coordenação, já designado, inexistente e vazio", async () => {
    const turmaId = await criarTurmaDireta();
    const inativo = await criarUsuarioDireto("Inativo", { banned: true });
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    const ja = await criarUsuarioDireto("Já");
    await prisma.designacao.create({ data: { turmaId, userId: ja } });
    usarSessao(await criarCoordenacao());

    for (const userId of [inativo, coord, ja, "nao-existe", ""]) {
      const estado = await designarCatequistaAction(turmaId, {}, form({ userId }));
      expect(estado.erro).toBe(MSG_CATEQUISTA_INDISPONIVEL);
    }
    expect(await prisma.designacao.count({ where: { turmaId } })).toBe(1);
  });

  it("duplicidade por concorrência (P2002) vira o mesmo erro", async () => {
    const turmaId = await criarTurmaDireta();
    const alvo = await criarUsuarioDireto("Bia");
    usarSessao(await criarCoordenacao());
    const espiao = vi
      .spyOn(repositorio, "catequistasElegiveis")
      .mockResolvedValueOnce([{ id: alvo, nome: "Bia" }]);
    await prisma.designacao.create({ data: { turmaId, userId: alvo } });

    const estado = await designarCatequistaAction(turmaId, {}, form({ userId: alvo }));
    expect(espiao).toHaveBeenCalled();
    expect(estado.erro).toBe(MSG_CATEQUISTA_INDISPONIVEL);
    expect(await vigentes(turmaId)).toBe(1);
  });

  it("turma inexistente devolve erro inesperado", async () => {
    const alvo = await criarUsuarioDireto("Bia");
    usarSessao(await criarCoordenacao());
    const estado = await designarCatequistaAction(
      "00000000-0000-0000-0000-000000000000",
      {},
      form({ userId: alvo }),
    );
    expect(estado.erro).toBe(MSG_ERRO_INESPERADO);
  });
});

describe("removerCatequistaAction (4.2)", () => {
  it("remove a designação vigente e redireciona com catequista-removido", async () => {
    const turmaId = await criarTurmaDireta();
    const alvo = await criarUsuarioDireto("Bia");
    await prisma.designacao.create({ data: { turmaId, userId: alvo } });
    usarSessao(await criarCoordenacao());

    const url = await capturarRedirect(removerCatequistaAction(turmaId, alvo, {}));
    expect(url).toBe(`/coordenacao/turmas/${turmaId}/equipe?aviso=catequista-removido`);
    expect(await vigentes(turmaId)).toBe(0);
    expect(await prisma.designacao.count({ where: { turmaId, userId: alvo } })).toBe(1);
  });

  it("remoção sem designação vigente devolve erro inesperado", async () => {
    const turmaId = await criarTurmaDireta();
    const alvo = await criarUsuarioDireto("Bia");
    usarSessao(await criarCoordenacao());
    const estado = await removerCatequistaAction(turmaId, alvo, {});
    expect(estado.erro).toBe(MSG_ERRO_INESPERADO);
  });
});

describe("turma encerrada (8.3)", () => {
  it("recusa designar e remover", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-01" });
    const alvo = await criarUsuarioDireto("Bia");
    const designado = await criarUsuarioDireto("Caio");
    await prisma.designacao.create({ data: { turmaId, userId: designado } });
    usarSessao(await criarCoordenacao());

    expect((await designarCatequistaAction(turmaId, {}, form({ userId: alvo }))).erro).toBe(
      MSG_TURMA_ENCERRADA,
    );
    expect((await removerCatequistaAction(turmaId, designado, {})).erro).toBe(MSG_TURMA_ENCERRADA);
    expect(await vigentes(turmaId)).toBe(1);
    expect(await prisma.designacao.count({ where: { userId: alvo } })).toBe(0);
  });
});
