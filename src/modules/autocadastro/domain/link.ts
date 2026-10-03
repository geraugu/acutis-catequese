import { compararDatas, type DataCivil } from "@/modules/compartilhado/datas";

export type SituacaoLink = "ativo" | "desativado" | "expirado";

export interface LinkEstado {
  desativadoEm: Date | null;
  expiraEm: DataCivil | null;
}

export const ERRO_EXPIRACAO_PASSADA = "Data de expiração inválida: não pode estar no passado.";

/**
 * Situação calculada do link. Turma encerrada ou link desativado resultam em
 * "desativado"; o link expira só ao fim do dia de `expiraEm`.
 */
export function situacaoDoLink(
  link: LinkEstado,
  turmaEncerrada: boolean,
  hoje: DataCivil,
): SituacaoLink {
  if (turmaEncerrada || link.desativadoEm) return "desativado";
  if (link.expiraEm && compararDatas(link.expiraEm, hoje) < 0) return "expirado";
  return "ativo";
}

/** A expiração é opcional e não pode estar no passado (hoje é aceito). */
export function validarExpiracao(
  data: DataCivil | null,
  hoje: DataCivil,
): { ok: true } | { ok: false; erro: string } {
  if (data && compararDatas(data, hoje) < 0) return { ok: false, erro: ERRO_EXPIRACAO_PASSADA };
  return { ok: true };
}
