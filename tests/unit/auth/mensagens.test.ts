import { describe, expect, it } from "vitest";
import {
  MSG_BLOQUEIO,
  MSG_CONTA_DESABILITADA,
  MSG_CREDENCIAIS_INVALIDAS,
  MSG_ERRO_INESPERADO,
  mensagemDeErroLogin,
} from "@/modules/auth/mensagens";

describe("mensagens de erro de login", () => {
  it("textos do design", () => {
    expect(MSG_CREDENCIAIS_INVALIDAS).toBe("E-mail ou senha inválidos.");
    expect(MSG_CONTA_DESABILITADA).toBe("Seu acesso está desabilitado. Procure a coordenação.");
    expect(MSG_BLOQUEIO).toBe(
      "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
    );
    expect(MSG_ERRO_INESPERADO).toBe(
      "Não foi possível entrar agora. Tente novamente em instantes.",
    );
  });
  it("mapeia códigos e status", () => {
    expect(mensagemDeErroLogin({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      MSG_CREDENCIAIS_INVALIDAS,
    );
    expect(mensagemDeErroLogin({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      MSG_CREDENCIAIS_INVALIDAS,
    );
    expect(mensagemDeErroLogin({ status: 401 })).toBe(MSG_CREDENCIAIS_INVALIDAS);
    expect(mensagemDeErroLogin({ status: 403, code: "BANNED_USER" })).toBe(MSG_CONTA_DESABILITADA);
    expect(mensagemDeErroLogin({ status: 429 })).toBe(MSG_BLOQUEIO);
    expect(mensagemDeErroLogin({ status: 500 })).toBe(MSG_ERRO_INESPERADO);
    expect(mensagemDeErroLogin({ status: 503, code: "X" })).toBe(MSG_ERRO_INESPERADO);
  });
  it("desconhecido cai no erro inesperado", () => {
    for (const e of [undefined, null, "x", 42, {}, new Error("boom"), { code: "OUTRO" }]) {
      expect(mensagemDeErroLogin(e)).toBe(MSG_ERRO_INESPERADO);
    }
  });
});
