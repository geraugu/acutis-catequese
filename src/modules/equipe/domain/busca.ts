import { filtrarPorTermo } from "@/modules/compartilhado/busca";
import type { FiltroSituacao, Situacao } from "./membro";

export interface ItemBuscavel {
  nome: string;
  email: string;
  telefone: string | null;
  situacao: Situacao;
}

/** Especialização para a equipe: usa filtrarPorTermo (nome, e-mail e telefone) e depois filtra a situação. */
export function filtrarMembros<T extends ItemBuscavel>(
  itens: readonly T[],
  filtro: { termo?: string; situacao: FiltroSituacao },
): T[] {
  return filtrarPorTermo(itens, filtro.termo, (m) => ({
    textos: [m.nome, m.email],
    digitos: m.telefone,
  }))
    .filter((m) => filtro.situacao === "todos" || m.situacao === filtro.situacao)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
