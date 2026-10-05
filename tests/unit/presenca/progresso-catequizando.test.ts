import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import { calcularProgressoCatequizando } from "@/modules/presenca/domain/progresso-catequizando";

const d = (valor: string) => valor as DataCivil;
const temas = [
  { id: "t1", titulo: "Deus Pai", numero: 1 },
  { id: "t2", titulo: "Jesus", numero: 2 },
  { id: "t3", titulo: "Espírito Santo", numero: 3 },
];

describe("calcularProgressoCatequizando", () => {
  it("sem presenças: tudo pendente, na ordem do programa (8.2)", () => {
    expect(calcularProgressoCatequizando(temas, [])).toEqual({
      cumpridos: [],
      total: 3,
      pendentes: temas,
    });
  });

  it("conta presença na própria turma e como visitante (8.1, 8.3)", () => {
    const r = calcularProgressoCatequizando(temas, [
      { temaId: "t1", turmaNome: "Turma A", data: d("2026-03-01"), visitante: false },
      { temaId: "t2", turmaNome: "Turma B", data: d("2026-03-08"), visitante: true },
    ]);
    expect(r.cumpridos).toEqual([
      {
        temaId: "t1",
        titulo: "Deus Pai",
        numero: 1,
        turmaNome: "Turma A",
        data: "2026-03-01",
        visitante: false,
      },
      {
        temaId: "t2",
        titulo: "Jesus",
        numero: 2,
        turmaNome: "Turma B",
        data: "2026-03-08",
        visitante: true,
      },
    ]);
    expect(r.pendentes).toEqual([temas[2]]);
    expect(r.total).toBe(3);
  });

  it("tema repetido vale a presença de data mais antiga", () => {
    const r = calcularProgressoCatequizando(temas, [
      { temaId: "t1", turmaNome: "Turma B", data: d("2026-04-01"), visitante: true },
      { temaId: "t1", turmaNome: "Turma A", data: d("2026-03-01"), visitante: false },
    ]);
    expect(r.cumpridos).toHaveLength(1);
    expect(r.cumpridos[0]).toMatchObject({
      turmaNome: "Turma A",
      data: "2026-03-01",
      visitante: false,
    });
  });

  it("tema desativado fica fora do total e dos cumpridos (8.6)", () => {
    const r = calcularProgressoCatequizando(temas.slice(0, 2), [
      { temaId: "t3", turmaNome: "Turma A", data: d("2026-03-01"), visitante: false },
    ]);
    expect(r.total).toBe(2);
    expect(r.cumpridos).toEqual([]);
    expect(r.pendentes).toEqual(temas.slice(0, 2));
  });

  it("cumpridos saem ordenados pelo número do tema e pendentes na ordem recebida", () => {
    const r = calcularProgressoCatequizando(temas, [
      { temaId: "t3", turmaNome: "Turma A", data: d("2026-03-01"), visitante: false },
      { temaId: "t1", turmaNome: "Turma A", data: d("2026-03-08"), visitante: false },
    ]);
    expect(r.cumpridos.map((c) => c.numero)).toEqual([1, 3]);
    expect(r.pendentes.map((p) => p.numero)).toEqual([2]);
  });
});
