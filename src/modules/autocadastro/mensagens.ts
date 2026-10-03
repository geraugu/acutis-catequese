/** Mensagens do autocadastro público (Error Handling do design). */
export const MSG_INDISPONIVEL = "Este link não está mais disponível. Fale com seu catequista.";
export const MSG_LIMITE = "Muitas tentativas. Tente novamente mais tarde.";
export const MSG_CONSENTIMENTO = "Para enviar, é preciso concordar com o uso dos dados.";
export const MSG_RECEBIDA = "Recebemos sua ficha! Seu catequista vai revisá-la em breve.";

/** Nome do checkbox de consentimento no formulário público (marcado = "on"). */
export const CAMPO_CONSENTIMENTO = "consentimento";

/** Mensagens da gestão do link (área autenticada). */
export const MSG_LINK_JA_ATIVO = "A turma já tem um link ativo.";

export const CODIGOS_AVISO = [
  "link-gerado",
  "link-desativado",
  "link-regenerado",
  "expiracao-salva",
] as const;

export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  "link-gerado": "Link gerado.",
  "link-desativado": "Link desativado",
  "link-regenerado": "Novo link gerado",
  "expiracao-salva": "Expiração salva.",
};

function isCodigoAviso(valor: unknown): valor is CodigoAviso {
  return (CODIGOS_AVISO as readonly unknown[]).includes(valor);
}

/** Traduz o `?aviso=` da URL; só códigos conhecidos geram mensagem. */
export function mensagemDeAviso(codigo: unknown): string | null {
  return isCodigoAviso(codigo) ? MENSAGEM_AVISO[codigo] : null;
}

export const MSG_TURMA_ENCERRADA = "Esta turma está encerrada e não pode ser alterada.";
export const MSG_ERRO_INESPERADO = "Não foi possível concluir agora. Tente novamente em instantes.";
