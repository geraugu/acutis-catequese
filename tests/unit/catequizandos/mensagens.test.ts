import { describe, expect, it } from "vitest";

import {
  CODIGOS_AVISO,
  isCodigoAviso,
  mensagemDeAviso,
  MSG_ERRO_INESPERADO,
  MSG_FICHA_INVALIDA,
  MSG_POSSIVEL_DUPLICADO,
  MSG_TRANSICAO_INVALIDA,
} from "@/modules/catequizandos/mensagens";

describe("mensagemDeAviso", () => {
  it.each([
    ["cadastrado", "Catequizando cadastrado."],
    ["alteracoes-salvas", "Alterações salvas."],
    ["inativado", "Catequizando inativado."],
    ["reativado", "Catequizando reativado."],
    ["ficha-confirmada", "Ficha confirmada."],
    ["ficha-recusada", "Ficha recusada."],
  ])("traduz %s", (codigo, texto) => {
    expect(isCodigoAviso(codigo)).toBe(true);
    expect(mensagemDeAviso(codigo)).toBe(texto);
  });

  it("cobre exatamente os seis códigos", () => {
    expect(CODIGOS_AVISO).toHaveLength(6);
  });

  it.each([
    ["desconhecido"],
    [""],
    [null],
    [undefined],
    [["cadastrado"]],
    ["toString"],
    ["constructor"],
    ["__proto__"],
    [42],
  ])("retorna null para %j", (valor) => {
    expect(isCodigoAviso(valor)).toBe(false);
    expect(mensagemDeAviso(valor)).toBeNull();
  });
});

describe("constantes", () => {
  it("têm os textos do design", () => {
    expect(MSG_POSSIVEL_DUPLICADO).toBe(
      "Já existe um catequizando com este nome e data de nascimento.",
    );
    expect(MSG_FICHA_INVALIDA).toBe(
      "A ficha tem dados que precisam ser corrigidos. Edite a ficha antes de confirmar.",
    );
    expect(MSG_TRANSICAO_INVALIDA).toBe("Esta ação não está disponível para a situação atual.");
    expect(MSG_ERRO_INESPERADO).toBe(
      "Não foi possível concluir agora. Tente novamente em instantes.",
    );
  });
});
