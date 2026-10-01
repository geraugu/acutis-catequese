import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  cancelarEncontroAction,
  marcarRealizadoAction,
  reabrirEncontroAction,
} from "@/modules/programa/actions";
import {
  MSG_CONFLITO_HORARIO,
  MSG_ERRO_INESPERADO,
  MSG_SITUACAO_MUDOU,
  MSG_TURMA_ENCERRADA,
} from "@/modules/programa/mensagens";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarEncontroDireto, criarTurmaDireta } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const coord = (t: string) => `/coordenacao/turmas/${t}/encontros`;
const cat = (t: string) => `/catequista/turmas/${t}/encontros`;
const PASSADO = "2020-03-07";
const FUTURO = "2099-03-07";

const situacao = async (id: string) =>
  prisma.encontro.findUniqueOrThrow({
    where: { id },
    select: { situacao: true, motivoCancelamento: true },
  });

describe("marcarRealizadoAction (5.1, 5.4, 5.8)", () => {
  it("data futura é recusada; data passada é aceita", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    const futuro = await criarEncontroDireto(turmaId, { data: FUTURO });
    expect(await marcarRealizadoAction(turmaId, futuro, coord(turmaId), {})).toEqual({
      erro: "Este encontro ainda não aconteceu.",
    });
    expect((await situacao(futuro)).situacao).toBe("planejado");

    const passado = await criarEncontroDireto(turmaId, { data: PASSADO });
    expect(
      await capturarRedirect(marcarRealizadoAction(turmaId, passado, coord(turmaId), {})),
    ).toBe(`${coord(turmaId)}?aviso=encontro-realizado`);
    expect((await situacao(passado)).situacao).toBe("realizado");
  });

  it("realizar um cancelado devolve MSG_SITUACAO_MUDOU", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    const id = await criarEncontroDireto(turmaId, { data: PASSADO, situacao: "cancelado" });
    expect(await marcarRealizadoAction(turmaId, id, coord(turmaId), {})).toEqual({
      erro: MSG_SITUACAO_MUDOU,
    });
    expect((await situacao(id)).situacao).toBe("cancelado");
  });

  it("encontro de outra turma dá erro inesperado", async () => {
    const turmaId = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    usarSessao(await criarCoordenacao());
    const id = await criarEncontroDireto(outra, { data: PASSADO });
    expect(await marcarRealizadoAction(turmaId, id, coord(turmaId), {})).toEqual({
      erro: MSG_ERRO_INESPERADO,
    });
  });
});

describe("cancelarEncontroAction (5.2, 5.4)", () => {
  it("cancela com motivo", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    const id = await criarEncontroDireto(turmaId, { data: FUTURO });
    expect(
      await capturarRedirect(
        cancelarEncontroAction(turmaId, id, coord(turmaId), {}, form({ motivo: " Chuva " })),
      ),
    ).toBe(`${coord(turmaId)}?aviso=encontro-cancelado`);
    expect(await situacao(id)).toEqual({ situacao: "cancelado", motivoCancelamento: "Chuva" });
  });

  it("motivo longo é recusado", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    const id = await criarEncontroDireto(turmaId);
    const r = await cancelarEncontroAction(
      turmaId,
      id,
      coord(turmaId),
      {},
      form({ motivo: "x".repeat(201) }),
    );
    expect(r.errosCampos?.motivo).toBe("O motivo deve ter no máximo 200 caracteres");
    expect((await situacao(id)).situacao).toBe("planejado");
  });
});

describe("reabrirEncontroAction (5.3, 5.4)", () => {
  it("reabre um realizado e um cancelado (limpando o motivo)", async () => {
    const turmaId = await criarTurmaDireta();
    const ator = await criarCatequista();
    await prisma.designacao.create({ data: { turmaId, userId: ator.id } });
    usarSessao(ator);
    const realizado = await criarEncontroDireto(turmaId, { data: PASSADO, situacao: "realizado" });
    const cancelado = await criarEncontroDireto(turmaId, {
      data: FUTURO,
      situacao: "cancelado",
      motivoCancelamento: "Chuva",
    });
    expect(
      await capturarRedirect(reabrirEncontroAction(turmaId, realizado, cat(turmaId), {})),
    ).toBe(`${cat(turmaId)}?aviso=encontro-reaberto`);
    expect(
      await capturarRedirect(reabrirEncontroAction(turmaId, cancelado, cat(turmaId), {})),
    ).toBe(`${cat(turmaId)}?aviso=encontro-reaberto`);
    expect(await situacao(realizado)).toEqual({ situacao: "planejado", motivoCancelamento: null });
    expect(await situacao(cancelado)).toEqual({ situacao: "planejado", motivoCancelamento: null });
  });

  it("reabrir com conflito de horário é recusado", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    await criarEncontroDireto(turmaId, { data: FUTURO, horario: "09:00" });
    const id = await criarEncontroDireto(turmaId, {
      data: FUTURO,
      horario: "09:00",
      situacao: "cancelado",
    });
    expect(await reabrirEncontroAction(turmaId, id, coord(turmaId), {})).toEqual({
      erro: MSG_CONFLITO_HORARIO,
    });
    expect((await situacao(id)).situacao).toBe("cancelado");
  });
});

describe("barreiras comuns (1.3, 1.4, 1.5, 7.1)", () => {
  it("turma encerrada recusa as três", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-30" });
    usarSessao(await criarCoordenacao());
    const planejado = await criarEncontroDireto(turmaId, { data: PASSADO });
    const realizado = await criarEncontroDireto(turmaId, {
      data: PASSADO,
      horario: "10:00",
      situacao: "realizado",
    });
    const esperado = { erro: MSG_TURMA_ENCERRADA };
    expect(await marcarRealizadoAction(turmaId, planejado, coord(turmaId), {})).toEqual(esperado);
    expect(
      await cancelarEncontroAction(turmaId, planejado, coord(turmaId), {}, form({ motivo: "" })),
    ).toEqual(esperado);
    expect(await reabrirEncontroAction(turmaId, realizado, coord(turmaId), {})).toEqual(esperado);
    expect((await situacao(planejado)).situacao).toBe("planejado");
    expect((await situacao(realizado)).situacao).toBe("realizado");
  });

  it("turma inexistente dá erro inesperado", async () => {
    usarSessao(await criarCoordenacao());
    const t = "00000000-0000-4000-8000-000000000000";
    expect(await reabrirEncontroAction(t, t, coord(t), {})).toEqual({ erro: MSG_ERRO_INESPERADO });
  });

  it("catequista não designado vai para /acesso-negado sem alterar", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCatequista());
    const id = await criarEncontroDireto(turmaId, { data: PASSADO });
    for (const acao of [
      () => marcarRealizadoAction(turmaId, id, cat(turmaId), {}),
      () => cancelarEncontroAction(turmaId, id, cat(turmaId), {}, form({ motivo: "x" })),
      () => reabrirEncontroAction(turmaId, id, cat(turmaId), {}),
    ]) {
      expect(await capturarRedirect(acao())).toBe("/acesso-negado");
    }
    expect(await situacao(id)).toEqual({ situacao: "planejado", motivoCancelamento: null });
  });
});
