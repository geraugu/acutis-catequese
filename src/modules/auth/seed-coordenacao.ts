import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizarEmail } from "@/modules/auth/domain/credenciais";
import { senhaSchema } from "@/modules/auth/domain/senha";

const seedSchema = z.object({
  SEED_COORDENACAO_EMAIL: z
    .string({ error: "não definida" })
    .transform(normalizarEmail)
    .pipe(z.email("e-mail inválido")),
  SEED_COORDENACAO_SENHA: z.string({ error: "não definida" }).pipe(senhaSchema),
  SEED_COORDENACAO_NOME: z.string({ error: "não definida" }).trim().min(1, "não pode ser vazia"),
});

export type ResultadoSeed = "criada" | "ja-existia";

/**
 * Cria a conta inicial de coordenação a partir das variáveis SEED_* (1.4).
 * Idempotente: se o e-mail já existir, não altera nada (1.5). Senha validada pela regra (7.2).
 */
export async function semearCoordenacao(
  fonte: Record<string, string | undefined>,
): Promise<ResultadoSeed> {
  const resultado = seedSchema.safeParse(fonte);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const nome = String(problema?.path[0] ?? "desconhecida");
    throw new Error(`Variável de ambiente ausente ou inválida: ${nome} (${problema?.message})`);
  }
  const { SEED_COORDENACAO_EMAIL: email, SEED_COORDENACAO_SENHA: senha } = resultado.data;

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) return "ja-existia";

  await auth.api.createUser({
    body: {
      email,
      password: senha,
      name: resultado.data.SEED_COORDENACAO_NOME,
      role: "coordenacao",
    },
  });
  return "criada";
}
