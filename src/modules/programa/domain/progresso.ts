import type { SituacaoEncontro } from "./encontro";

export interface TemaDoProgresso {
  id: string;
  titulo: string;
  numero: number;
}

export interface Progresso {
  realizados: number;
  total: number;
  pendentes: TemaDoProgresso[];
}

/**
 * Progresso da turma no programa: `total` é o número de temas ativos; `realizados`, os temas
 * ativos com ao menos um encontro realizado; `pendentes`, o restante, na ordem recebida.
 * Encontros sem tema, não realizados ou de temas fora da lista (desativados) não contam.
 */
export function calcularProgresso(
  temasAtivos: readonly TemaDoProgresso[],
  encontros: readonly { temaId: string | null; situacao: SituacaoEncontro }[],
): Progresso {
  const realizadosIds = new Set<string>();
  for (const encontro of encontros) {
    if (encontro.situacao === "realizado" && encontro.temaId !== null)
      realizadosIds.add(encontro.temaId);
  }
  const pendentes = temasAtivos
    .filter((tema) => !realizadosIds.has(tema.id))
    .map(({ id, titulo, numero }) => ({ id, titulo, numero }));
  return {
    realizados: temasAtivos.length - pendentes.length,
    total: temasAtivos.length,
    pendentes,
  };
}
