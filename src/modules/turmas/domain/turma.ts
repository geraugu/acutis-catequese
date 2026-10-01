import { z } from "zod";

export const DIAS_SEMANA = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const ROTULO_DIA: Record<DiaSemana, string> = {
  domingo: "Domingo",
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
};

export interface TurmaDados {
  nome: string;
  ciclo: number;
  diaSemana: DiaSemana;
  horario: string;
  local?: string;
  observacoes?: string;
  vagas?: number;
}

const MENSAGEM_DIA = "Escolha o dia da semana";
const MENSAGEM_HORARIO = "Informe um horário válido (ex.: 19:30)";
const MENSAGEM_VAGAS = "Informe um número de vagas entre 1 e 500, ou deixe em branco";
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Converte texto de formulário em número; vazio vira `undefined`, texto inválido vira `NaN`. */
function paraNumero(valor: unknown): unknown {
  if (typeof valor === "number") return valor;
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== "string") return valor;
  const texto = valor.trim();
  if (texto === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(texto) ? Number(texto) : Number.NaN;
}

function textoOpcional(maximo: number, mensagem: string) {
  return z
    .string()
    .trim()
    .max(maximo, mensagem)
    .optional()
    .transform((valor) => (valor ? valor : undefined));
}

/**
 * Validação da turma. Nenhuma issue é fatal (sem `abort`), para que todos os campos
 * inválidos sejam apontados de uma vez.
 */
export function criarTurmaSchema(opcoes: { anoAtual: number }): z.ZodType<TurmaDados> {
  const anoMaximo = opcoes.anoAtual + 1;
  const mensagemCiclo = `Informe um ano entre 2000 e ${anoMaximo}`;

  return z.object({
    nome: z
      .string({ error: "Informe o nome" })
      .trim()
      .superRefine((nome, ctx) => {
        if (nome.length === 0) ctx.addIssue({ code: "custom", message: "Informe o nome" });
        else if (nome.length < 2 || nome.length > 80)
          ctx.addIssue({ code: "custom", message: "O nome deve ter entre 2 e 80 caracteres" });
      }),
    ciclo: z.preprocess(
      paraNumero,
      z
        .number({ error: mensagemCiclo })
        .int(mensagemCiclo)
        .min(2000, mensagemCiclo)
        .max(anoMaximo, mensagemCiclo),
    ),
    diaSemana: z.enum(DIAS_SEMANA, { error: MENSAGEM_DIA }),
    horario: z.string({ error: MENSAGEM_HORARIO }).trim().regex(HORARIO, MENSAGEM_HORARIO),
    local: textoOpcional(120, "O local deve ter no máximo 120 caracteres"),
    observacoes: textoOpcional(1000, "As observações devem ter no máximo 1000 caracteres"),
    vagas: z.preprocess(
      paraNumero,
      z
        .number({ error: MENSAGEM_VAGAS })
        .int(MENSAGEM_VAGAS)
        .min(1, MENSAGEM_VAGAS)
        .max(500, MENSAGEM_VAGAS)
        .optional(),
    ),
  });
}

/** A turma está lotada quando tem vagas definidas e os inscritos vigentes as alcançam. */
export function estaLotada(inscritosVigentes: number, vagas: number | null): boolean {
  return vagas !== null && inscritosVigentes >= vagas;
}

/** "12 de 20 vagas". */
export function formatarOcupacao(inscritosVigentes: number, vagas: number): string {
  return `${inscritosVigentes} de ${vagas} vagas`;
}

/** Exibe o horário como "HH:MM" (descarta segundos, se houver). */
export function formatarHorario(hhmm: string): string {
  return hhmm.slice(0, 5);
}

/** Ordena por dia da semana (domingo primeiro), horário e nome, sem alterar a lista original. */
export function ordenarTurmas<T extends { diaSemana: DiaSemana; horario: string; nome: string }>(
  turmas: readonly T[],
): T[] {
  return [...turmas].sort(
    (a, b) =>
      DIAS_SEMANA.indexOf(a.diaSemana) - DIAS_SEMANA.indexOf(b.diaSemana) ||
      a.horario.localeCompare(b.horario) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
