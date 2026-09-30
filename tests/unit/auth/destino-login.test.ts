import { describe, expect, it } from "vitest";
import { destinoAposLogin, papeisExigidosPorCaminho } from "@/modules/auth/domain/destino-login";

describe("papeisExigidosPorCaminho", () => {
  it("áreas por papel", () => {
    expect(papeisExigidosPorCaminho("/coordenacao")).toEqual(["coordenacao"]);
    expect(papeisExigidosPorCaminho("/coordenacao/turmas?x=1")).toEqual(["coordenacao"]);
    expect(papeisExigidosPorCaminho("/catequista")).toEqual(["catequista"]);
    expect(papeisExigidosPorCaminho("/catequista#a")).toEqual(["catequista"]);
  });
  it("prefixo parecido não conta como área", () => {
    expect(papeisExigidosPorCaminho("/coordenacaox")).toBeNull();
    expect(papeisExigidosPorCaminho("/")).toBeNull();
  });
});

describe("destinoAposLogin", () => {
  it("sem callback vai para a home do papel (3.1)", () => {
    expect(destinoAposLogin("catequista", null)).toBe("/catequista");
    expect(destinoAposLogin("coordenacao", undefined)).toBe("/coordenacao");
  });
  it("honra callback permitido", () => {
    expect(destinoAposLogin("coordenacao", "/catequista")).toBe("/catequista");
    expect(destinoAposLogin("catequista", "/catequista/x?y=1")).toBe("/catequista/x?y=1");
    expect(destinoAposLogin("catequista", "/perfil")).toBe("/perfil");
  });
  it("ignora callback sem permissão", () => {
    expect(destinoAposLogin("catequista", "/coordenacao")).toBe("/catequista");
  });
  it("ignora callback externo (6.2)", () => {
    expect(destinoAposLogin("catequista", "https://evil.com")).toBe("/catequista");
    expect(destinoAposLogin("catequista", "//evil.com")).toBe("/catequista");
  });
  it("ignora callback para o próprio login", () => {
    expect(destinoAposLogin("catequista", "/login")).toBe("/catequista");
  });
});
