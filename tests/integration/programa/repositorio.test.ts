import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  atualizarTema,
  chaveEmUso,
  criarTema,
  definirAtivo,
  excluirTema,
  listarTemas,
  obterTema,
  temasParaSelecao,
  trocarPosicoes,
} from "@/modules/programa/repositorio";
import { criarEncontroDireto, criarTemaDireto, criarTurmaDireta } from "./helpers";

const codigo = (e: unknown) => (e as { code?: string }).code;

describe("criarTema / obterTema / atualizarTema (2.1, 2.5)", () => {
  it("cria no fim da lista, com chave normalizada, e atualiza a chave", async () => {
    await criarTemaDireto("Criação", { posicao: 7 });
    const id = await criarTema({ titulo: "Batismo", descricao: "Sacramento" });
    expect(await obterTema(id)).toEqual({
      id,
      titulo: "Batismo",
      descricao: "Sacramento",
      ativo: true,
      posicao: 8,
      encontros: 0,
    });
    await atualizarTema(id, { titulo: "Eucaristia" });
    expect(await obterTema(id)).toMatchObject({ titulo: "Eucaristia", descricao: null });
    const linha = await prisma.tema.findUnique({ where: { id } });
    expect(linha?.chave).toBe("eucaristia");
  });

  it("primeiro tema fica na posição 1", async () => {
    const id = await criarTema({ titulo: "Batismo" });
    expect((await obterTema(id))?.posicao).toBe(1);
  });

  it("obterTema devolve null para id não-UUID ou inexistente", async () => {
    expect(await obterTema("abc")).toBeNull();
    expect(await obterTema("00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("chaveEmUso e índice tema_chave_unica (2.4)", () => {
  it("detecta a chave e o índice recusa variação de caixa/acentos", async () => {
    const id = await criarTema({ titulo: "Batismo" });
    expect(await chaveEmUso("batismo")).toBe(true);
    expect(await chaveEmUso("batismo", id)).toBe(false);
    expect(await chaveEmUso("crisma")).toBe(false);
    const erro = await criarTema({ titulo: "batismo" }).catch((e) => e);
    expect(codigo(erro)).toBe("P2002");
    const outro = await criarTema({ titulo: "Crisma" });
    expect(codigo(await atualizarTema(outro, { titulo: "BATISMO" }).catch((e) => e))).toBe("P2002");
  });
});

describe("listarTemas / trocarPosicoes (2.6, 2.7)", () => {
  it("lista por posição com a contagem de todos os encontros e troca posições", async () => {
    const a = await criarTemaDireto("A", { posicao: 1 });
    const b = await criarTemaDireto("B", { posicao: 2 });
    const turma = await criarTurmaDireta();
    await criarEncontroDireto(turma, { temaId: b });
    await criarEncontroDireto(turma, { temaId: b, situacao: "cancelado", data: "2026-09-12" });
    let lista = await listarTemas();
    expect(lista.map((t) => [t.titulo, t.posicao, t.encontros])).toEqual([
      ["A", 1, 0],
      ["B", 2, 2],
    ]);
    await trocarPosicoes(a, b);
    lista = await listarTemas();
    expect(lista.map((t) => [t.titulo, t.posicao])).toEqual([
      ["B", 1],
      ["A", 2],
    ]);
  });
});

describe("definirAtivo / excluirTema (3.1, 3.2, 3.3, 3.4)", () => {
  it("desativa e reativa; id inexistente devolve false", async () => {
    const id = await criarTemaDireto("A");
    expect(await definirAtivo(id, false)).toBe(true);
    expect((await obterTema(id))?.ativo).toBe(false);
    expect(await definirAtivo(id, true)).toBe(true);
    expect(await definirAtivo("00000000-0000-4000-8000-000000000000", false)).toBe(false);
    expect(await definirAtivo("x", false)).toBe(false);
  });

  it("recusa excluir tema usado (mesmo cancelado) e exclui o não usado", async () => {
    const usado = await criarTemaDireto("Usado");
    const livre = await criarTemaDireto("Livre");
    const turma = await criarTurmaDireta();
    await criarEncontroDireto(turma, { temaId: usado, situacao: "cancelado" });
    expect(await excluirTema(usado)).toBe("em-uso");
    expect(await obterTema(usado)).not.toBeNull();
    expect(await excluirTema(livre)).toBe("excluido");
    expect(await obterTema(livre)).toBeNull();
    expect(await excluirTema(livre)).toBe("inexistente");
    expect(await excluirTema("x")).toBe("inexistente");
  });
});

describe("temasParaSelecao (4.3, 4.9)", () => {
  it("lista ativos numerados e inclui o desativado só quando pedido", async () => {
    await criarTemaDireto("A", { posicao: 1 });
    const off = await criarTemaDireto("Off", { posicao: 2, ativo: false });
    const c = await criarTemaDireto("C", { posicao: 3 });
    const base = await temasParaSelecao();
    expect(base.map((t) => [t.titulo, t.numero, t.ativo])).toEqual([
      ["A", 1, true],
      ["C", 2, true],
    ]);
    const comOff = await temasParaSelecao(off);
    expect(comOff.map((t) => [t.titulo, t.numero, t.ativo])).toEqual([
      ["A", 1, true],
      ["C", 2, true],
      ["Off", null, false],
    ]);
    expect(await temasParaSelecao(c)).toHaveLength(2);
    expect(await temasParaSelecao("x")).toHaveLength(2);
  });
});
