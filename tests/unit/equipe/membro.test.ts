import { describe, expect, it } from "vitest";
import { membroCriacaoSchema, membroEdicaoSchema, papelSchema } from "@/modules/equipe/domain/membro";

const valido = {
  nome: "  Maria da Silva ",
  email: "  Maria@Paroquia.ORG ",
  telefone: "(11) 98765-4321",
  papel: "catequista",
  observacoes: "",
};

function mensagens(resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((resultado.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));
}

describe("membroEdicaoSchema", () => {
  it("normaliza nome, e-mail e telefone e transforma observações vazias em undefined", () => {
    const r = membroEdicaoSchema.parse(valido);
    expect(r).toEqual({ nome: "Maria da Silva", email: "maria@paroquia.org", telefone: "11987654321", papel: "catequista", observacoes: undefined });
  });

  it("observações só com espaços viram undefined; texto é aparado", () => {
    expect(membroEdicaoSchema.parse({ ...valido, observacoes: "   " }).observacoes).toBeUndefined();
    expect(membroEdicaoSchema.parse({ ...valido, observacoes: " Turma A " }).observacoes).toBe("Turma A");
    const semObs: Partial<typeof valido> = { ...valido };
    delete semObs.observacoes;
    expect(membroEdicaoSchema.parse(semObs).observacoes).toBeUndefined();
  });

  it("campos obrigatórios vazios retornam mensagens em pt-BR", () => {
    const r = membroEdicaoSchema.safeParse({ nome: " ", email: "", telefone: "", papel: "" });
    expect(r.success).toBe(false);
    expect(mensagens(r)).toEqual({
      nome: "Informe o nome",
      email: "Informe o e-mail",
      telefone: "Informe um telefone com DDD",
      papel: "Escolha o papel",
    });
  });

  it("recusa e-mail inválido e papel inválido", () => {
    expect(mensagens(membroEdicaoSchema.safeParse({ ...valido, email: "nao-email" })).email).toBe("E-mail inválido");
    expect(mensagens(membroEdicaoSchema.safeParse({ ...valido, papel: "admin" })).papel).toBe("Escolha o papel");
    expect(papelSchema.safeParse("coordenacao").success).toBe(true);
  });

  it("limita nome a 120 e observações a 1000 caracteres", () => {
    expect(membroEdicaoSchema.safeParse({ ...valido, nome: "a".repeat(121) }).success).toBe(false);
    expect(membroEdicaoSchema.safeParse({ ...valido, observacoes: "a".repeat(1001) }).success).toBe(false);
  });
});

describe("membroCriacaoSchema", () => {
  it("exige senha com no mínimo 8 caracteres", () => {
    const r = membroCriacaoSchema.safeParse({ ...valido, senha: "1234567" });
    expect(mensagens(r).senha).toBe("A senha deve ter no mínimo 8 caracteres");
    expect(membroCriacaoSchema.parse({ ...valido, senha: "12345678" }).senha).toBe("12345678");
  });
});
