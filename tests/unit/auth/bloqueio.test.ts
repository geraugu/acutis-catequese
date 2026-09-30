import { describe, expect, it } from "vitest";
import {
  JANELA_CONSULTA_FALHAS_MS,
  POLITICA_BLOQUEIO,
  avaliarBloqueio,
} from "@/modules/auth/domain/bloqueio";

const MIN = 60_000;
const base = new Date("2026-01-01T10:00:00.000Z");
const em = (minutos: number) => new Date(base.getTime() + minutos * MIN);

describe("avaliarBloqueio", () => {
  it("define a política 5/15/15 e a janela de consulta de 30 min", () => {
    expect(POLITICA_BLOQUEIO).toEqual({
      maxFalhas: 5,
      janelaMs: 15 * MIN,
      duracaoBloqueioMs: 15 * MIN,
    });
    expect(JANELA_CONSULTA_FALHAS_MS).toBe(30 * MIN);
  });

  it("sem falhas não bloqueia", () => {
    expect(avaliarBloqueio([], em(0))).toEqual({ bloqueado: false });
  });

  it("4 falhas não bloqueiam (4.1)", () => {
    const falhas = [em(0), em(1), em(2), em(3)];
    expect(avaliarBloqueio(falhas, em(4))).toEqual({ bloqueado: false });
  });

  it("5 falhas em 15 min bloqueiam até 15 min após a 5ª (4.1)", () => {
    const falhas = [em(0), em(2), em(4), em(6), em(8)];
    expect(avaliarBloqueio(falhas, em(9))).toEqual({
      bloqueado: true,
      liberaEm: em(23),
    });
  });

  it("5 falhas exatamente nos limites da janela de 15 min bloqueiam", () => {
    const falhas = [em(0), em(5), em(10), em(12), em(15)];
    expect(avaliarBloqueio(falhas, em(16))).toEqual({
      bloqueado: true,
      liberaEm: em(30),
    });
  });

  it("5 falhas espalhadas por mais de 15 min não bloqueiam", () => {
    const falhas = [em(0), em(4), em(8), em(12), em(16)];
    expect(avaliarBloqueio(falhas, em(17))).toEqual({ bloqueado: false });
  });

  it("o bloqueio termina 15 min após a 5ª falha (4.3)", () => {
    const falhas = [em(0), em(1), em(2), em(3), em(4)];
    expect(avaliarBloqueio(falhas, new Date(em(19).getTime() - 1))).toEqual({
      bloqueado: true,
      liberaEm: em(19),
    });
    expect(avaliarBloqueio(falhas, em(19))).toEqual({ bloqueado: false });
    expect(avaliarBloqueio(falhas, em(40))).toEqual({ bloqueado: false });
  });

  it("aceita falhas fora de ordem", () => {
    const falhas = [em(8), em(0), em(6), em(2), em(4)];
    expect(avaliarBloqueio(falhas, em(9))).toEqual({
      bloqueado: true,
      liberaEm: em(23),
    });
  });

  it("uma 6ª falha durante o bloqueio estende a liberação", () => {
    const falhas = [em(0), em(1), em(2), em(3), em(4), em(10)];
    expect(avaliarBloqueio(falhas, em(11))).toEqual({
      bloqueado: true,
      liberaEm: em(25),
    });
  });

  it("ignora falhas posteriores a agora", () => {
    const falhas = [em(0), em(1), em(2), em(3), em(10)];
    expect(avaliarBloqueio(falhas, em(5))).toEqual({ bloqueado: false });
  });
});
