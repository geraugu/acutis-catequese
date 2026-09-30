import { z } from "zod";
import { normalizarEmail } from "@/modules/auth/domain/credenciais";
import { PAPEIS, type Papel } from "@/modules/auth/domain/papeis";
import { senhaSchema } from "@/modules/auth/domain/senha";
import { telefoneSchema } from "./telefone";

/** Situação de um membro da equipe. */
export type Situacao = "ativo" | "inativo";
export type FiltroSituacao = Situacao | "todos";

export const papelSchema: z.ZodType<Papel> = z.enum(PAPEIS, { error: "Escolha o papel" });

/** Campos do membro (edição): nome, e-mail normalizado, telefone, papel e observações opcionais. */
export const membroEdicaoSchema = z.object({
  nome: z
    .string({ error: "Informe o nome" })
    .trim()
    .min(1, "Informe o nome")
    .max(120, "O nome deve ter no máximo 120 caracteres"),
  email: z
    .string({ error: "Informe o e-mail" })
    .transform(normalizarEmail)
    .pipe(z.string().min(1, "Informe o e-mail").pipe(z.email("E-mail inválido"))),
  telefone: telefoneSchema,
  papel: papelSchema,
  observacoes: z
    .string()
    .trim()
    .max(1000, "As observações devem ter no máximo 1000 caracteres")
    .optional()
    .transform((valor) => (valor ? valor : undefined)),
});

/** Criação: os campos da edição mais a senha inicial (regra da fundação). */
export const membroCriacaoSchema = membroEdicaoSchema.extend({ senha: senhaSchema });

export type DadosMembro = z.infer<typeof membroEdicaoSchema>;
export type DadosNovoMembro = z.infer<typeof membroCriacaoSchema>;
