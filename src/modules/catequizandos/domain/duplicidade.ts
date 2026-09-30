import { normalizarBusca } from "@/modules/compartilhado/busca";
import type { DataCivil } from "@/modules/compartilhado/datas";

export interface RegistroDuplicidade {
  id: string;
  nome: string;
  dataNascimento: DataCivil;
}

/** Chave de duplicidade: nome normalizado (sem caixa, acento e espaços extras) + data de nascimento. */
export function chaveDuplicidade(nome: string, dataNascimento: DataCivil): string {
  return `${normalizarBusca(nome)}|${dataNascimento}`;
}

export function encontrarDuplicado<T extends RegistroDuplicidade>(
  existentes: readonly T[],
  nome: string,
  dataNascimento: DataCivil,
  ignorarId?: string,
): T | undefined {
  const chave = chaveDuplicidade(nome, dataNascimento);
  return existentes.find(
    (e) => e.id !== ignorarId && chaveDuplicidade(e.nome, e.dataNascimento) === chave,
  );
}
