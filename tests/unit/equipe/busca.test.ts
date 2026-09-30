import { describe, expect, it } from "vitest";
import {
  filtrarMembros,
  filtrarPorTermo,
  normalizarBusca,
  paginar,
  type ItemBuscavel,
} from "@/modules/equipe/domain/busca";

const membros: ItemBuscavel[] = [
  { nome: "Maria Souza", email: "maria@ex.com", telefone: "11912345678", situacao: "ativo" },
  { nome: "João Silva", email: "joao@ex.com", telefone: "11987654321", situacao: "ativo" },
  { nome: "Ângela Lima", email: "angela@ex.com", telefone: null, situacao: "inativo" },
  { nome: "Bruno Costa", email: "BRUNO@Ex.com", telefone: "21999990000", situacao: "inativo" },
];

describe("normalizarBusca", () => {
  it("minúsculas, sem acentos e espaços colapsados", () => {
    expect(normalizarBusca("  JOÃO   da  Conceição ")).toBe("joao da conceicao");
  });
});

describe("filtrarPorTermo", () => {
  const campos = (m: ItemBuscavel) => ({ textos: [m.nome, m.email], digitos: m.telefone });
  it("termo vazio ou ausente casa com tudo", () => {
    expect(filtrarPorTermo(membros, undefined, campos)).toHaveLength(4);
    expect(filtrarPorTermo(membros, "   ", campos)).toHaveLength(4);
  });
  it('"joao" encontra "João"', () => {
    expect(filtrarPorTermo(membros, "joao", campos).map((m) => m.nome)).toEqual(["João Silva"]);
  });
  it("trecho do telefone encontra o membro, inclusive com máscara", () => {
    expect(filtrarPorTermo(membros, "98765", campos).map((m) => m.nome)).toEqual(["João Silva"]);
    expect(filtrarPorTermo(membros, "(21) 99999", campos).map((m) => m.nome)).toEqual([
      "Bruno Costa",
    ]);
  });
  it("casa com e-mail sem diferenciar caixa", () => {
    expect(filtrarPorTermo(membros, "bruno@ex", campos)).toHaveLength(1);
  });
  it("termo sem correspondência retorna vazio", () => {
    expect(filtrarPorTermo(membros, "zzz", campos)).toEqual([]);
  });
});

describe("filtrarMembros", () => {
  it("filtra por situação ativa em ordem alfabética pt-BR", () => {
    expect(filtrarMembros(membros, { situacao: "ativo" }).map((m) => m.nome)).toEqual([
      "João Silva",
      "Maria Souza",
    ]);
  });
  it("inativos e todos, com Ângela antes de Bruno", () => {
    expect(filtrarMembros(membros, { situacao: "inativo" }).map((m) => m.nome)).toEqual([
      "Ângela Lima",
      "Bruno Costa",
    ]);
    expect(filtrarMembros(membros, { situacao: "todos" }).map((m) => m.nome)).toEqual([
      "Ângela Lima",
      "Bruno Costa",
      "João Silva",
      "Maria Souza",
    ]);
  });
  it("combina termo e situação", () => {
    expect(filtrarMembros(membros, { termo: "joao", situacao: "inativo" })).toEqual([]);
    expect(filtrarMembros(membros, { termo: "angela", situacao: "todos" })).toHaveLength(1);
  });
  it("não altera a lista original", () => {
    const copia = [...membros];
    filtrarMembros(membros, { situacao: "todos" });
    expect(membros).toEqual(copia);
  });
});

describe("paginar", () => {
  const itens = Array.from({ length: 45 }, (_, i) => i);
  it("45 itens geram 3 páginas de 20", () => {
    const p = paginar(itens, 1);
    expect(p).toMatchObject({ pagina: 1, totalPaginas: 3, total: 45 });
    expect(p.itens).toHaveLength(20);
    expect(paginar(itens, 3).itens).toEqual([40, 41, 42, 43, 44]);
  });
  it("página fora do intervalo é limitada", () => {
    expect(paginar(itens, 99).pagina).toBe(3);
    expect(paginar(itens, 0).pagina).toBe(1);
    expect(paginar(itens, -2).pagina).toBe(1);
  });
  it("página inválida vira 1", () => {
    expect(paginar(itens, Number.NaN).pagina).toBe(1);
    expect(paginar(itens, 2.7).pagina).toBe(2);
  });
  it("lista vazia tem 1 página vazia", () => {
    expect(paginar([], 5)).toEqual({ itens: [], pagina: 1, totalPaginas: 1, total: 0 });
  });
  it("aceita tamanho personalizado", () => {
    expect(paginar(itens, 1, 10).totalPaginas).toBe(5);
  });
});
