/**
 * Política de bloqueio por tentativas falhas de login (requisitos 4.1 e 4.3).
 * Regra pura: não depende de framework, banco ou relógio do sistema.
 */
export const POLITICA_BLOQUEIO = {
  maxFalhas: 5,
  janelaMs: 15 * 60_000,
  duracaoBloqueioMs: 15 * 60_000,
} as const;

/** Período de falhas que a consulta precisa buscar para avaliar o bloqueio (30 min). */
export const JANELA_CONSULTA_FALHAS_MS =
  POLITICA_BLOQUEIO.janelaMs + POLITICA_BLOQUEIO.duracaoBloqueioMs;

export type ResultadoBloqueio = { bloqueado: false } | { bloqueado: true; liberaEm: Date };

/**
 * falhas: instantes das falhas do e-mail (qualquer ordem).
 * O bloqueio começa na 5ª falha dentro de uma janela de 15 min e dura 15 min a partir dela.
 * Procura a falha mais recente `f` com ≥ 5 falhas em `[f − janela, f]`; bloqueado se `agora < f + duração`.
 * Falhas posteriores a `agora` são ignoradas.
 */
export function avaliarBloqueio(falhas: readonly Date[], agora: Date): ResultadoBloqueio {
  const { maxFalhas, janelaMs, duracaoBloqueioMs } = POLITICA_BLOQUEIO;
  const agoraMs = agora.getTime();
  const instantes = falhas
    .map((f) => f.getTime())
    .filter((t) => t <= agoraMs)
    .sort((a, b) => a - b);

  for (let i = instantes.length - 1; i >= maxFalhas - 1; i--) {
    const f = instantes[i]!;
    const inicio = instantes[i - (maxFalhas - 1)]!;
    if (f - inicio <= janelaMs) {
      const liberaEm = f + duracaoBloqueioMs;
      return agoraMs < liberaEm
        ? { bloqueado: true, liberaEm: new Date(liberaEm) }
        : { bloqueado: false };
    }
  }
  return { bloqueado: false };
}
