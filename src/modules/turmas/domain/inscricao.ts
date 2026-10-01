import { compararDatas, type DataCivil } from "@/modules/compartilhado/datas";

export const MOTIVOS_SAIDA = [
  "desligamento",
  "transferencia",
  "encerramento",
  "inativacao",
] as const;
export type MotivoSaida = (typeof MOTIVOS_SAIDA)[number];

export const ROTULO_MOTIVO: Record<MotivoSaida, string> = {
  desligamento: "Desligamento",
  transferencia: "Transferência",
  encerramento: "Encerramento da turma",
  inativacao: "Inativação",
};

const DATA_INVALIDA = "Data inválida";

/** Entrada não pode ser futura nem anterior ao nascimento. */
export function validarDataEntrada(
  data: DataCivil,
  nascimento: DataCivil,
  hoje: DataCivil,
): string | null {
  if (compararDatas(data, hoje) > 0 || compararDatas(data, nascimento) < 0) return DATA_INVALIDA;
  return null;
}

/** Saída não pode ser futura nem anterior à entrada. */
export function validarDataSaida(
  data: DataCivil,
  entrada: DataCivil,
  hoje: DataCivil,
): string | null {
  if (compararDatas(data, hoje) > 0 || compararDatas(data, entrada) < 0) return DATA_INVALIDA;
  return null;
}
