import { describe, expect, it } from "vitest";
import { POLITICA_LIMITES, avaliarLimite } from "@/modules/autocadastro/domain/limites";

const MIN = 60_000;
const HORA = 60 * MIN;
const base = new Date("2026-01-01T10:00:00.000Z");
const em = (minutos: number) => new Date(base.getTime() + minutos * MIN);
const politica = { maximo: 3, janelaMs: HORA };

describe("POLITICA_LIMITES", () => {
  it("define 5 envios por origem e 60 por link, por hora", () => {
    expect(POLITICA_LIMITES).toEqual({
      origem: { maximo: 5, janelaMs: HORA },
      link: { maximo: 60, janelaMs: HORA },
    });
  });
});

describe("avaliarLimite", () => {
  it("permite o primeiro envio e abre uma janela a partir de agora", () => {
    expect(avaliarLimite(null, em(0), politica)).toEqual({
      permitido: true,
      proxima: { contagem: 1, janelaInicio: em(0) },
    });
  });

  it("permite e incrementa enquanto a contagem está abaixo do máximo", () => {
    expect(avaliarLimite({ contagem: 2, janelaInicio: em(0) }, em(30), politica)).toEqual({
      permitido: true,
      proxima: { contagem: 3, janelaInicio: em(0) },
    });
  });

  it("recusa ao atingir o máximo dentro da janela, sem alterar a contagem (4.1, 4.2)", () => {
    expect(avaliarLimite({ contagem: 3, janelaInicio: em(0) }, em(59), politica)).toEqual({
      permitido: false,
      proxima: { contagem: 3, janelaInicio: em(0) },
    });
  });

  it("reinicia a janela quando ela expira", () => {
    expect(avaliarLimite({ contagem: 3, janelaInicio: em(0) }, em(60), politica)).toEqual({
      permitido: true,
      proxima: { contagem: 1, janelaInicio: em(60) },
    });
  });

  it("aceita uma turma inteira pelo mesmo link no mesmo dia (4.3)", () => {
    let atual: { contagem: number; janelaInicio: Date } | null = null;
    for (let i = 0; i < 40; i++) {
      const r = avaliarLimite(atual, em(i), POLITICA_LIMITES.link);
      expect(r.permitido).toBe(true);
      atual = r.proxima;
    }
  });

  it("recusa o 6º envio da mesma origem na mesma hora", () => {
    let atual: { contagem: number; janelaInicio: Date } | null = null;
    for (let i = 0; i < 5; i++) {
      atual = avaliarLimite(atual, em(i), POLITICA_LIMITES.origem).proxima;
    }
    expect(avaliarLimite(atual, em(10), POLITICA_LIMITES.origem).permitido).toBe(false);
  });
});
