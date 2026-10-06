import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { desligarAction, inscreverAction } from "@/modules/turmas/actions";
import {
  MSG_CATEQUIZANDO_INATIVO,
  MSG_ERRO_INESPERADO,
  MSG_JA_INSCRITO,
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
import { criarCatequizandoDireto, criarTurmaDireta, dia, inscreverDireto } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const vigentesDe = (catequizandoId: string) =>
  prisma.inscricao.findMany({ where: { catequizandoId, dataSaida: null } });
const totalDe = (catequizandoId: string) => prisma.inscricao.count({ where: { catequizandoId } });

describe("acesso (1.4)", () => {
  it("catequista é recusado em inscrever e desligar sem alterar dados", async () => {
    const turmaId = await criarTurmaDireta();
    const c1 = await criarCatequizandoDireto("Ana");
    const c2 = await criarCatequizandoDireto("Beto");
    const inscricaoId = await inscreverDireto(turmaId, c2, "2026-02-01");
    usarSessao(await criarCatequista());

    expect(
      await capturarRedirect(
        inscreverAction(turmaId, {}, form({ catequizandoId: c1, dataEntrada: "2026-03-01" })),
      ),
    ).toBe("/acesso-negado");
    expect(
      await capturarRedirect(
        desligarAction(turmaId, inscricaoId, {}, form({ dataSaida: "2026-03-01" })),
      ),
    ).toBe("/acesso-negado");
    expect(await totalDe(c1)).toBe(0);
    expect((await vigentesDe(c2)).length).toBe(1);
  });
});

describe("inscreverAction (5.1, 5.3, 5.4, 5.5, 11.5, 11.6)", () => {
  it("inscreve e redireciona com aviso inscrito", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      inscreverAction(turmaId, {}, form({ catequizandoId: c, dataEntrada: "2026-03-01" })),
    );
    expect(url).toBe(`/coordenacao/turmas/${turmaId}/inscritos?aviso=inscrito`);
    const v = await vigentesDe(c);
    expect(v).toHaveLength(1);
    expect(v[0]!.dataEntrada).toEqual(dia("2026-03-01"));
  });

  it("sem data usa hoje", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    usarSessao(await criarCoordenacao());
    await capturarRedirect(inscreverAction(turmaId, {}, form({ catequizandoId: c })));
    expect((await vigentesDe(c))[0]!.dataEntrada).toEqual(dia(hojeCivil()));
  });

  it("recusa catequizando inativo ou inexistente", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana", { estado: "inativo" });
    usarSessao(await criarCoordenacao());
    const e1 = await inscreverAction(turmaId, {}, form({ catequizandoId: c }));
    expect(e1.erro).toBe(MSG_CATEQUIZANDO_INATIVO);
    const e2 = await inscreverAction(
      turmaId,
      {},
      form({ catequizandoId: "00000000-0000-4000-8000-000000000000" }),
    );
    expect(e2.erro).toBe(MSG_CATEQUIZANDO_INATIVO);
    const e3 = await inscreverAction(turmaId, {}, form({ catequizandoId: "nao-existe" }));
    expect(e3.erro).toBe(MSG_CATEQUIZANDO_INATIVO);
    expect(await totalDe(c)).toBe(0);
  });

  it("recusa data inválida (futura, antes do nascimento, malformada) preservando valores", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana", { dataNascimento: "2015-01-01" });
    usarSessao(await criarCoordenacao());
    for (const dataEntrada of ["2999-01-01", "2014-12-31", "2026-02-30"]) {
      const e = await inscreverAction(turmaId, {}, form({ catequizandoId: c, dataEntrada }));
      expect(e.errosCampos?.dataEntrada).toBe("Data inválida");
      expect(e.valores?.dataEntrada).toBe(dataEntrada);
    }
    expect(await totalDe(c)).toBe(0);
  });

  it("recusa já inscrito na mesma turma", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    await inscreverDireto(turmaId, c, "2026-02-01");
    usarSessao(await criarCoordenacao());
    const e = await inscreverAction(turmaId, {}, form({ catequizandoId: c }));
    expect(e.erro).toBe(MSG_JA_INSCRITO);
    expect(await totalDe(c)).toBe(1);
  });

  it("turma encerrada recusa; turma inexistente é erro inesperado", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-01-10" });
    const c = await criarCatequizandoDireto("Ana");
    usarSessao(await criarCoordenacao());
    expect((await inscreverAction(turmaId, {}, form({ catequizandoId: c }))).erro).toBe(
      MSG_TURMA_ENCERRADA,
    );
    expect((await inscreverAction("nao-existe", {}, form({ catequizandoId: c }))).erro).toBe(
      MSG_ERRO_INESPERADO,
    );
    expect(await totalDe(c)).toBe(0);
  });

  it("transferência exige confirmação e então fecha a anterior e abre a nova com a mesma data", async () => {
    const origem = await criarTurmaDireta({ nome: "Turma A" });
    const destino = await criarTurmaDireta({ nome: "Turma B" });
    const c = await criarCatequizandoDireto("Ana");
    await inscreverDireto(origem, c, "2026-02-01");
    usarSessao(await criarCoordenacao());

    const campos = { catequizandoId: c, dataEntrada: "2026-03-05" };
    const e = await inscreverAction(destino, {}, form(campos));
    expect(e.transferir).toEqual({ turmaAtualNome: "Turma A" });
    expect(e.valores?.catequizandoId).toBe(c);
    expect(await totalDe(c)).toBe(1);

    const url = await capturarRedirect(
      inscreverAction(destino, {}, form({ ...campos, confirmarTransferencia: "1" })),
    );
    expect(url).toBe(`/coordenacao/turmas/${destino}/inscritos?aviso=transferido`);
    const antiga = await prisma.inscricao.findFirstOrThrow({
      where: { catequizandoId: c, turmaId: origem },
    });
    expect(antiga.dataSaida).toEqual(dia("2026-03-05"));
    expect(antiga.motivoSaida).toBe("transferencia");
    const nova = await vigentesDe(c);
    expect(nova).toHaveLength(1);
    expect(nova[0]!.turmaId).toBe(destino);
    expect(nova[0]!.dataEntrada).toEqual(dia("2026-03-05"));
  });

  it("turma lotada exige confirmação de lotação", async () => {
    const turmaId = await criarTurmaDireta({ vagas: 1 });
    await inscreverDireto(turmaId, await criarCatequizandoDireto("Outro"), "2026-02-01");
    const c = await criarCatequizandoDireto("Ana");
    usarSessao(await criarCoordenacao());

    const e = await inscreverAction(turmaId, {}, form({ catequizandoId: c }));
    expect(e.lotada).toEqual({ inscritos: 1, vagas: 1 });
    expect(await totalDe(c)).toBe(0);

    const url = await capturarRedirect(
      inscreverAction(turmaId, {}, form({ catequizandoId: c, confirmarLotacao: "1" })),
    );
    expect(url).toBe(`/coordenacao/turmas/${turmaId}/inscritos?aviso=inscrito`);
    expect(await totalDe(c)).toBe(1);
  });

  it("lotação + transferência exigem as duas confirmações em sequência", async () => {
    const origem = await criarTurmaDireta({ nome: "Turma A" });
    const destino = await criarTurmaDireta({ nome: "Turma B", vagas: 1 });
    await inscreverDireto(destino, await criarCatequizandoDireto("Outro"), "2026-02-01");
    const c = await criarCatequizandoDireto("Ana");
    await inscreverDireto(origem, c, "2026-02-01");
    usarSessao(await criarCoordenacao());

    const e1 = await inscreverAction(destino, {}, form({ catequizandoId: c }));
    expect(e1.lotada).toEqual({ inscritos: 1, vagas: 1 });
    expect(e1.transferir).toBeUndefined();

    const e2 = await inscreverAction(
      destino,
      {},
      form({ catequizandoId: c, confirmarLotacao: "1" }),
    );
    expect(e2.transferir).toEqual({ turmaAtualNome: "Turma A" });
    expect(e2.valores?.confirmarLotacao).toBe("1");
    expect(await totalDe(c)).toBe(1);

    const url = await capturarRedirect(
      inscreverAction(
        destino,
        {},
        form({ catequizandoId: c, confirmarLotacao: "1", confirmarTransferencia: "1" }),
      ),
    );
    expect(url).toBe(`/coordenacao/turmas/${destino}/inscritos?aviso=transferido`);
    expect((await vigentesDe(c))[0]!.turmaId).toBe(destino);
  });

  it("P2002 concorrente vira MSG_JA_INSCRITO", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    usarSessao(await criarCoordenacao());
    vi.spyOn(repositorio, "inscrever").mockRejectedValueOnce(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    const e = await inscreverAction(turmaId, {}, form({ catequizandoId: c }));
    expect(e.erro).toBe(MSG_JA_INSCRITO);
  });
});

describe("desligarAction (5.5, 6.1, 6.3)", () => {
  it("desliga com a data informada e redireciona com aviso desligado", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    const id = await inscreverDireto(turmaId, c, "2026-02-01");
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      desligarAction(turmaId, id, {}, form({ dataSaida: "2026-03-01" })),
    );
    expect(url).toBe(`/coordenacao/turmas/${turmaId}/inscritos?aviso=desligado`);
    const i = await prisma.inscricao.findUniqueOrThrow({ where: { id } });
    expect(i.dataSaida).toEqual(dia("2026-03-01"));
    expect(i.motivoSaida).toBe("desligamento");
  });

  it("recusa data de saída inválida (antes da entrada ou futura)", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    const id = await inscreverDireto(turmaId, c, "2026-02-01");
    usarSessao(await criarCoordenacao());
    for (const dataSaida of ["2026-01-31", "2999-01-01", "xx"]) {
      const e = await desligarAction(turmaId, id, {}, form({ dataSaida }));
      expect(e.errosCampos?.dataSaida).toBe("Data inválida");
    }
    expect((await vigentesDe(c)).length).toBe(1);
  });

  it("recusa inscrição de outra turma, já encerrada ou turma encerrada", async () => {
    const turmaId = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const c = await criarCatequizandoDireto("Ana");
    const id = await inscreverDireto(outra, c, "2026-02-01");
    const fechada = await inscreverDireto(
      turmaId,
      await criarCatequizandoDireto("B"),
      "2026-01-01",
      {
        data: "2026-01-15",
        motivo: "desligamento",
      },
    );
    const encerrada = await criarTurmaDireta({ nome: "Enc", encerradaEm: "2026-01-20" });
    usarSessao(await criarCoordenacao());
    expect((await desligarAction(turmaId, id, {}, form({}))).erro).toBe(MSG_ERRO_INESPERADO);
    expect((await desligarAction(turmaId, fechada, {}, form({}))).erro).toBe(MSG_ERRO_INESPERADO);
    expect((await desligarAction(encerrada, id, {}, form({}))).erro).toBe(MSG_TURMA_ENCERRADA);
    expect((await vigentesDe(c)).length).toBe(1);
  });
});
