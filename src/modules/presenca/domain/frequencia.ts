import { z } from "zod";

export const STATUS_PRESENCA = ["presente", "ausente", "justificado"] as const;
export type StatusPresenca = (typeof STATUS_PRESENCA)[number];

/** Limite de frequência quando a coordenação ainda não definiu outro (7.1). */
export const LIMITE_PADRAO = 75;

export interface ContagemFrequencia {
  presentes: number;
  ausentes: number;
  justificados: number;
  /** presentes + ausentes + justificados */
  total: number;
}

export interface Frequencia extends ContagemFrequencia {
  /** Inteiro de 0 a 100; null quando não há encontros (total 0). */
  percentual: number | null;
}

/** Conta os status de uma lista de presenças já filtrada (5.3). */
export function contarPresencas(status: readonly StatusPresenca[]): ContagemFrequencia {
  let presentes = 0;
  let ausentes = 0;
  let justificados = 0;
  for (const s of status) {
    if (s === "presente") presentes += 1;
    else if (s === "ausente") ausentes += 1;
    else justificados += 1;
  }
  return { presentes, ausentes, justificados, total: presentes + ausentes + justificados };
}

/** Soma contagens campo a campo, como na frequência da turma (6.1). */
export function somarContagens(contagens: readonly ContagemFrequencia[]): ContagemFrequencia {
  const soma = contagens.reduce(
    (acc, c) => ({
      presentes: acc.presentes + c.presentes,
      ausentes: acc.ausentes + c.ausentes,
      justificados: acc.justificados + c.justificados,
    }),
    { presentes: 0, ausentes: 0, justificados: 0 },
  );
  return { ...soma, total: soma.presentes + soma.ausentes + soma.justificados };
}

/** Justificado entra no total e não no numerador (5.1); percentual arredondado só para exibir (5.3). */
export function calcularFrequencia(contagem: ContagemFrequencia): Frequencia {
  const percentual =
    contagem.total === 0 ? null : Math.round((contagem.presentes * 100) / contagem.total);
  return { ...contagem, percentual };
}

/** Baixa frequência: compara em inteiros, sem arredondar (7.4); sem encontros nunca alerta (7.5). */
export function emAlerta(contagem: ContagemFrequencia, limite: number): boolean {
  if (contagem.total === 0) return false;
  return contagem.presentes * 100 < limite * contagem.total;
}

const MENSAGEM_LIMITE = "Informe um limite inteiro de 1 a 100";

/** Limite de frequência: inteiro de 1 a 100, aceitando a string do formulário (7.3). */
export function limiteSchema(): z.ZodType<number> {
  return z
    .union([z.string(), z.number()], { error: MENSAGEM_LIMITE })
    .transform((valor) => (typeof valor === "string" ? valor.trim() : valor))
    .superRefine((valor, ctx) => {
      const numero =
        typeof valor === "string" ? (/^\d+$/.test(valor) ? Number(valor) : NaN) : valor;
      if (!Number.isInteger(numero) || numero < 1 || numero > 100)
        ctx.addIssue({ code: "custom", message: MENSAGEM_LIMITE });
    })
    .transform((valor) => Number(valor));
}

/** Menor percentual primeiro; sem encontros por último; desempate por nome (5.5). */
export function ordenarPorFrequencia<T extends { frequencia: Frequencia; nome: string }>(
  itens: readonly T[],
): T[] {
  return [...itens].sort((a, b) => {
    const pa = a.frequencia.percentual;
    const pb = b.frequencia.percentual;
    if (pa === null && pb !== null) return 1;
    if (pa !== null && pb === null) return -1;
    if (pa !== null && pb !== null && pa !== pb) return pa - pb;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}
