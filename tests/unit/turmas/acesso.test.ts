import { describe, expect, it } from "vitest";
import {
  podeVerCatequizandoRegra,
  podeVerTurmaRegra,
  type Ator,
} from "@/modules/turmas/domain/acesso";

const coordenacao: Ator = { id: "c1", papel: "coordenacao" };
const catequista: Ator = { id: "k1", papel: "catequista" };

describe("podeVerTurmaRegra", () => {
  it("permite à coordenação mesmo sem designação", () => {
    expect(podeVerTurmaRegra(coordenacao, [])).toBe(true);
  });
  it("permite ao catequista designado", () => {
    expect(podeVerTurmaRegra(catequista, ["x", "k1"])).toBe(true);
  });
  it("nega ao catequista não designado", () => {
    expect(podeVerTurmaRegra(catequista, ["x"])).toBe(false);
    expect(podeVerTurmaRegra(catequista, [])).toBe(false);
  });
  it("nega a papel desconhecido mesmo com id na lista", () => {
    const outro = { id: "z", papel: "visitante" } as unknown as Ator;
    expect(podeVerTurmaRegra(outro, ["z"])).toBe(false);
  });
});

describe("podeVerCatequizandoRegra", () => {
  it("permite à coordenação", () => {
    expect(podeVerCatequizandoRegra(coordenacao, [])).toBe(true);
  });
  it("permite ao catequista de turma vigente do catequizando", () => {
    expect(podeVerCatequizandoRegra(catequista, ["k1"])).toBe(true);
  });
  it("nega ao catequista que não é de turma vigente", () => {
    expect(podeVerCatequizandoRegra(catequista, ["k2"])).toBe(false);
  });
});
