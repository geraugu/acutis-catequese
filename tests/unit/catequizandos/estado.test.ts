import { describe, expect, it } from "vitest";
import {
  ESTADOS,
  ROTULO_ESTADO,
  operacoesDisponiveis,
  transicao,
  type EstadoCatequizando,
  type Operacao,
} from "@/modules/catequizandos/domain/estado";

const OPERACOES: Operacao[] = ["inativar", "reativar", "confirmar", "recusar"];

const esperado: Record<EstadoCatequizando, Record<Operacao, EstadoCatequizando | null>> = {
  pendente: { inativar: null, reativar: null, confirmar: "ativo", recusar: "inativo" },
  ativo: { inativar: "inativo", reativar: null, confirmar: null, recusar: null },
  inativo: { inativar: null, reativar: "ativo", confirmar: null, recusar: null },
};

describe("estado do catequizando", () => {
  it("ESTADOS coincide com o enum do banco", () => {
    expect(ESTADOS).toEqual(["pendente", "ativo", "inativo"]);
  });

  for (const atual of ["pendente", "ativo", "inativo"] as const) {
    for (const op of OPERACOES) {
      it(`transicao(${atual}, ${op}) = ${String(esperado[atual][op])}`, () => {
        expect(transicao(atual, op)).toBe(esperado[atual][op]);
      });
    }
  }

  it("operações disponíveis por estado", () => {
    expect(operacoesDisponiveis("pendente")).toEqual(["confirmar", "recusar"]);
    expect(operacoesDisponiveis("ativo")).toEqual(["inativar"]);
    expect(operacoesDisponiveis("inativo")).toEqual(["reativar"]);
  });

  it("rótulos em pt-BR", () => {
    expect(ROTULO_ESTADO).toEqual({ pendente: "Pendente", ativo: "Ativo", inativo: "Inativo" });
  });
});
