export const CODIGOS_AVISO = [
  "tema-criado",
  "alteracoes-salvas",
  "tema-desativado",
  "tema-reativado",
  "tema-excluido",
  "encontro-criado",
  "encontro-realizado",
  "encontro-cancelado",
  "encontro-reaberto",
] as const;
export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  "tema-criado": "Tema criado.",
  "alteracoes-salvas": "Alterações salvas.",
  "tema-desativado": "Tema desativado.",
  "tema-reativado": "Tema reativado.",
  "tema-excluido": "Tema excluído.",
  "encontro-criado": "Encontro criado.",
  "encontro-realizado": "Encontro realizado.",
  "encontro-cancelado": "Encontro cancelado.",
  "encontro-reaberto": "Encontro reaberto.",
};

export const MSG_TITULO_EM_USO = "Já existe um tema com este título.";
export const MSG_TEMA_EM_USO =
  "Este tema já foi usado em encontros e não pode ser excluído. Você pode desativá-lo.";
/** Também é a mensagem de campo do tema em `domain/encontro.ts`. */
export const MSG_TEMA_INDISPONIVEL = "Escolha um tema ativo do programa.";
export const MSG_CONFLITO_HORARIO = "Já existe um encontro desta turma nesse dia e horário.";
export const MSG_SO_PLANEJADO = "Só encontros planejados podem ser alterados.";
export const MSG_SITUACAO_MUDOU = "A situação deste encontro mudou. Recarregue a página.";
export const MSG_TURMA_ENCERRADA = "Esta turma está encerrada e não pode ser alterada.";

export function MSG_TEMA_REPETIDO(data: string): string {
  return `Este tema já tem encontro nesta turma em ${data}.`;
}

export function isCodigoAviso(valor: unknown): valor is CodigoAviso {
  return (CODIGOS_AVISO as readonly unknown[]).includes(valor);
}

/** Traduz o `?aviso=` da URL; só códigos conhecidos geram mensagem, o resto vira null. */
export function mensagemDeAviso(codigo: unknown): string | null {
  return isCodigoAviso(codigo) ? MENSAGEM_AVISO[codigo] : null;
}

export const MSG_ERRO_INESPERADO = "Não foi possível concluir agora. Tente novamente em instantes.";
