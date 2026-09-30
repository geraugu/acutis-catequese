import { describe, expect, it } from "vitest";
import type { Papel } from "@/modules/auth/domain/papeis";
import type { Situacao } from "@/modules/equipe/domain/membro";
import {
  verificarProtecaoCoordenacao,
  type OperacaoSensivel,
} from "@/modules/equipe/domain/protecao-coordenacao";

const INATIVAR: OperacaoSensivel = { tipo: "inativar" };
const PARA_CATEQUISTA: OperacaoSensivel = { tipo: "mudar-papel", novoPapel: "catequista" };
const PARA_COORDENACAO: OperacaoSensivel = { tipo: "mudar-papel", novoPapel: "coordenacao" };

function verificar(
  alvo: { id?: string; papel: Papel; situacao?: Situacao },
  operacao: OperacaoSensivel,
  coordenacoesAtivas: number,
  atorId = "ator",
) {
  return verificarProtecaoCoordenacao({
    atorId,
    alvo: { id: alvo.id ?? "outro", papel: alvo.papel, situacao: alvo.situacao ?? "ativo" },
    operacao,
    coordenacoesAtivas,
  });
}

describe("verificarProtecaoCoordenacao — a si mesmo (7.1, 7.2)", () => {
  it("inativar a si mesmo resulta em a-si-mesmo", () => {
    expect(verificar({ id: "ator", papel: "coordenacao" }, INATIVAR, 5)).toBe("a-si-mesmo");
  });
  it("inativar a si mesmo é a-si-mesmo mesmo sendo a última coordenação", () => {
    expect(verificar({ id: "ator", papel: "coordenacao" }, INATIVAR, 1)).toBe("a-si-mesmo");
  });
  it("mudar o próprio papel para catequista resulta em proprio-papel", () => {
    expect(verificar({ id: "ator", papel: "coordenacao" }, PARA_CATEQUISTA, 5)).toBe(
      "proprio-papel",
    );
    expect(verificar({ id: "ator", papel: "coordenacao" }, PARA_CATEQUISTA, 1)).toBe(
      "proprio-papel",
    );
  });
  it("mudar o próprio papel para o mesmo papel nunca é violação", () => {
    expect(verificar({ id: "ator", papel: "coordenacao" }, PARA_COORDENACAO, 1)).toBeNull();
  });
});

describe("verificarProtecaoCoordenacao — última coordenação (7.3)", () => {
  it("inativar a única coordenação ativa resulta em ultima-coordenacao", () => {
    expect(verificar({ papel: "coordenacao" }, INATIVAR, 1)).toBe("ultima-coordenacao");
    expect(verificar({ papel: "coordenacao" }, INATIVAR, 0)).toBe("ultima-coordenacao");
  });
  it("rebaixar a única coordenação ativa resulta em ultima-coordenacao", () => {
    expect(verificar({ papel: "coordenacao" }, PARA_CATEQUISTA, 1)).toBe("ultima-coordenacao");
  });
  it("com mais de uma coordenação ativa, inativar ou rebaixar outra é permitido", () => {
    expect(verificar({ papel: "coordenacao" }, INATIVAR, 2)).toBeNull();
    expect(verificar({ papel: "coordenacao" }, PARA_CATEQUISTA, 2)).toBeNull();
  });
  it("alvo coordenação inativa não aciona a regra", () => {
    expect(verificar({ papel: "coordenacao", situacao: "inativo" }, INATIVAR, 1)).toBeNull();
    expect(verificar({ papel: "coordenacao", situacao: "inativo" }, PARA_CATEQUISTA, 1)).toBeNull();
  });
  it("alvo catequista nunca aciona a regra da última coordenação", () => {
    for (const situacao of ["ativo", "inativo"] as const) {
      for (const n of [0, 1, 2]) {
        expect(verificar({ papel: "catequista", situacao }, INATIVAR, n)).toBeNull();
        expect(verificar({ papel: "catequista", situacao }, PARA_CATEQUISTA, n)).toBeNull();
        expect(verificar({ papel: "catequista", situacao }, PARA_COORDENACAO, n)).toBeNull();
      }
    }
  });
  it("mudar coordenação para coordenação nunca é violação", () => {
    expect(verificar({ papel: "coordenacao" }, PARA_COORDENACAO, 1)).toBeNull();
  });
});
