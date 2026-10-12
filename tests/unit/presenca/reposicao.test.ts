import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  conflitoDeData,
  type EncontroCandidato,
  opcoesDoTema,
  temasARepor,
} from "@/modules/presenca/domain/reposicao";

const d = (valor: string) => valor as DataCivil;
const pendentes = [
  { id: "t1", titulo: "Deus Pai", numero: 1 },
  { id: "t2", titulo: "Jesus", numero: 2 },
  { id: "t3", titulo: "Espírito Santo", numero: 3 },
];

function candidato(parcial: Partial<EncontroCandidato> & { encontroId: string }): EncontroCandidato {
  return {
    turmaId: "tu1",
    turmaNome: "Turma A",
    diaSemana: "sábado",
    data: d("2026-05-02"),
    horario: "09:00",
    temaId: "t1",
    ...parcial,
  };
}

describe("temasARepor", () => {
  it("lista só os pendentes já trabalhados na origem, na ordem do programa (2.1, 2.3)", () => {
    const r = temasARepor(pendentes, new Set(["t3", "t1"]));
    expect(r).toEqual([
      { id: "t1", titulo: "Deus Pai", numero: 1 },
      { id: "t3", titulo: "Espírito Santo", numero: 3 },
    ]);
  });

  it("tema cumprido (fora dos pendentes) não entra, mesmo trabalhado na origem (2.2)", () => {
    const r = temasARepor([pendentes[1]], new Set(["t1", "t2"]));
    expect(r.map((t) => t.id)).toEqual(["t2"]);
  });

  it("tema ainda não trabalhado na origem não entra (2.1)", () => {
    expect(temasARepor(pendentes, new Set(["t2"])).map((t) => t.id)).toEqual(["t2"]);
  });

  it("mantém a ordem do programa mesmo com pendentes fora de ordem (2.3)", () => {
    const r = temasARepor([pendentes[2], pendentes[0]], new Set(["t1", "t3"]));
    expect(r.map((t) => t.numero)).toEqual([1, 3]);
  });

  it("lista vazia sem erro (2.4)", () => {
    expect(temasARepor([], new Set(["t1"]))).toEqual([]);
    expect(temasARepor(pendentes, new Set())).toEqual([]);
  });
});

describe("opcoesDoTema", () => {
  it("só do tema pedido, por data crescente e desempate por nome da turma (3.1, 3.2)", () => {
    const r = opcoesDoTema(
      "t1",
      [
        candidato({ encontroId: "e3", data: d("2026-05-09"), turmaNome: "Turma A" }),
        candidato({ encontroId: "e2", data: d("2026-05-02"), turmaNome: "Turma B" }),
        candidato({ encontroId: "e1", data: d("2026-05-02"), turmaNome: "Turma A" }),
        candidato({ encontroId: "eX", data: d("2026-05-01"), temaId: "t2" }),
      ],
      new Set(),
      new Set(),
    );
    expect(r.map((o) => o.encontroId)).toEqual(["e1", "e2", "e3"]);
    expect(r.every((o) => o.conflito === false)).toBe(true);
  });

  it("exclui encontro com presença ou reserva ativa (3.3)", () => {
    const r = opcoesDoTema(
      "t1",
      [candidato({ encontroId: "e1" }), candidato({ encontroId: "e2", data: d("2026-05-09") })],
      new Set(["e1"]),
      new Set(),
    );
    expect(r.map((o) => o.encontroId)).toEqual(["e2"]);
  });

  it("marca conflito quando a data está ocupada (3.4)", () => {
    const r = opcoesDoTema(
      "t1",
      [candidato({ encontroId: "e1" }), candidato({ encontroId: "e2", data: d("2026-05-09") })],
      new Set(),
      new Set([d("2026-05-09")]),
    );
    expect(r.map((o) => [o.encontroId, o.conflito])).toEqual([
      ["e1", false],
      ["e2", true],
    ]);
  });

  it("lista vazia sem erro (2.4)", () => {
    expect(opcoesDoTema("t1", [], new Set(), new Set())).toEqual([]);
  });
});

describe("conflitoDeData", () => {
  const origem = new Set([d("2026-05-02")]);
  const reservas = [{ encontroId: "e9", temaId: "t2", data: d("2026-05-09") }];

  it("conflita com encontro da turma de origem na mesma data (4.3)", () => {
    expect(conflitoDeData(d("2026-05-02"), origem, [])).toBe(true);
  });

  it("conflita com outra reserva ativa na mesma data (4.3)", () => {
    expect(conflitoDeData(d("2026-05-09"), origem, reservas)).toBe(true);
  });

  it("sem coincidência não há conflito, inclusive sem dados (4.3)", () => {
    expect(conflitoDeData(d("2026-05-16"), origem, reservas)).toBe(false);
    expect(conflitoDeData(d("2026-05-16"), new Set(), [])).toBe(false);
  });
});
