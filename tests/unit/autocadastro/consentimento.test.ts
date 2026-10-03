import { describe, expect, it } from "vitest";
import {
  TEXTO_CONSENTIMENTO,
  VERSAO_CONSENTIMENTO,
} from "@/modules/autocadastro/domain/consentimento";

describe("consentimento", () => {
  it("tem a versão 2026-10-01", () => {
    expect(VERSAO_CONSENTIMENTO).toBe("2026-10-01");
  });

  it("explica dados, finalidade, quem vê e o direito de pedir a exclusão", () => {
    const texto = TEXTO_CONSENTIMENTO.toLowerCase();
    expect(texto).toContain("catequese");
    expect(texto).toContain("coordenação");
    expect(texto).toContain("catequistas da turma");
    expect(texto).toContain("excluir");
  });
});
