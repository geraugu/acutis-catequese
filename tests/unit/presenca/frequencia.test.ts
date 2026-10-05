import { describe, expect, it } from "vitest";
import {
  LIMITE_PADRAO,
  calcularFrequencia,
  contarPresencas,
  emAlerta,
  limiteSchema,
  ordenarPorFrequencia,
  somarContagens,
  type ContagemFrequencia,
} from "@/modules/presenca/domain/frequencia";

function contagem(presentes: number, ausentes: number, justificados = 0): ContagemFrequencia {
  return { presentes, ausentes, justificados, total: presentes + ausentes + justificados };
}

describe("contarPresencas", () => {
  it("conta cada status e o total (5.3)", () => {
    expect(contarPresencas(["presente", "justificado", "ausente", "ausente"])).toEqual({
      presentes: 1,
      ausentes: 2,
      justificados: 1,
      total: 4,
    });
  });

  it("devolve zeros para lista vazia", () => {
    expect(contarPresencas([])).toEqual(contagem(0, 0));
  });
});

describe("somarContagens", () => {
  it("soma campo a campo (6.1)", () => {
    expect(somarContagens([contagem(1, 1, 1), contagem(2, 0, 0)])).toEqual(contagem(3, 1, 1));
  });

  it("devolve zeros sem contagens", () => {
    expect(somarContagens([])).toEqual(contagem(0, 0));
  });
});

describe("calcularFrequencia", () => {
  it("conta justificado como ausência: 1 presente, 1 justificado e 2 ausentes dão 25% (5.1)", () => {
    const f = calcularFrequencia(
      contarPresencas(["presente", "justificado", "ausente", "ausente"]),
    );
    expect(f.percentual).toBe(25);
    expect(f.total).toBe(4);
  });

  it("devolve percentual null com total 0 (5.4, 6.4)", () => {
    expect(calcularFrequencia(contagem(0, 0)).percentual).toBeNull();
  });

  it("exibe 2 de 3 como 67% (5.3)", () => {
    expect(calcularFrequencia(contagem(2, 1)).percentual).toBe(67);
  });
});

describe("emAlerta", () => {
  it("2 de 3 está em alerta com limite 67, sem arredondar (7.4)", () => {
    expect(emAlerta(contagem(2, 1), 67)).toBe(true);
  });

  it("3 de 4 não está em alerta com limite 75 (7.4)", () => {
    expect(emAlerta(contagem(3, 1), 75)).toBe(false);
  });

  it("não alerta sem encontros (7.5)", () => {
    expect(emAlerta(contagem(0, 0), 75)).toBe(false);
  });

  it("o limite padrão é 75 (7.1)", () => {
    expect(LIMITE_PADRAO).toBe(75);
  });
});

describe("limiteSchema", () => {
  const schema = limiteSchema();

  it("aceita inteiro de 1 a 100, inclusive string do formulário (7.3)", () => {
    expect(schema.parse("75")).toBe(75);
    expect(schema.parse(" 1 ")).toBe(1);
    expect(schema.parse(100)).toBe(100);
  });

  it.each(["", "0", "101", "70,5", "70.5", "abc"])("recusa %j com mensagem em pt-BR", (valor) => {
    const resultado = schema.safeParse(valor);
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0].message).toMatch(/limite/i);
  });
});

describe("ordenarPorFrequencia", () => {
  it("menor percentual primeiro, sem encontros por último, desempate por nome (5.5)", () => {
    const item = (nome: string, c: ContagemFrequencia) => ({
      nome,
      frequencia: calcularFrequencia(c),
    });
    const ordenado = ordenarPorFrequencia([
      item("Zélia", contagem(0, 0)),
      item("Bruno", contagem(3, 1)),
      item("Carla", contagem(1, 3)),
      item("Ana", contagem(1, 3)),
      item("Davi", contagem(0, 0)),
    ]);
    expect(ordenado.map((i) => i.nome)).toEqual(["Ana", "Carla", "Bruno", "Davi", "Zélia"]);
  });

  it("não altera a lista de entrada", () => {
    const entrada = [
      { nome: "B", frequencia: calcularFrequencia(contagem(1, 0)) },
      { nome: "A", frequencia: calcularFrequencia(contagem(0, 1)) },
    ];
    ordenarPorFrequencia(entrada);
    expect(entrada.map((i) => i.nome)).toEqual(["B", "A"]);
  });
});
