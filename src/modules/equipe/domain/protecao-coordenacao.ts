import type { Papel } from "@/modules/auth/domain/papeis";
import type { Situacao } from "./membro";

export type OperacaoSensivel = { tipo: "inativar" } | { tipo: "mudar-papel"; novoPapel: Papel };

export type ViolacaoProtecao = "a-si-mesmo" | "proprio-papel" | "ultima-coordenacao";

/** Regras de proteção da coordenação (Req 7.1, 7.2, 7.3). Retorna null quando a operação é permitida. */
export function verificarProtecaoCoordenacao(entrada: {
  atorId: string;
  alvo: { id: string; papel: Papel; situacao: Situacao };
  operacao: OperacaoSensivel;
  coordenacoesAtivas: number;
}): ViolacaoProtecao | null {
  const { atorId, alvo, operacao, coordenacoesAtivas } = entrada;

  // Mudar para o mesmo papel nunca é uma violação.
  if (operacao.tipo === "mudar-papel" && operacao.novoPapel === alvo.papel) return null;

  if (alvo.id === atorId) {
    if (operacao.tipo === "inativar") return "a-si-mesmo";
    if (operacao.novoPapel === "catequista") return "proprio-papel";
  }

  const removeDaCoordenacaoAtiva =
    alvo.papel === "coordenacao" &&
    alvo.situacao === "ativo" &&
    (operacao.tipo === "inativar" || operacao.novoPapel !== "coordenacao");

  if (removeDaCoordenacaoAtiva && coordenacoesAtivas <= 1) return "ultima-coordenacao";

  return null;
}
