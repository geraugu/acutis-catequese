export const MSG_CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos.";
export const MSG_CONTA_DESABILITADA = "Seu acesso está desabilitado. Procure a coordenação.";
export const MSG_BLOQUEIO = "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
export const MSG_ERRO_INESPERADO = "Não foi possível entrar agora. Tente novamente em instantes.";

export const CODIGO_CREDENCIAIS_INVALIDAS = "INVALID_EMAIL_OR_PASSWORD";
export const CODIGO_CONTA_DESABILITADA = "BANNED_USER";
export const STATUS_BLOQUEIO = 429;

export type ErroLogin = { status?: number; code?: string };

/** Mapeia um erro de login para a mensagem do design; desconhecido → erro inesperado. */
export function mensagemDeErroLogin(erro: ErroLogin | unknown): string {
  if (typeof erro !== "object" || erro === null) return MSG_ERRO_INESPERADO;
  const { status, code } = erro as Record<string, unknown>;
  if (code === CODIGO_CONTA_DESABILITADA) return MSG_CONTA_DESABILITADA;
  if (code === CODIGO_CREDENCIAIS_INVALIDAS) return MSG_CREDENCIAIS_INVALIDAS;
  if (status === STATUS_BLOQUEIO) return MSG_BLOQUEIO;
  if (status === 401) return MSG_CREDENCIAIS_INVALIDAS;
  return MSG_ERRO_INESPERADO;
}
