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
  "ficha-confirmada",
] as const;

export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  "link-gerado": "Link gerado.",
  "link-desativado": "Link desativado",
  "link-regenerado": "Novo link gerado",
  "expiracao-salva": "Expiração salva.",
  "ficha-confirmada": "Ficha confirmada e inscrita na turma",
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

/** Mensagens da revisão de fichas (Error Handling do design). */
export const MSG_JA_REVISADA = "Esta ficha já foi revisada.";
export const MSG_TURMA_ENCERRADA_FICHA =
  "A turma está encerrada. A coordenação pode tratar a ficha em Catequizandos.";
export const MSG_FICHA_INVALIDA = "A ficha tem campos inválidos. Corrija-os antes de confirmar.";
