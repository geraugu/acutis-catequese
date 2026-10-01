import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  atualizarEncontro,
  atualizarTema,
  chaveEmUso,
  conflitoDeHorario,
  criarEncontro,
  criarTema,
  dadosDaTurma,
  encontroComMesmoTema,
  encontrosEquivalentes,
  listarEncontros,
  mudarSituacao,
  obterEncontro,
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

const dc = (d: string) => d as DataCivil;
const INEXISTENTE = "00000000-0000-4000-8000-000000000000";

describe("dadosDaTurma (8.1)", () => {
  it("lê a turma, marca encerrada e devolve null para id inválido/inexistente", async () => {
    const id = await criarTurmaDireta({ nome: "Turma A", horario: "10:00" });
    const enc = await criarTurmaDireta({ encerradaEm: "2026-01-01" });
    expect(await dadosDaTurma(id)).toEqual({
      id,
      nome: "Turma A",
      horario: "10:00",
      encerrada: false,
    });
    expect((await dadosDaTurma(enc))?.encerrada).toBe(true);
    expect(await dadosDaTurma("abc")).toBeNull();
    expect(await dadosDaTurma(INEXISTENTE)).toBeNull();
  });
});

describe("criarEncontro / listarEncontros / obterEncontro (4.1, 6.1, 8.2)", () => {
  it("cria, lê a data sem deslocamento e ordena por data e horário", async () => {
    const turma = await criarTurmaDireta();
    const tema = await criarTemaDireto("Criação");
    const b = await criarEncontro(turma, {
      data: dc("2026-03-01"),
      horario: "10:00",
      temaId: tema,
      observacoes: "obs",
    });
    const a = await criarEncontro(turma, { data: dc("2026-03-01"), horario: "08:00" });
    const c = await criarEncontro(turma, { data: dc("2026-02-28"), horario: "23:00" });
    const lista = await listarEncontros(turma);
    expect(lista.map((e) => e.id)).toEqual([c, a, b]);
    expect(await obterEncontro(b)).toEqual({
      id: b,
      turmaId: turma,
      data: "2026-03-01",
      horario: "10:00",
      situacao: "planejado",
      observacoes: "obs",
      motivoCancelamento: null,
      tema: { id: tema, titulo: "Criação", ativo: true, numero: 1 },
    });
    expect((await obterEncontro(a))?.tema).toBeNull();
    expect(await obterEncontro("x")).toBeNull();
    expect(await obterEncontro(INEXISTENTE)).toBeNull();
    expect(await listarEncontros("x")).toEqual([]);
  });

  it("numera sobre todos os temas, desativado sem número, e reflete título novo (2.5)", async () => {
    const turma = await criarTurmaDireta();
    const t1 = await criarTemaDireto("Criação", { posicao: 1, ativo: false });
    const t2 = await criarTemaDireto("Batismo", { posicao: 2 });
    await criarEncontroDireto(turma, { temaId: t1, data: "2026-09-01" });
    await criarEncontroDireto(turma, { temaId: t2, data: "2026-09-02" });
    await atualizarTema(t2, { titulo: "Eucaristia" });
    const lista = await listarEncontros(turma);
    expect(lista.map((e) => e.tema)).toEqual([
      { id: t1, titulo: "Criação", ativo: false, numero: null },
      { id: t2, titulo: "Eucaristia", ativo: true, numero: 1 },
    ]);
  });
});

describe("encontroComMesmoTema (4.5)", () => {
  it("devolve a data do mais antigo não cancelado, ignorando o próprio", async () => {
    const turma = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const tema = await criarTemaDireto("Criação");
    expect(await encontroComMesmoTema(turma, tema)).toBeNull();
    await criarEncontroDireto(turma, { temaId: tema, data: "2026-01-01", situacao: "cancelado" });
    await criarEncontroDireto(outra, { temaId: tema, data: "2026-01-02" });
    expect(await encontroComMesmoTema(turma, tema)).toBeNull();
    const e1 = await criarEncontroDireto(turma, { temaId: tema, data: "2026-03-10" });
    const e2 = await criarEncontroDireto(turma, {
      temaId: tema,
      data: "2026-04-10",
      situacao: "realizado",
    });
    expect(await encontroComMesmoTema(turma, tema)).toBe("2026-03-10");
    expect(await encontroComMesmoTema(turma, tema, e1)).toBe("2026-04-10");
    await prisma.encontro.delete({ where: { id: e2 } });
    expect(await encontroComMesmoTema(turma, tema, e1)).toBeNull();
  });
});

describe("conflitoDeHorario e índice encontro_horario_unico (4.7, 4.8)", () => {
  it("considera só não cancelados e o índice recusa duplicado", async () => {
    const turma = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const d = dc("2026-09-05");
    await criarEncontroDireto(turma, { horario: "09:00", situacao: "cancelado" });
    expect(await conflitoDeHorario(turma, d, "09:00")).toBe(false);
    const e = await criarEncontro(turma, { data: d, horario: "09:00" });
    expect(await conflitoDeHorario(turma, d, "09:00")).toBe(true);
    expect(await conflitoDeHorario(turma, d, "09:00", e)).toBe(false);
    expect(await conflitoDeHorario(turma, d, "10:00")).toBe(false);
    expect(await conflitoDeHorario(outra, d, "09:00")).toBe(false);
    expect(codigo(await criarEncontro(turma, { data: d, horario: "09:00" }).catch((x) => x))).toBe(
      "P2002",
    );
  });
});

describe("atualizarEncontro (5.7)", () => {
  it("grava só se planejado", async () => {
    const turma = await criarTurmaDireta();
    const tema = await criarTemaDireto("Criação");
    const e = await criarEncontroDireto(turma);
    expect(
      await atualizarEncontro(e, {
        data: dc("2026-10-10"),
        horario: "11:00",
        temaId: tema,
        observacoes: "x",
      }),
    ).toBe(true);
    expect(await obterEncontro(e)).toMatchObject({
      data: "2026-10-10",
      horario: "11:00",
      observacoes: "x",
      tema: { id: tema },
    });
    expect(await atualizarEncontro(e, { data: dc("2026-10-11"), horario: "11:00" })).toBe(true);
    expect(await obterEncontro(e)).toMatchObject({ tema: null, observacoes: null });
    const r = await criarEncontroDireto(turma, { situacao: "realizado", data: "2026-01-01" });
    expect(await atualizarEncontro(r, { data: dc("2026-10-12"), horario: "11:00" })).toBe(false);
    expect((await obterEncontro(r))?.data).toBe("2026-01-01");
    expect(await atualizarEncontro("x", { data: dc("2026-10-12"), horario: "11:00" })).toBe(false);
  });
});

describe("mudarSituacao (5.1, 5.3, 5.4, 5.8)", () => {
  it("é condicional, grava e limpa o motivo", async () => {
    const turma = await criarTurmaDireta();
    const e = await criarEncontroDireto(turma);
    expect(
      await mudarSituacao(e, ["planejado"], "cancelado", { motivoCancelamento: "Chuva" }),
    ).toBe(true);
    expect(
      await mudarSituacao(e, ["planejado"], "cancelado", { motivoCancelamento: "Outro" }),
    ).toBe(false);
    expect(await obterEncontro(e)).toMatchObject({
      situacao: "cancelado",
      motivoCancelamento: "Chuva",
    });
    expect(await mudarSituacao(e, ["cancelado", "realizado"], "planejado")).toBe(true);
    expect(await obterEncontro(e)).toMatchObject({
      situacao: "planejado",
      motivoCancelamento: null,
    });
    expect(await mudarSituacao(e, ["planejado"], "realizado")).toBe(true);
    expect(await mudarSituacao(e, ["planejado"], "realizado")).toBe(false);
    expect(await mudarSituacao("x", ["planejado"], "realizado")).toBe(false);
  });

  it("reabrir cancelado com outro encontro no mesmo horário dá P2002", async () => {
    const turma = await criarTurmaDireta();
    const c = await criarEncontroDireto(turma, { situacao: "cancelado", motivoCancelamento: "x" });
    await criarEncontroDireto(turma);
    expect(codigo(await mudarSituacao(c, ["cancelado"], "planejado").catch((x) => x))).toBe(
      "P2002",
    );
  });
});

describe("encontrosEquivalentes (8.3)", () => {
  it("exclui cancelados e turmas encerradas, em ordem cronológica", async () => {
    const tema = await criarTemaDireto("Criação");
    const a = await criarTurmaDireta({ nome: "A" });
    const b = await criarTurmaDireta({ nome: "B" });
    const fechada = await criarTurmaDireta({ nome: "F", encerradaEm: "2026-01-01" });
    const e1 = await criarEncontroDireto(b, {
      temaId: tema,
      data: "2026-05-01",
      horario: "10:00",
      situacao: "realizado",
    });
    const e2 = await criarEncontroDireto(a, { temaId: tema, data: "2026-05-01", horario: "08:00" });
    const e0 = await criarEncontroDireto(a, { temaId: tema, data: "2026-04-01" });
    await criarEncontroDireto(a, { temaId: tema, data: "2026-03-01", situacao: "cancelado" });
    await criarEncontroDireto(fechada, { temaId: tema, data: "2026-02-01" });
    const lista = await encontrosEquivalentes(tema);
    expect(lista.map((e) => e.id)).toEqual([e0, e2, e1]);
    expect(lista[2]).toEqual({
      id: e1,
      turmaId: b,
      turmaNome: "B",
      data: "2026-05-01",
      horario: "10:00",
      situacao: "realizado",
    });
    expect(await encontrosEquivalentes("x")).toEqual([]);
  });
});
