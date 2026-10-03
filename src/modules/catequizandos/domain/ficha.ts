import { z } from "zod";
import { normalizarEmail } from "@/modules/auth/domain/credenciais";
import {
  calcularIdade,
  compararDatas,
  dataCivilSchema,
  type DataCivil,
} from "@/modules/compartilhado/datas";
import { telefoneSchema } from "@/modules/compartilhado/telefone";
import { SACRAMENTOS, type Sacramento } from "./sacramentos";

export const IDADE_MINIMA_PADRAO = 16;

export { ROTULO_SACRAMENTO, SACRAMENTOS, type Sacramento } from "./sacramentos";

export interface SacramentoFicha {
  recebido: boolean;
  data?: DataCivil;
  paroquia?: string;
}

export interface FichaDados {
  nome: string;
  dataNascimento: DataCivil;
  telefone: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  sacramentos: Record<Sacramento, SacramentoFicha>;
}

const MENSAGEM_DATA = "Informe uma data válida";
const MENSAGEM_DATA_SACRAMENTO = "Data do sacramento inválida";

/** Texto opcional: trim, limite de tamanho, "" vira undefined. */
function textoOpcional(maximo: number, mensagem: string) {
  return z
    .string()
    .trim()
    .max(maximo, mensagem)
    .optional()
    .transform((valor) => (valor ? valor : undefined));
}

const sacramentoEntradaSchema = z.object({
  recebido: z.boolean().optional().default(false),
  data: z.string().optional(),
  paroquia: textoOpcional(200, "A paróquia deve ter no máximo 200 caracteres"),
});

/**
 * Schema da ficha do catequizando. `hoje` e `idadeMinima` são parâmetros
 * para manter o domínio puro e testável.
 *
 * Erros de sacramento saem com path ["sacramentos", sacramento, "data"];
 * use `campoDoFormulario(issue.path)` para obter o nome plano ("crismaData").
 */
export function criarFichaSchema(opcoes: {
  hoje: DataCivil;
  idadeMinima?: number;
}): z.ZodType<FichaDados> {
  const { hoje, idadeMinima = IDADE_MINIMA_PADRAO } = opcoes;

  const nascimentoSchema = dataCivilSchema.superRefine((data, ctx) => {
    if (compararDatas(data, hoje) > 0) {
      ctx.addIssue({ code: "custom", message: MENSAGEM_DATA });
    } else if (calcularIdade(data, hoje) < idadeMinima) {
      ctx.addIssue({ code: "custom", message: `A idade mínima é de ${idadeMinima} anos` });
    }
  });

  return z
    .object({
      nome: z
        .string({ error: "Informe o nome" })
        .trim()
        .min(2, {
          error: (issue) =>
            issue.input === "" ? "Informe o nome" : "O nome deve ter pelo menos 2 caracteres",
        })
        .max(120, "O nome deve ter no máximo 120 caracteres"),
      dataNascimento: nascimentoSchema,
      telefone: z.string({ error: "Informe um telefone com DDD" }).pipe(telefoneSchema),
      email: z
        .string()
        .optional()
        .transform((valor) => (valor ? normalizarEmail(valor) : ""))
        .pipe(z.union([z.literal(""), z.email("E-mail inválido")]))
        .transform((valor) => (valor ? valor : undefined)),
      endereco: textoOpcional(300, "O endereço deve ter no máximo 300 caracteres"),
      observacoes: textoOpcional(1000, "As observações devem ter no máximo 1000 caracteres"),
      sacramentos: z.object({
        batismo: sacramentoEntradaSchema,
        eucaristia: sacramentoEntradaSchema,
        crisma: sacramentoEntradaSchema,
      }),
    })
    .superRefine(
      (entrada, ctx) => {
        // Roda mesmo com falhas em outros campos (requisito 2.3): lê os valores de forma defensiva.
        if (typeof entrada !== "object" || entrada === null) return;
        const bruto = entrada as { dataNascimento?: unknown; sacramentos?: unknown };
        const nascimento = dataCivilSchema.safeParse(bruto.dataNascimento);
        if (typeof bruto.sacramentos !== "object" || bruto.sacramentos === null) return;
        const lista = bruto.sacramentos as Record<string, unknown>;
        for (const s of SACRAMENTOS) {
          const valor = lista[s];
          if (typeof valor !== "object" || valor === null) continue;
          const item = valor as { recebido?: unknown; data?: unknown };
          if (item.recebido !== true || !item.data) continue;
          const lida = dataCivilSchema.safeParse(item.data);
          if (
            !lida.success ||
            compararDatas(lida.data, hoje) > 0 ||
            (nascimento.success && compararDatas(lida.data, nascimento.data) < 0)
          ) {
            ctx.addIssue({
              code: "custom",
              message: MENSAGEM_DATA_SACRAMENTO,
              path: ["sacramentos", s, "data"],
            });
          }
        }
      },
      { when: () => true },
    )
    .transform((entrada): FichaDados => {
      const sacramentos = {} as Record<Sacramento, SacramentoFicha>;
      for (const s of SACRAMENTOS) {
        const { recebido, data, paroquia } = entrada.sacramentos[s];
        if (!recebido) {
          sacramentos[s] = { recebido: false };
          continue;
        }
        const ficha: SacramentoFicha = { recebido: true };
        if (data) ficha.data = data as DataCivil;
        if (paroquia) ficha.paroquia = paroquia;
        sacramentos[s] = ficha;
      }
      const { email, endereco, observacoes } = entrada;
      return {
        nome: entrada.nome,
        dataNascimento: entrada.dataNascimento,
        telefone: entrada.telefone,
        ...(email ? { email } : {}),
        ...(endereco ? { endereco } : {}),
        ...(observacoes ? { observacoes } : {}),
        sacramentos,
      };
    });
}

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Converte os campos planos do formulário na forma aceita por `criarFichaSchema`. */
export function lerFichaDoFormulario(dados: FormData): unknown {
  const sacramentos = {} as Record<
    Sacramento,
    { recebido: boolean; data: string; paroquia: string }
  >;
  for (const s of SACRAMENTOS) {
    sacramentos[s] = {
      recebido: dados.get(`${s}Recebido`) !== null,
      data: texto(dados, `${s}Data`),
      paroquia: texto(dados, `${s}Paroquia`),
    };
  }
  return {
    nome: texto(dados, "nome"),
    dataNascimento: texto(dados, "dataNascimento"),
    telefone: texto(dados, "telefone"),
    email: texto(dados, "email"),
    endereco: texto(dados, "endereco"),
    observacoes: texto(dados, "observacoes"),
    sacramentos,
  };
}

/**
 * Nome do campo do formulário para o path de um erro do schema:
 * ["sacramentos", "crisma", "data"] → "crismaData"; ["nome"] → "nome".
 */
export function campoDoFormulario(path: readonly PropertyKey[]): string {
  const [primeiro, sacramento, campo] = path;
  if (primeiro === "sacramentos" && typeof sacramento === "string" && typeof campo === "string") {
    return `${sacramento}${campo.charAt(0).toUpperCase()}${campo.slice(1)}`;
  }
  return String(primeiro ?? "");
}
