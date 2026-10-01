import { z } from "zod";
import { normalizarBusca } from "@/modules/compartilhado/busca";

export interface TemaDados {
  titulo: string;
  descricao?: string;
}

/**
 * Validação do tema. Nenhuma issue é fatal (sem `abort`), para que todos os campos
 * inválidos sejam apontados de uma vez.
 */
export function criarTemaSchema(): z.ZodType<TemaDados> {
  return z.object({
    titulo: z
      .string({ error: "Informe o título" })
      .trim()
      .superRefine((titulo, ctx) => {
        if (titulo.length === 0) ctx.addIssue({ code: "custom", message: "Informe o título" });
        else if (titulo.length < 2 || titulo.length > 120)
          ctx.addIssue({ code: "custom", message: "O título deve ter entre 2 e 120 caracteres" });
      }),
    descricao: z
      .string()
      .trim()
      .max(2000, "A descrição deve ter no máximo 2000 caracteres")
      .optional()
      .transform((valor) => (valor ? valor : undefined)),
  });
}

/** Chave de comparação do título: minúsculas, sem acentos e sem espaços nas pontas. */
export function chaveDoTitulo(titulo: string): string {
  return normalizarBusca(titulo);
}

function porPosicao<T extends { posicao: number }>(a: T, b: T): number {
  return a.posicao - b.posicao;
}

/** Ativos por posição numerados de 1 a n; desativados ao fim, por posição, com `numero` null. */
export function numerarTemas<T extends { ativo: boolean; posicao: number }>(
  temas: readonly T[],
): (T & { numero: number | null })[] {
  const ativos = temas.filter((t) => t.ativo).sort(porPosicao);
  const desativados = temas.filter((t) => !t.ativo).sort(porPosicao);
  return [
    ...ativos.map((t, i) => ({ ...t, numero: i + 1 })),
    ...desativados.map((t) => ({ ...t, numero: null })),
  ];
}

/** Tema ativo imediatamente anterior ou posterior; null no limite, se inexistente ou desativado. */
export function vizinhoParaMover<T extends { id: string; ativo: boolean; posicao: number }>(
  temas: readonly T[],
  id: string,
  direcao: "subir" | "descer",
): T | null {
  const ativos = temas.filter((t) => t.ativo).sort(porPosicao);
  const indice = ativos.findIndex((t) => t.id === id);
  if (indice === -1) return null;
  return ativos[direcao === "subir" ? indice - 1 : indice + 1] ?? null;
}
