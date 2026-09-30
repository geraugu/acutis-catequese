export const CODIGOS_AVISO = [
  "cadastrado",
  "alteracoes-salvas",
  "inativado",
  "reativado",
  "ficha-confirmada",
  "ficha-recusada",
] as const;
export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  cadastrado: "Catequizando cadastrado.",
  "alteracoes-salvas": "Alterações salvas.",
  inativado: "Catequizando inativado.",
  reativado: "Catequizando reativado.",
  "ficha-confirmada": "Ficha confirmada.",
  "ficha-recusada": "Ficha recusada.",
};

export const MSG_POSSIVEL_DUPLICADO =
  "Já existe um catequizando com este nome e data de nascimento.";
export const MSG_FICHA_INVALIDA =
  "A ficha tem dados que precisam ser corrigidos. Edite a ficha antes de confirmar.";
export const MSG_TRANSICAO_INVALIDA = "Esta ação não está disponível para a situação atual.";
export const MSG_ERRO_INESPERADO = "Não foi possível concluir agora. Tente novamente em instantes.";

export function isCodigoAviso(valor: unknown): valor is CodigoAviso {
  return (CODIGOS_AVISO as readonly unknown[]).includes(valor);
}

/** Traduz o `?aviso=` da URL; só códigos conhecidos geram mensagem, o resto vira null. */
export function mensagemDeAviso(codigo: unknown): string | null {
  return isCodigoAviso(codigo) ? MENSAGEM_AVISO[codigo] : null;
}
