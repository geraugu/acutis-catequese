import { describe, expect, it } from "vitest";
import {
  PAPEIS,
  ROTULO_PAPEL,
  homeDoPapel,
  isPapel,
  podeAcessar,
} from "@/modules/auth/domain/papeis";

describe("papeis", () => {
  it("define os dois papéis", () => {
    expect(PAPEIS).toEqual(["coordenacao", "catequista"]);
  });

  it("coordenação acessa áreas de catequista (6.5)", () => {
    expect(podeAcessar("coordenacao", ["catequista"])).toBe(true);
  });

  it("catequista é barrado em áreas da coordenação", () => {
    expect(podeAcessar("catequista", ["coordenacao"])).toBe(false);
  });

  it.each(PAPEIS)("%s acessa a própria área", (papel) => {
    expect(podeAcessar(papel, [papel])).toBe(true);
  });

  it.each(PAPEIS)("%s não acessa quando não há papéis permitidos", (papel) => {
    expect(podeAcessar(papel, [])).toBe(false);
  });

  it("homeDoPapel devolve a página inicial de cada papel (3.1)", () => {
    expect(homeDoPapel("coordenacao")).toBe("/coordenacao");
    expect(homeDoPapel("catequista")).toBe("/catequista");
  });

  it("isPapel aceita os papéis válidos", () => {
    expect(isPapel("coordenacao")).toBe(true);
    expect(isPapel("catequista")).toBe(true);
  });

  it.each(["admin", "", null, undefined, 1])("isPapel rejeita %s", (valor) => {
    expect(isPapel(valor)).toBe(false);
  });

  it("ROTULO_PAPEL traz rótulos em pt-BR", () => {
    expect(ROTULO_PAPEL).toEqual({
      coordenacao: "Coordenação",
      catequista: "Catequista",
    });
  });
});
