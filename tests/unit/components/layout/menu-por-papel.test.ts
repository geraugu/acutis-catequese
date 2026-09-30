import { describe, expect, it } from "vitest";
import { menuPorPapel } from "@/components/layout/menu-por-papel";

describe("menuPorPapel", () => {
  it("coordenação tem só o item Início apontando para /coordenacao", () => {
    expect(menuPorPapel("coordenacao")).toEqual([{ rotulo: "Início", href: "/coordenacao" }]);
  });
  it("catequista tem só o item Início apontando para /catequista", () => {
    expect(menuPorPapel("catequista")).toEqual([{ rotulo: "Início", href: "/catequista" }]);
  });
});
