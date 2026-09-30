import type { FiltroSituacao, Situacao } from "./membro";

const TAMANHO_PAGINA = 20;

/** Minúsculas, sem acentos (NFD sem diacríticos) e com espaços colapsados. */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface ItemBuscavel {
  nome: string;
  email: string;
  telefone: string | null;
  situacao: Situacao;
}

/** Genérico e reutilizável: casa o termo com campos de texto normalizados ou com dígitos. Termo vazio casa com tudo. */
export function filtrarPorTermo<T>(
  itens: readonly T[],
  termo: string | undefined,
  campos: (item: T) => { textos: string[]; digitos?: string | null },
): T[] {
  const termoNormalizado = normalizarBusca(termo ?? "");
  if (termoNormalizado === "") return [...itens];
  const termoDigitos = termoNormalizado.replace(/\D/g, "");

  return itens.filter((item) => {
    const { textos, digitos } = campos(item);
    if (textos.some((texto) => normalizarBusca(texto).includes(termoNormalizado))) return true;
    if (termoDigitos === "" || !digitos) return false;
    return digitos.replace(/\D/g, "").includes(termoDigitos);
  });
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

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
}

/** Restringe a página ao intervalo válido: inválida ou menor que 1 vira 1; acima do total vira a última. */
export function paginar<T>(
  itens: readonly T[],
  pagina: number,
  tamanho: number = TAMANHO_PAGINA,
): Pagina<T> {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const inteira = Number.isFinite(pagina) ? Math.trunc(pagina) : 1;
  const atual = Math.min(Math.max(inteira, 1), totalPaginas);
  const inicio = (atual - 1) * tamanho;
  return { itens: itens.slice(inicio, inicio + tamanho), pagina: atual, totalPaginas, total };
}
