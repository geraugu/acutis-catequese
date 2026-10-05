import { describe, expect, it } from "vitest";
import { menuPorPapel } from "@/components/layout/menu-por-papel";

describe("menuPorPapel", () => {
  it("coordenação tem Início, Equipe, Catequizandos, Turmas, Programa e Frequência", () => {
    expect(menuPorPapel("coordenacao")).toEqual([
      { rotulo: "Início", href: "/coordenacao" },
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
      { rotulo: "Catequizandos", href: "/coordenacao/catequizandos" },
      { rotulo: "Turmas", href: "/coordenacao/turmas" },
      { rotulo: "Programa", href: "/coordenacao/programa" },
      { rotulo: "Frequência", href: "/coordenacao/frequencia" },
    ]);
  });
  it("catequista tem Início, Minhas turmas, Programa e Frequência e não vê Equipe nem Catequizandos", () => {
    expect(menuPorPapel("catequista")).toEqual([
      { rotulo: "Início", href: "/catequista" },
      { rotulo: "Minhas turmas", href: "/catequista/turmas" },
      { rotulo: "Programa", href: "/catequista/programa" },
      { rotulo: "Frequência", href: "/catequista/frequencia" },
    ]);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Equipe")).toBe(false);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Catequizandos")).toBe(false);
  });
});
