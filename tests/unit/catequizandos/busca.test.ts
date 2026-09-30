import { describe, expect, it } from "vitest";
import {
  filtrarCatequizandos,
  type CatequizandoBuscavel,
} from "@/modules/catequizandos/domain/busca";

function item(p: Partial<CatequizandoBuscavel> & { nome: string }): CatequizandoBuscavel {
  return {
    email: null,
    telefone: "(11) 98765-4321",
    estado: "ativo",
    sacramentosRecebidos: [],
    ...p,
  };
}

const itens: CatequizandoBuscavel[] = [
  item({ nome: "Zélia", estado: "inativo", sacramentosRecebidos: ["batismo", "crisma"] }),
  item({ nome: "José Silva", email: "jose@x.com", telefone: "(21) 99999-1234" }),
  item({ nome: "Ângela", estado: "pendente", sacramentosRecebidos: ["batismo"] }),
  item({ nome: "bruno", email: "bruno@y.com", telefone: "(31) 91111-0000" }),
];

describe("filtrarCatequizandos", () => {
  it("encontra por nome sem acento", () => {
    expect(
      filtrarCatequizandos(itens, { termo: "jose", estado: "todos" }).map((i) => i.nome),
    ).toEqual(["José Silva"]);
  });
  it("encontra por e-mail e ignora e-mail nulo", () => {
    expect(
      filtrarCatequizandos(itens, { termo: "bruno@y", estado: "todos" }).map((i) => i.nome),
    ).toEqual(["bruno"]);
  });
  it("encontra por trecho do telefone", () => {
    expect(
      filtrarCatequizandos(itens, { termo: "9999-12", estado: "todos" }).map((i) => i.nome),
    ).toEqual(["José Silva"]);
  });
  it("filtra por estado", () => {
    expect(filtrarCatequizandos(itens, { estado: "pendente" }).map((i) => i.nome)).toEqual([
      "Ângela",
    ]);
  });
  it("todos não filtra e ordena em pt-BR", () => {
    expect(filtrarCatequizandos(itens, { estado: "todos" }).map((i) => i.nome)).toEqual([
      "Ângela",
      "bruno",
      "José Silva",
      "Zélia",
    ]);
  });
  it("sem crisma exclui quem recebeu crisma", () => {
    expect(
      filtrarCatequizandos(itens, { estado: "todos", semSacramento: "crisma" }).map((i) => i.nome),
    ).toEqual(["Ângela", "bruno", "José Silva"]);
  });
  it("combina filtros e não altera a entrada", () => {
    const copia = [...itens];
    expect(
      filtrarCatequizandos(itens, { estado: "ativo", semSacramento: "batismo", termo: "b" }).map(
        (i) => i.nome,
      ),
    ).toEqual(["bruno"]);
    expect(itens).toEqual(copia);
  });
});
