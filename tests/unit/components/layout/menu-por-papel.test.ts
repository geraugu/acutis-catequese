import { describe, expect, it } from "vitest";
import { menuPorPapel } from "@/components/layout/menu-por-papel";

describe("menuPorPapel", () => {
  it("coordenação tem Início, Equipe, Catequizandos e Turmas", () => {
    expect(menuPorPapel("coordenacao")).toEqual([
      { rotulo: "Início", href: "/coordenacao" },
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
      { rotulo: "Catequizandos", href: "/coordenacao/catequizandos" },
      { rotulo: "Turmas", href: "/coordenacao/turmas" },
    ]);
  });
  it("catequista tem Início e Minhas turmas e não vê Equipe nem Catequizandos", () => {
    expect(menuPorPapel("catequista")).toEqual([
      { rotulo: "Início", href: "/catequista" },
      { rotulo: "Minhas turmas", href: "/catequista/turmas" },
    ]);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Equipe")).toBe(false);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Catequizandos")).toBe(false);
  });
});
