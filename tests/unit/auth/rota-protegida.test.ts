import { describe, expect, it } from "vitest";
import { HEADER_CAMINHO, urlDeLogin } from "@/modules/auth/domain/rota-protegida";

describe("urlDeLogin", () => {
  it("leva o caminho atual como endereço de retorno", () => {
    expect(urlDeLogin("/coordenacao", "")).toBe("/login?callbackUrl=%2Fcoordenacao");
  });
  it("preserva a query string no endereço de retorno", () => {
    expect(urlDeLogin("/catequista", "?a=1&b=2")).toBe(
      "/login?callbackUrl=%2Fcatequista%3Fa%3D1%26b%3D2",
    );
  });
  it("vai para o login sem retorno quando o caminho é a raiz", () => {
    expect(urlDeLogin("/", "")).toBe("/login");
  });
  it("expõe o nome do header do caminho atual", () => {
    expect(HEADER_CAMINHO).toBe("x-caminho");
  });
});
