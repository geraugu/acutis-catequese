import { describe, expect, it } from "vitest";

import {
  MSG_CATEQUISTA_INDISPONIVEL,
  MSG_CATEQUIZANDO_INATIVO,
  MSG_ERRO_INESPERADO,
  MSG_JA_INSCRITO,
  MSG_LOTADA,
  MSG_NOME_EM_USO,
  MSG_TRANSFERIR,
  MSG_TURMA_ENCERRADA,
  mensagemDeAviso,
} from "@/modules/turmas/mensagens";

describe("mensagens de turmas", () => {
  it.each([
    ["turma-criada", "Turma criada."],
    ["alteracoes-salvas", "Alterações salvas."],
    ["turma-encerrada", "Turma encerrada."],
    ["catequista-designado", "Catequista designado."],
    ["catequista-removido", "Catequista removido."],
    ["inscrito", "Catequizando inscrito."],
    ["transferido", "Catequizando transferido."],
    ["desligado", "Catequizando desligado."],
  ])("traduz o aviso %s", (codigo, texto) => {
    expect(mensagemDeAviso(codigo)).toBe(texto);
  });

  it.each([["desconhecido"], [""], [undefined], [null], [42], [["inscrito"]], ["toString"]])(
    "devolve null para %j",
    (codigo) => {
      expect(mensagemDeAviso(codigo)).toBeNull();
    },
  );

  it("expõe as constantes de erro", () => {
    expect(MSG_NOME_EM_USO).toBe("Já existe uma turma aberta com este nome neste ciclo.");
    expect(MSG_TURMA_ENCERRADA).toBe("Esta turma está encerrada e não pode ser alterada.");
    expect(MSG_JA_INSCRITO).toBe("Este catequizando já está inscrito nesta turma.");
    expect(MSG_CATEQUIZANDO_INATIVO).toBe("Este catequizando não está ativo.");
    expect(MSG_CATEQUISTA_INDISPONIVEL).toBe(
      "Este catequista não pode ser designado para esta turma.",
    );
    expect(MSG_ERRO_INESPERADO).toBe(
      "Não foi possível concluir agora. Tente novamente em instantes.",
    );
  });

  it("monta as mensagens parametrizadas", () => {
    expect(MSG_TRANSFERIR("Turma A")).toBe("Já inscrito na turma Turma A. Deseja transferir?");
    expect(MSG_LOTADA(20, 20)).toBe("Turma lotada (20 de 20 vagas).");
  });
});
