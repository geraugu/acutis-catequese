import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SEED_COORDENACAO_EMAIL: z.email().optional(),
  SEED_COORDENACAO_SENHA: z.string().optional(),
  SEED_COORDENACAO_NOME: z.string().optional(),
  AUTH_RATE_LIMIT: z.enum(["on", "off"]).default("on"),
});

export type Env = z.infer<typeof envSchema>;

/** Lança um Error com a mensagem "Variável de ambiente ausente ou inválida: NOME (motivo)" (1.3). */
export function carregarEnv(fonte: NodeJS.ProcessEnv = process.env): Env {
  const resultado = envSchema.safeParse(fonte);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const nome = String(problema?.path[0] ?? "desconhecida");
    const motivo = fonte[nome] === undefined ? "não definida" : problema?.message;
    throw new Error(`Variável de ambiente ausente ou inválida: ${nome} (${motivo})`);
  }
  return resultado.data;
}

let cache: Env | undefined;

/** Variáveis validadas, carregadas na primeira leitura. */
export const env: Env = new Proxy({} as Env, {
  get(_alvo, chave) {
    cache ??= carregarEnv();
    return cache[chave as keyof Env];
  },
});
