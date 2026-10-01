export type FiltroSituacaoTurma = "abertas" | "encerradas" | "todas";

/** O ciclo mais recente existente, ou o ano atual quando não há turmas (3.2). */
export function cicloPadrao(ciclos: readonly number[], anoAtual: number): number {
  return ciclos.length === 0 ? anoAtual : Math.max(...ciclos);
}

/** Filtra por situação e ciclo (3.1, 3.2). */
export function filtrarTurmas<T extends { encerrada: boolean; ciclo: number }>(
  turmas: readonly T[],
  filtro: { situacao: FiltroSituacaoTurma; ciclo: number | "todos" },
): T[] {
  return turmas.filter((t) => {
    if (filtro.situacao === "abertas" && t.encerrada) return false;
    if (filtro.situacao === "encerradas" && !t.encerrada) return false;
    return filtro.ciclo === "todos" || t.ciclo === filtro.ciclo;
  });
}
