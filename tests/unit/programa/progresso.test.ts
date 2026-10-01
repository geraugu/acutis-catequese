import { describe, expect, it } from "vitest";
import { calcularProgresso } from "@/modules/programa/domain/progresso";

const A = { id: "a", titulo: "Criação", numero: 1 };
const B = { id: "b", titulo: "Aliança", numero: 2 };
const C = { id: "c", titulo: "Profetas", numero: 3 };

describe("calcularProgresso", () => {
  it("conta uma vez o tema realizado duas vezes", () => {
    const p = calcularProgresso(
      [A, B],
      [
        { temaId: "a", situacao: "realizado" },
        { temaId: "a", situacao: "realizado" },
      ],
    );
    expect(p).toEqual({ realizados: 1, total: 2, pendentes: [B] });
  });

  it("ignora encontros sem tema, cancelados e planejados", () => {
    const p = calcularProgresso(
      [A, B, C],
      [
        { temaId: null, situacao: "realizado" },
        { temaId: "a", situacao: "cancelado" },
        { temaId: "b", situacao: "planejado" },
      ],
    );
    expect(p.realizados).toBe(0);
    expect(p.total).toBe(3);
    expect(p.pendentes).toEqual([A, B, C]);
  });

  it("deixa fora do total o tema desativado, mesmo com encontro realizado", () => {
    const p = calcularProgresso(
      [A],
      [
        { temaId: "desativado", situacao: "realizado" },
        { temaId: "a", situacao: "realizado" },
      ],
    );
    expect(p).toEqual({ realizados: 1, total: 1, pendentes: [] });
  });

  it("mantém os pendentes na ordem do programa", () => {
    const p = calcularProgresso([C, A, B], [{ temaId: "a", situacao: "realizado" }]);
    expect(p.pendentes.map((t) => t.id)).toEqual(["c", "b"]);
  });

  it("dá 0 de 0 com a lista de temas vazia", () => {
    expect(calcularProgresso([], [{ temaId: "a", situacao: "realizado" }])).toEqual({
      realizados: 0,
      total: 0,
      pendentes: [],
    });
  });
});
