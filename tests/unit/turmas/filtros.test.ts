import { describe, expect, it } from "vitest";
import {
  cicloPadrao,
  filtrarTurmas,
  type FiltroSituacaoTurma,
} from "@/modules/turmas/domain/filtros";

describe("cicloPadrao", () => {
  it("retorna o ciclo mais recente existente", () => {
    expect(cicloPadrao([2024, 2026, 2025], 2027)).toBe(2026);
  });
  it("retorna o ano atual quando não há ciclos", () => {
    expect(cicloPadrao([], 2026)).toBe(2026);
  });
});

describe("filtrarTurmas", () => {
  const turmas = [
    { id: "a", encerrada: false, ciclo: 2025 },
    { id: "b", encerrada: true, ciclo: 2025 },
    { id: "c", encerrada: false, ciclo: 2026 },
    { id: "d", encerrada: true, ciclo: 2026 },
  ];
  const ids = (situacao: FiltroSituacaoTurma, ciclo: number | "todos") =>
    filtrarTurmas(turmas, { situacao, ciclo }).map((t) => t.id);

  it.each([
    ["abertas", 2025, ["a"]],
    ["abertas", 2026, ["c"]],
    ["abertas", "todos", ["a", "c"]],
    ["encerradas", 2025, ["b"]],
    ["encerradas", "todos", ["b", "d"]],
    ["todas", 2026, ["c", "d"]],
    ["todas", "todos", ["a", "b", "c", "d"]],
    ["todas", 2030, []],
  ] as const)("situação %s, ciclo %s", (situacao, ciclo, esperado) => {
    expect(ids(situacao, ciclo)).toEqual(esperado);
  });
});
