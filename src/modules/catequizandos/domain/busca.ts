import { filtrarPorTermo } from "@/modules/compartilhado/busca";
import type { EstadoCatequizando, FiltroEstado } from "./estado";
import type { Sacramento } from "./ficha";

export interface CatequizandoBuscavel {
  nome: string;
  email: string | null;
  telefone: string;
  estado: EstadoCatequizando;
  sacramentosRecebidos: readonly Sacramento[];
}

export interface FiltrosCatequizandos {
  termo?: string;
  estado: FiltroEstado;
  semSacramento?: Sacramento;
}

const comparador = new Intl.Collator("pt-BR", { sensitivity: "base" });

/** Filtra por termo (nome, e-mail ou dígitos do telefone), estado e sacramento ausente; ordena por nome em pt-BR. */
export function filtrarCatequizandos<T extends CatequizandoBuscavel>(
  itens: readonly T[],
  { termo, estado, semSacramento }: FiltrosCatequizandos,
): T[] {
  return filtrarPorTermo(itens, termo, (item) => ({
    textos: item.email ? [item.nome, item.email] : [item.nome],
    digitos: item.telefone,
  }))
    .filter((item) => estado === "todos" || item.estado === estado)
    .filter((item) => !semSacramento || !item.sacramentosRecebidos.includes(semSacramento))
    .sort((a, b) => comparador.compare(a.nome, b.nome));
}
