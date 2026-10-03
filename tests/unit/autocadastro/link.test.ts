import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  ERRO_EXPIRACAO_PASSADA,
  situacaoDoLink,
  validarExpiracao,
  type LinkEstado,
} from "@/modules/autocadastro/domain/link";

const d = (s: string) => s as DataCivil;
const hoje = d("2026-10-03");

const link = (e: Partial<LinkEstado> = {}): LinkEstado => ({
  desativadoEm: null,
  expiraEm: null,
  ...e,
});

describe("situacaoDoLink", () => {
  it("é ativo sem expiração e com a turma aberta", () => {
    expect(situacaoDoLink(link(), false, hoje)).toBe("ativo");
  });
  it("continua ativo no próprio dia da expiração", () => {
    expect(situacaoDoLink(link({ expiraEm: hoje }), false, hoje)).toBe("ativo");
  });
  it("é ativo com expiração futura", () => {
    expect(situacaoDoLink(link({ expiraEm: d("2026-10-04") }), false, hoje)).toBe("ativo");
  });
  it("é expirado depois do dia da expiração", () => {
    expect(situacaoDoLink(link({ expiraEm: d("2026-10-02") }), false, hoje)).toBe("expirado");
  });
  it("é desativado quando há data de desativação", () => {
    expect(situacaoDoLink(link({ desativadoEm: new Date() }), false, hoje)).toBe("desativado");
  });
  it("desativado prevalece sobre expirado", () => {
    expect(
      situacaoDoLink(link({ desativadoEm: new Date(), expiraEm: d("2026-01-01") }), false, hoje),
    ).toBe("desativado");
  });
  it("é desativado quando a turma está encerrada", () => {
    expect(situacaoDoLink(link(), true, hoje)).toBe("desativado");
    expect(situacaoDoLink(link({ expiraEm: d("2026-01-01") }), true, hoje)).toBe("desativado");
  });
});

describe("validarExpiracao", () => {
  it("aceita ausência de data", () => {
    expect(validarExpiracao(null, hoje)).toEqual({ ok: true });
  });
  it("aceita hoje e datas futuras", () => {
    expect(validarExpiracao(hoje, hoje)).toEqual({ ok: true });
    expect(validarExpiracao(d("2027-01-01"), hoje)).toEqual({ ok: true });
  });
  it("rejeita datas no passado com mensagem", () => {
    expect(validarExpiracao(d("2026-10-02"), hoje)).toEqual({
      ok: false,
      erro: ERRO_EXPIRACAO_PASSADA,
    });
    expect(ERRO_EXPIRACAO_PASSADA).toMatch(/inválida/);
  });
});
