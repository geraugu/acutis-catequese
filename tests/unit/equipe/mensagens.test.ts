import { describe, expect, it } from "vitest";
import {
  CODIGOS_AVISO,
  MENSAGEM_VIOLACAO,
  MSG_EMAIL_EM_USO,
  mensagemDeAviso,
} from "@/modules/equipe/mensagens";

describe("mensagens da equipe", () => {
  it("traduz os códigos de aviso conhecidos", () => {
    expect(mensagemDeAviso("cadastrado")).toBe("Membro cadastrado. Repasse a senha inicial pessoalmente.");
    expect(mensagemDeAviso("alteracoes-salvas")).toBe("Alterações salvas");
    expect(mensagemDeAviso("senha-redefinida")).toBe("Senha redefinida. Repasse a nova senha pessoalmente.");
    expect(mensagemDeAviso("inativado")).toBe("Membro inativado");
    expect(mensagemDeAviso("reativado")).toBe("Membro reativado");
    expect(CODIGOS_AVISO).toHaveLength(5);
  });

  it("código desconhecido, ausente ou herdado do protótipo resulta em nenhuma mensagem", () => {
    for (const c of ["x", "", undefined, null, ["cadastrado"], "toString", "constructor"]) {
      expect(mensagemDeAviso(c)).toBeNull();
    }
  });

  it("textos de e-mail em uso e das violações de proteção", () => {
    expect(MSG_EMAIL_EM_USO).toBe("Este e-mail já está em uso por outro membro.");
    expect(MENSAGEM_VIOLACAO).toEqual({
      "a-si-mesmo": "Você não pode inativar a sua própria conta.",
      "proprio-papel": "Você não pode remover o seu próprio papel de coordenação.",
      "ultima-coordenacao": "É preciso manter ao menos uma coordenação ativa.",
    });
  });
});
