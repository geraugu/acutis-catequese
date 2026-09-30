import type { ViolacaoProtecao } from "./domain/protecao-coordenacao";

export const CODIGOS_AVISO = [
  "cadastrado",
  "alteracoes-salvas",
  "senha-redefinida",
  "inativado",
  "reativado",
] as const;
export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  cadastrado: "Membro cadastrado. Repasse a senha inicial pessoalmente.",
  "alteracoes-salvas": "Alterações salvas",
  "senha-redefinida": "Senha redefinida. Repasse a nova senha pessoalmente.",
  inativado: "Membro inativado",
  reativado: "Membro reativado",
};

export const MSG_EMAIL_EM_USO = "Este e-mail já está em uso por outro membro.";

export const MENSAGEM_VIOLACAO: Record<ViolacaoProtecao, string> = {
  "a-si-mesmo": "Você não pode inativar a sua própria conta.",
  "proprio-papel": "Você não pode remover o seu próprio papel de coordenação.",
  "ultima-coordenacao": "É preciso manter ao menos uma coordenação ativa.",
};

export function isCodigoAviso(valor: unknown): valor is CodigoAviso {
  return (CODIGOS_AVISO as readonly unknown[]).includes(valor);
}

/** Traduz o `?aviso=` da URL; só códigos conhecidos geram mensagem, o resto vira null. */
export function mensagemDeAviso(codigo: unknown): string | null {
  return isCodigoAviso(codigo) ? MENSAGEM_AVISO[codigo] : null;
}
