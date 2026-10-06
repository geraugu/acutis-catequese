/** Módulo puro (sem DAL nem servidor): importável por componente cliente (1.2). */
export type Papel = "coordenacao" | "catequista";

export interface AbaConfig {
  rotulo: "Resumo" | "Inscritos" | "Frequência" | "Encontros" | "Equipe e link";
  /** Segmento da rota abaixo de `turmas/[id]`; `null` é a página principal (Resumo). */
  segmento: null | "inscritos" | "frequencia" | "encontros" | "equipe";
}

/** As cinco abas, na ordem, iguais para os dois papéis (1.2). */
export const ABAS: readonly AbaConfig[] = [
  { rotulo: "Resumo", segmento: null },
  { rotulo: "Inscritos", segmento: "inscritos" },
  { rotulo: "Frequência", segmento: "frequencia" },
  { rotulo: "Encontros", segmento: "encontros" },
  { rotulo: "Equipe e link", segmento: "equipe" },
];
