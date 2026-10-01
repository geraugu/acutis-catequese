import { describe, expect, it } from "vitest";
import {
  chaveDoTitulo,
  criarTemaSchema,
  numerarTemas,
  vizinhoParaMover,
} from "@/modules/programa/domain/tema";

function mensagens(entrada: unknown): string[] {
  const resultado = criarTemaSchema().safeParse(entrada);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
}

describe("criarTemaSchema", () => {
  it("aceita título e descrição válidos, com trim", () => {
    expect(criarTemaSchema().parse({ titulo: "  Batismo ", descricao: " Sacramento " })).toEqual({
      titulo: "Batismo",
      descricao: "Sacramento",
    });
  });
  it("converte descrição vazia em undefined", () => {
    expect(criarTemaSchema().parse({ titulo: "Batismo", descricao: "   " }).descricao).toBe(
      undefined,
    );
  });
  it("rejeita título vazio", () => {
    expect(mensagens({ titulo: "  " })).toEqual(["Informe o título"]);
    expect(mensagens({})).toEqual(["Informe o título"]);
  });
  it("rejeita título curto e longo", () => {
    expect(mensagens({ titulo: "a" })).toEqual(["O título deve ter entre 2 e 120 caracteres"]);
    expect(mensagens({ titulo: "a".repeat(121) })).toEqual([
      "O título deve ter entre 2 e 120 caracteres",
    ]);
    expect(mensagens({ titulo: "a".repeat(120) })).toEqual([]);
  });
  it("rejeita descrição longa, apontando todos os erros", () => {
    expect(mensagens({ titulo: "Batismo", descricao: "a".repeat(2001) })).toEqual([
      "A descrição deve ter no máximo 2000 caracteres",
    ]);
    expect(mensagens({ titulo: "", descricao: "a".repeat(2001) })).toHaveLength(2);
  });
});

describe("chaveDoTitulo", () => {
  it("gera a mesma chave ignorando acento, caixa e espaços", () => {
    expect(chaveDoTitulo("Batismo")).toBe(chaveDoTitulo("batísmo "));
  });
});

const temas = [
  { id: "c", ativo: true, posicao: 3 },
  { id: "x", ativo: false, posicao: 2 },
  { id: "a", ativo: true, posicao: 1 },
  { id: "y", ativo: false, posicao: 0 },
  { id: "d", ativo: true, posicao: 4 },
];

describe("numerarTemas", () => {
  it("numera os ativos continuamente e põe os desativados ao fim, sem número", () => {
    const copia = [...temas];
    expect(numerarTemas(temas).map((t) => [t.id, t.numero])).toEqual([
      ["a", 1],
      ["c", 2],
      ["d", 3],
      ["y", null],
      ["x", null],
    ]);
    expect(temas).toEqual(copia);
  });
});

describe("vizinhoParaMover", () => {
  it("pula desativados", () => {
    expect(vizinhoParaMover(temas, "c", "subir")?.id).toBe("a");
    expect(vizinhoParaMover(temas, "a", "descer")?.id).toBe("c");
    expect(vizinhoParaMover(temas, "c", "descer")?.id).toBe("d");
  });
  it("devolve null nos limites", () => {
    expect(vizinhoParaMover(temas, "a", "subir")).toBeNull();
    expect(vizinhoParaMover(temas, "d", "descer")).toBeNull();
  });
  it("devolve null para tema inexistente ou desativado", () => {
    expect(vizinhoParaMover(temas, "z", "subir")).toBeNull();
    expect(vizinhoParaMover(temas, "x", "descer")).toBeNull();
  });
});
