import { describe, expect, it } from "vitest";
import { menuPorPapel } from "@/components/layout/menu-por-papel";

describe("menuPorPapel", () => {
  it("coordenação tem Início, Equipe, Catequizandos, Turmas e Programa", () => {
    expect(menuPorPapel("coordenacao")).toEqual([
      { rotulo: "Início", href: "/coordenacao" },
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
      { rotulo: "Catequizandos", href: "/coordenacao/catequizandos" },
      { rotulo: "Turmas", href: "/coordenacao/turmas" },
      { rotulo: "Programa", href: "/coordenacao/programa" },
    ]);
  });
  it("catequista tem Início, Minhas turmas e Programa e não vê Equipe nem Catequizandos", () => {
    expect(menuPorPapel("catequista")).toEqual([
      { rotulo: "Início", href: "/catequista" },
      { rotulo: "Minhas turmas", href: "/catequista/turmas" },
      { rotulo: "Programa", href: "/catequista/programa" },
    ]);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Equipe")).toBe(false);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Catequizandos")).toBe(false);
  });
});
