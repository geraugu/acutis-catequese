export const CODIGOS_AVISO = [
  "chamada-salva",
  "chamada-atualizada",
  "visitante-adicionado",
  "visitante-removido",
  "limite-salvo",
] as const;
export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  "chamada-salva": "Chamada salva.",
  "chamada-atualizada": "Chamada atualizada.",
  "visitante-adicionado": "Visitante adicionado.",
  "visitante-removido": "Visitante removido.",
  "limite-salvo": "Limite salvo.",
};

export const MSG_TURMA_ENCERRADA = "Esta turma está encerrada e não pode ser alterada.";
export const MSG_SITUACAO_MUDOU = "A situação deste encontro mudou. Recarregue a página.";
export const MSG_VISITANTE_DUPLICADO = "Este catequizando já consta na chamada deste encontro.";
export const MSG_VISITANTE_SEM_TEMA =
  "Visitantes só podem ser registrados em encontros com tema do programa.";
export const MSG_VISITANTE_INDISPONIVEL =
  "Só é possível registrar como visitante um catequizando ativo e inscrito em outra turma aberta.";
export const MSG_SEM_INSCRITOS = "Não há catequizandos inscritos para registrar.";
export const MSG_FALTAM_MARCACOES = "Marque a presença de todos os catequizandos.";
export const MSG_ERRO_INESPERADO = "Não foi possível concluir agora. Tente novamente em instantes.";

export function isCodigoAviso(valor: unknown): valor is CodigoAviso {
  return (CODIGOS_AVISO as readonly unknown[]).includes(valor);
}

/** Traduz o `?aviso=` da URL; só códigos conhecidos geram mensagem, o resto vira null. */
export function mensagemDeAviso(codigo: unknown): string | null {
  return isCodigoAviso(codigo) ? MENSAGEM_AVISO[codigo] : null;
}
