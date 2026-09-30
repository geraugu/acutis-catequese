import { z } from "zod";

/** E-mail sem espaços nas pontas e em minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Formulário de login: e-mail e senha obrigatórios, mensagens por campo. */
export const loginSchema = z.object({
  email: z
    .string({ error: "Informe o e-mail" })
    .transform(normalizarEmail)
    .pipe(z.string().min(1, "Informe o e-mail").pipe(z.email("E-mail inválido"))),
  senha: z.string({ error: "Informe a senha" }).min(1, "Informe a senha"),
});

export type Credenciais = z.infer<typeof loginSchema>;
