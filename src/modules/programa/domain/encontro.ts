import { z } from "zod";
import { compararDatas, dataCivilSchema, type DataCivil } from "@/modules/compartilhado/datas";
import { MSG_TEMA_INDISPONIVEL } from "@/modules/programa/mensagens";

export const SITUACOES = ["planejado", "realizado", "cancelado"] as const;
export type SituacaoEncontro = (typeof SITUACOES)[number];

export const ROTULO_SITUACAO: Record<SituacaoEncontro, string> = {
  planejado: "Planejado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export interface EncontroDados {
  data: DataCivil;
  horario: string;
  temaId?: string;
  observacoes?: string;
}

const MENSAGEM_DATA = "Informe a data";
const MENSAGEM_HORARIO = "Informe um horário válido (ex.: 19:30)";
const MENSAGEM_TEMA = MSG_TEMA_INDISPONIVEL;
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;
const uuidSchema = z.uuid();

/**
 * Validação do encontro. Nenhuma issue é fatal (sem `abort`), para que todos os campos
 * inválidos sejam apontados de uma vez.
 */
export function criarEncontroSchema(): z.ZodType<EncontroDados> {
  return z.object({
    data: z
      .string({ error: MENSAGEM_DATA })
      .trim()
      .superRefine((data, ctx) => {
        if (data.length === 0) ctx.addIssue({ code: "custom", message: MENSAGEM_DATA });
        else {
          const r = dataCivilSchema.safeParse(data);
          if (!r.success)
            ctx.addIssue({ code: "custom", message: r.error.issues[0]?.message ?? MENSAGEM_DATA });
        }
      })
      .transform((data) => data as DataCivil),
    horario: z.string({ error: MENSAGEM_HORARIO }).trim().regex(HORARIO, MENSAGEM_HORARIO),
    temaId: z
      .string({ error: MENSAGEM_TEMA })
      .trim()
      .superRefine((id, ctx) => {
        if (id && !uuidSchema.safeParse(id).success)
          ctx.addIssue({ code: "custom", message: MENSAGEM_TEMA });
      })
      .optional()
      .transform((valor) => (valor ? valor : undefined)),
    observacoes: z
      .string()
      .trim()
      .max(2000, "As observações devem ter no máximo 2000 caracteres")
      .optional()
      .transform((valor) => (valor ? valor : undefined)),
  });
}

export const motivoSchema: z.ZodType<string | undefined> = z
  .string()
  .trim()
  .max(200, "O motivo deve ter no máximo 200 caracteres")
  .optional()
  .transform((valor) => (valor ? valor : undefined));

export const TRANSICOES: Record<
  "realizar" | "cancelar" | "reabrir",
  { de: readonly SituacaoEncontro[]; para: SituacaoEncontro }
> = {
  realizar: { de: ["planejado"], para: "realizado" },
  cancelar: { de: ["planejado"], para: "cancelado" },
  reabrir: { de: ["realizado", "cancelado"], para: "planejado" },
};

/** Só o encontro planejado pode ser editado. */
export function podeEditar(e: { situacao: SituacaoEncontro }): boolean {
  return e.situacao === "planejado";
}

/** Recusa marcar como realizado um encontro de data futura. */
export function validarRealizacao(data: DataCivil, hoje: DataCivil): string | null {
  return compararDatas(data, hoje) > 0 ? "Este encontro ainda não aconteceu." : null;
}

/** Planejado com data anterior a hoje: aguarda ser marcado como realizado ou cancelado. */
export function aguardandoConfirmacao(
  e: { situacao: SituacaoEncontro; data: DataCivil },
  hoje: DataCivil,
): boolean {
  return e.situacao === "planejado" && compararDatas(e.data, hoje) < 0;
}

/** Por data e depois por horário; devolve uma nova lista. */
export function ordenarEncontros<T extends { data: DataCivil; horario: string }>(
  e: readonly T[],
): T[] {
  return [...e].sort((a, b) => compararDatas(a.data, b.data) || a.horario.localeCompare(b.horario));
}

/** Primeiro encontro planejado com data maior ou igual a hoje; null se não houver. */
export function proximoEncontro<
  T extends { situacao: SituacaoEncontro; data: DataCivil; horario: string },
>(e: readonly T[], hoje: DataCivil): T | null {
  return (
    ordenarEncontros(e).find(
      (x) => x.situacao === "planejado" && compararDatas(x.data, hoje) >= 0,
    ) ?? null
  );
}

/** Só as duas bases do cronograma desta turma; qualquer outro valor vira a base da coordenação. */
export function baseValida(base: string, turmaId: string): string {
  const catequista = `/catequista/turmas/${turmaId}/encontros`;
  return base === catequista ? catequista : `/coordenacao/turmas/${turmaId}/encontros`;
}
