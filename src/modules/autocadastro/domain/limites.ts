/**
 * Política de limites de envio do autocadastro (requisitos 4.1 a 4.3).
 * Janela fixa por origem e por link. Regra pura: não depende de framework, banco ou relógio.
 */
export interface PoliticaLimite {
  maximo: number;
  janelaMs: number;
}

const HORA_MS = 60 * 60_000;

export const POLITICA_LIMITES: { origem: PoliticaLimite; link: PoliticaLimite } = {
  origem: { maximo: 5, janelaMs: HORA_MS },
  link: { maximo: 60, janelaMs: HORA_MS },
};

export type JanelaLimite = { contagem: number; janelaInicio: Date };

/**
 * Sem janela ou com a janela expirada, abre uma nova a partir de `agora` com contagem 1.
 * Dentro da janela, permite enquanto `contagem < maximo` e incrementa; ao atingir o
 * máximo recusa e devolve a janela inalterada.
 */
export function avaliarLimite(
  atual: JanelaLimite | null,
  agora: Date,
  p: PoliticaLimite,
): { permitido: boolean; proxima: JanelaLimite } {
  if (!atual || agora.getTime() - atual.janelaInicio.getTime() >= p.janelaMs) {
    return { permitido: true, proxima: { contagem: 1, janelaInicio: agora } };
  }
  if (atual.contagem >= p.maximo) {
    return { permitido: false, proxima: { ...atual } };
  }
  return {
    permitido: true,
    proxima: { contagem: atual.contagem + 1, janelaInicio: atual.janelaInicio },
  };
}
