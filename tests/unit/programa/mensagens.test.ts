import { describe, expect, it } from "vitest";
import {
  CODIGOS_AVISO,
  MSG_CONFLITO_HORARIO,
  MSG_ERRO_INESPERADO,
  MSG_SITUACAO_MUDOU,
  MSG_SO_PLANEJADO,
  MSG_TEMA_EM_USO,
  MSG_TEMA_INDISPONIVEL,
  MSG_TEMA_REPETIDO,
  MSG_TITULO_EM_USO,
  MSG_TURMA_ENCERRADA,
  mensagemDeAviso,
} from "@/modules/programa/mensagens";
import { MSG_ERRO_INESPERADO as MSG_ERRO_TURMAS } from "@/modules/turmas/mensagens";

describe("mensagemDeAviso", () => {
  it.each([
    ["tema-criado", "Tema criado."],
    ["alteracoes-salvas", "Alterações salvas."],
    ["tema-desativado", "Tema desativado."],
    ["tema-reativado", "Tema reativado."],
    ["tema-excluido", "Tema excluído."],
    ["encontro-criado", "Encontro criado."],
    ["encontro-realizado", "Encontro realizado."],
    ["encontro-cancelado", "Encontro cancelado."],
    ["encontro-reaberto", "Encontro reaberto."],
  ])("traduz %s", (codigo, texto) => {
    expect(mensagemDeAviso(codigo)).toBe(texto);
  });

  it("cobre exatamente os 9 códigos", () => {
    expect(CODIGOS_AVISO).toHaveLength(9);
  });

  it.each([
    ["desconhecido"],
    ["toString"],
    ["constructor"],
    [""],
    [undefined],
    [null],
    [1],
    [{}],
    [["tema-criado"]],
  ])("devolve null para %j", (valor) => {
    expect(mensagemDeAviso(valor)).toBeNull();
  });
});

describe("constantes", () => {
  it("têm os textos do design", () => {
    expect(MSG_TITULO_EM_USO).toBe("Já existe um tema com este título.");
    expect(MSG_TEMA_EM_USO).toBe(
      "Este tema já foi usado em encontros e não pode ser excluído. Você pode desativá-lo.",
    );
    expect(MSG_TEMA_INDISPONIVEL).toBe("Escolha um tema ativo do programa.");
    expect(MSG_CONFLITO_HORARIO).toBe("Já existe um encontro desta turma nesse dia e horário.");
    expect(MSG_SO_PLANEJADO).toBe("Só encontros planejados podem ser alterados.");
    expect(MSG_SITUACAO_MUDOU).toBe("A situação deste encontro mudou. Recarregue a página.");
    expect(MSG_TURMA_ENCERRADA).toBe("Esta turma está encerrada e não pode ser alterada.");
    expect(MSG_ERRO_INESPERADO).toBe(MSG_ERRO_TURMAS);
  });

  it("MSG_TEMA_REPETIDO interpola a data", () => {
    expect(MSG_TEMA_REPETIDO("03/10/2026")).toBe(
      "Este tema já tem encontro nesta turma em 03/10/2026.",
    );
  });
});
