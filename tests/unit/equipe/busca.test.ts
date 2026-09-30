import { describe, expect, it } from "vitest";
import { filtrarMembros, type ItemBuscavel } from "@/modules/equipe/domain/busca";

const membros: ItemBuscavel[] = [
  { nome: "Maria Souza", email: "maria@ex.com", telefone: "11912345678", situacao: "ativo" },
  { nome: "João Silva", email: "joao@ex.com", telefone: "11987654321", situacao: "ativo" },
  { nome: "Ângela Lima", email: "angela@ex.com", telefone: null, situacao: "inativo" },
  { nome: "Bruno Costa", email: "BRUNO@Ex.com", telefone: "21999990000", situacao: "inativo" },
];

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
