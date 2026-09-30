import { describe, expect, it } from "vitest";
import { menuPorPapel } from "@/components/layout/menu-por-papel";

describe("menuPorPapel", () => {
  it("coordenação tem Início e Equipe", () => {
    expect(menuPorPapel("coordenacao")).toEqual([
      { rotulo: "Início", href: "/coordenacao" },
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
    ]);
  });
  it("catequista tem só o item Início e não vê Equipe", () => {
    expect(menuPorPapel("catequista")).toEqual([{ rotulo: "Início", href: "/catequista" }]);
    expect(menuPorPapel("catequista").some((i) => i.rotulo === "Equipe")).toBe(false);
  });
});
