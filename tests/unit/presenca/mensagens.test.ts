import { describe, expect, it } from "vitest";
import {
  CODIGOS_AVISO,
  MSG_CONFLITO_DATA_RESERVA,
  MSG_ERRO_INESPERADO,
  MSG_FALTAM_MARCACOES,
  MSG_RESERVA_SEM_TURMA_ORIGEM,
  MSG_SEM_INSCRITOS,
  MSG_SITUACAO_MUDOU,
  MSG_TURMA_ENCERRADA,
  MSG_VISITANTE_DUPLICADO,
  MSG_VISITANTE_INDISPONIVEL,
  MSG_OPCAO_INDISPONIVEL,
  MSG_TEMA_JA_RESERVADO,
  MSG_VISITANTE_SEM_TEMA,
  mensagemDeAviso,
} from "@/modules/presenca/mensagens";
import { MSG_ERRO_INESPERADO as MSG_ERRO_TURMAS } from "@/modules/turmas/mensagens";

describe("mensagemDeAviso", () => {
  it.each([
    ["chamada-salva", "Chamada salva."],
    ["chamada-atualizada", "Chamada atualizada."],
    ["visitante-adicionado", "Visitante adicionado."],
    ["visitante-removido", "Visitante removido."],
    ["limite-salvo", "Limite salvo."],
    ["reserva-criada", "Reposição reservada."],
    ["reserva-cancelada", "Reserva cancelada."],
    ["ausencia-marcada", "Ausência registrada. O tema continua a repor."],
  ])("traduz %s", (codigo, texto) => {
    expect(mensagemDeAviso(codigo)).toBe(texto);
  });

  it("cobre exatamente os 8 códigos", () => {
    expect(CODIGOS_AVISO).toHaveLength(8);
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
    [["chamada-salva"]],
  ])("devolve null para %j", (valor) => {
    expect(mensagemDeAviso(valor)).toBeNull();
  });
});

describe("constantes", () => {
  it("têm os textos do design", () => {
    expect(MSG_TURMA_ENCERRADA).toBe("Esta turma está encerrada e não pode ser alterada.");
    expect(MSG_SITUACAO_MUDOU).toBe("A situação deste encontro mudou. Recarregue a página.");
    expect(MSG_VISITANTE_DUPLICADO).toBe("Este catequizando já consta na chamada deste encontro.");
    expect(MSG_VISITANTE_SEM_TEMA).toBe(
      "Visitantes só podem ser registrados em encontros com tema do programa.",
    );
    expect(MSG_VISITANTE_INDISPONIVEL).toBe(
      "Só é possível registrar como visitante um catequizando ativo e inscrito em outra turma aberta.",
    );
    expect(MSG_SEM_INSCRITOS).toBe("Não há catequizandos inscritos para registrar.");
    expect(MSG_FALTAM_MARCACOES).toBe("Marque a presença de todos os catequizandos.");
    expect(MSG_ERRO_INESPERADO).toBe(MSG_ERRO_TURMAS);
  });

  it("têm os textos de erro da reposição guiada", () => {
    expect(MSG_OPCAO_INDISPONIVEL).toBe("Este encontro não está mais disponível para reposição.");
    expect(MSG_CONFLITO_DATA_RESERVA).toBe(
      "O catequizando já tem reserva ou encontro da própria turma nesta data.",
    );
    expect(MSG_TEMA_JA_RESERVADO).toBe("Este tema já tem uma reserva ativa para o catequizando.");
    expect(MSG_RESERVA_SEM_TURMA_ORIGEM).toBe(
      "O catequizando não tem turma de origem, então não há reposição a reservar.",
    );
  });
});
