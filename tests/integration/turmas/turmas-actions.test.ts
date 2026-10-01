import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { criarTurmaAction, editarTurmaAction, encerrarTurmaAction } from "@/modules/turmas/actions";
import {
  MSG_ERRO_INESPERADO,
  MSG_NOME_EM_USO,
  MSG_TURMA_ENCERRADA,
} from "@/modules/turmas/mensagens";
import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarCatequizandoDireto, criarTurmaDireta, dia, inscreverDireto } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const campos = (extra: Record<string, string> = {}): Record<string, string> => ({
  nome: "Turma Santa Rita",
  ciclo: "2026",
  diaSemana: "sabado",
  horario: "09:30",
  local: "Sala 2",
  observacoes: "",
  vagas: "",
  ...extra,
});

describe("acesso (1.4, 11.2)", () => {
  it("catequista é recusado nas 3 actions sem alterar dados", async () => {
    const turmaId = await criarTurmaDireta();
    const cz = await criarCatequizandoDireto("Ana");
    await inscreverDireto(turmaId, cz, "2026-02-01");
    usarSessao(await criarCatequista());

    expect(await capturarRedirect(criarTurmaAction({}, form(campos())))).toBe("/acesso-negado");
    expect(
      await capturarRedirect(editarTurmaAction(turmaId, {}, form(campos({ nome: "Outro" })))),
    ).toBe("/acesso-negado");
    expect(await capturarRedirect(encerrarTurmaAction(turmaId, {}))).toBe("/acesso-negado");

    expect(await prisma.turma.count()).toBe(1);
    const t = await prisma.turma.findUniqueOrThrow({ where: { id: turmaId } });
    expect(t.nome).toBe("Turma São José");
    expect(t.encerradaEm).toBeNull();
    expect(await prisma.inscricao.count({ where: { dataSaida: null } })).toBe(1);
  });
});

describe("criarTurmaAction (1.1, 2.1, 2.3, 2.4)", () => {
  it("cria a turma e redireciona com turma-criada", async () => {
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(criarTurmaAction({}, form(campos({ vagas: "20" }))));
    const [t] = await prisma.turma.findMany();
    expect(url).toBe(`/coordenacao/turmas/${t.id}?aviso=turma-criada`);
    expect(t).toMatchObject({ nome: "Turma Santa Rita", ciclo: 2026, vagas: 20, local: "Sala 2" });
  });

  it("devolve erros por campo com os valores, sem gravar", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await criarTurmaAction(
      {},
      form(campos({ nome: "", horario: "25:00", vagas: "0", ciclo: "1999" })),
    );
    expect(estado.errosCampos?.nome).toBeTruthy();
    expect(estado.errosCampos?.horario).toBeTruthy();
    expect(estado.errosCampos?.vagas).toBeTruthy();
    expect(estado.errosCampos?.ciclo).toBeTruthy();
    expect(estado.valores?.horario).toBe("25:00");
    expect(await prisma.turma.count()).toBe(0);
  });

  it("nome em uso no mesmo ciclo entre abertas é recusado; encerrada não conta", async () => {
    await criarTurmaDireta({ nome: "Turma Santa Rita" });
    await criarTurmaDireta({ nome: "Turma Antiga", encerradaEm: "2026-01-10" });
    usarSessao(await criarCoordenacao());

    const estado = await criarTurmaAction({}, form(campos({ nome: "  turma SANTA rita " })));
    expect(estado.errosCampos?.nome).toBe(MSG_NOME_EM_USO);
    expect(estado.valores?.nome).toBe("  turma SANTA rita ");
    expect(await prisma.turma.count()).toBe(2);

    const url = await capturarRedirect(
      criarTurmaAction({}, form(campos({ nome: "Turma Antiga" }))),
    );
    expect(url).toMatch(/\?aviso=turma-criada$/);
  });
});

describe("editarTurmaAction (2.1, 2.3, 2.5, 8.3)", () => {
  it("salva, permite reduzir vagas abaixo dos inscritos e mantém todos inscritos", async () => {
    const turmaId = await criarTurmaDireta({ vagas: 10 });
    for (const nome of ["Ana", "Bia", "Caio"]) {
      await inscreverDireto(turmaId, await criarCatequizandoDireto(nome), "2026-02-01");
    }
    usarSessao(await criarCoordenacao());

    const url = await capturarRedirect(
      editarTurmaAction(turmaId, {}, form(campos({ nome: "Turma São José", vagas: "1" }))),
    );
    expect(url).toBe(`/coordenacao/turmas/${turmaId}?aviso=alteracoes-salvas`);
    const t = await prisma.turma.findUniqueOrThrow({ where: { id: turmaId } });
    expect(t.vagas).toBe(1);
    expect(t.horario).toBe("09:30");
    expect(await prisma.inscricao.count({ where: { turmaId, dataSaida: null } })).toBe(3);
  });

  it("erros de campo e nome em uso (ignorando a própria turma)", async () => {
    const turmaId = await criarTurmaDireta();
    await criarTurmaDireta({ nome: "Turma Outra" });
    usarSessao(await criarCoordenacao());

    const invalido = await editarTurmaAction(turmaId, {}, form(campos({ diaSemana: "feriado" })));
    expect(invalido.errosCampos?.diaSemana).toBeTruthy();

    const emUso = await editarTurmaAction(turmaId, {}, form(campos({ nome: "turma outra" })));
    expect(emUso.errosCampos?.nome).toBe(MSG_NOME_EM_USO);

    const url = await capturarRedirect(
      editarTurmaAction(turmaId, {}, form(campos({ nome: "Turma São José" }))),
    );
    expect(url).toMatch(/\?aviso=alteracoes-salvas$/);
  });

  it("turma encerrada recusa edição", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-01" });
    usarSessao(await criarCoordenacao());
    const estado = await editarTurmaAction(turmaId, {}, form(campos({ nome: "Novo Nome" })));
    expect(estado.erro).toBe(MSG_TURMA_ENCERRADA);
    const t = await prisma.turma.findUniqueOrThrow({ where: { id: turmaId } });
    expect(t.nome).toBe("Turma São José");
  });

  it("turma inexistente devolve erro inesperado", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await editarTurmaAction(randomUUID(), {}, form(campos()));
    expect(estado.erro).toBe(MSG_ERRO_INESPERADO);
  });
});

describe("encerrarTurmaAction (8.1, 8.3, 11.7)", () => {
  it("encerra hoje e desliga todos os inscritos vigentes", async () => {
    const turmaId = await criarTurmaDireta();
    const ana = await criarCatequizandoDireto("Ana");
    const bia = await criarCatequizandoDireto("Bia");
    const caio = await criarCatequizandoDireto("Caio");
    await inscreverDireto(turmaId, ana, "2026-02-01");
    await inscreverDireto(turmaId, bia, "2026-02-01");
    await inscreverDireto(turmaId, caio, "2026-02-01", {
      data: "2026-03-01",
      motivo: "desligamento",
    });
    usarSessao(await criarCoordenacao());

    const url = await capturarRedirect(encerrarTurmaAction(turmaId, {}));
    expect(url).toBe(`/coordenacao/turmas/${turmaId}?aviso=turma-encerrada`);
    const hoje = dia(hojeCivil());
    const t = await prisma.turma.findUniqueOrThrow({ where: { id: turmaId } });
    expect(t.encerradaEm).toEqual(hoje);
    const inscricoes = await prisma.inscricao.findMany({ where: { turmaId } });
    expect(inscricoes.every((i) => i.dataSaida !== null)).toBe(true);
    const encerradas = inscricoes.filter((i) => i.motivoSaida === "encerramento");
    expect(encerradas).toHaveLength(2);
    expect(encerradas.every((i) => i.dataSaida!.getTime() === hoje.getTime())).toBe(true);
  });

  it("turma já encerrada recusa novo encerramento", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-01" });
    usarSessao(await criarCoordenacao());
    const estado = await encerrarTurmaAction(turmaId, {});
    expect(estado.erro).toBe(MSG_TURMA_ENCERRADA);
    const t = await prisma.turma.findUniqueOrThrow({ where: { id: turmaId } });
    expect(t.encerradaEm).toEqual(dia("2026-06-01"));
  });

  it("turma inexistente devolve erro inesperado", async () => {
    usarSessao(await criarCoordenacao());
    expect((await encerrarTurmaAction(randomUUID(), {})).erro).toBe(MSG_ERRO_INESPERADO);
  });
});
