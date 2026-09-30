import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ac, roles } from "@/lib/auth-permissoes";
import {
  CODIGO_CREDENCIAIS_INVALIDAS,
  MSG_BLOQUEIO,
  MSG_CONTA_DESABILITADA,
} from "@/modules/auth/mensagens";
import { avaliarBloqueio } from "@/modules/auth/domain/bloqueio";
import { normalizarEmail } from "@/modules/auth/domain/credenciais";
import {
  limparFalhas,
  listarFalhasRecentes,
  registrarFalha,
} from "@/modules/auth/tentativas-login";
import { senhaSchema, TAMANHO_MINIMO_SENHA } from "@/modules/auth/domain/senha";

/** Validade máxima da sessão no servidor: 12 horas (5.1). */
export const SESSAO_VALIDADE_SEGUNDOS = 60 * 60 * 12;

/** Limita a validade para no máximo 12 horas a partir de agora. */
function limitarValidade(expiresAt: Date): Date {
  const limite = new Date(Date.now() + SESSAO_VALIDADE_SEGUNDOS * 1000);
  return expiresAt > limite ? limite : expiresAt;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: TAMANHO_MINIMO_SENHA,
    maxPasswordLength: 128,
  },
  session: { expiresIn: SESSAO_VALIDADE_SEGUNDOS },
  databaseHooks: {
    session: {
      create: {
        // Com rememberMe: false o Better Auth fixa a validade em 24 h (e não renova a sessão);
        // aqui ela é limitada a 12 h no servidor (5.1).
        before: async (sessao) => ({
          data: { ...sessao, expiresAt: limitarValidade(sessao.expiresAt) },
        }),
      },
    },
  },
  hooks: {
    // O createUser do plugin admin não aplica minPasswordLength: validar com a regra de senha (7.1).
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        // Bloqueio por e-mail (4.1, 4.2): recusa mesmo com a senha correta.
        // Lançar aqui impede o endpoint e os hooks "after" (a tentativa bloqueada não é registrada).
        if (typeof ctx.body?.email !== "string") return;
        const email = normalizarEmail(ctx.body.email);
        const agora = new Date();
        if (avaliarBloqueio(await listarFalhasRecentes(email, agora), agora).bloqueado) {
          throw new APIError("TOO_MANY_REQUESTS", { message: MSG_BLOQUEIO });
        }
        return { context: { body: { ...ctx.body, email } } };
      }
      if (ctx.path !== "/admin/create-user") return;
      const resultado = senhaSchema.safeParse(ctx.body?.password);
      if (!resultado.success) {
        throw new APIError("BAD_REQUEST", {
          code: "PASSWORD_TOO_SHORT",
          message: resultado.error.issues[0]?.message,
        });
      }
    }),
    // No Better Auth 1.7.6 os hooks "after" rodam também quando o endpoint lança APIError:
    // o erro chega em ctx.context.returned (api/dispatch.mjs).
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" || typeof ctx.body?.email !== "string") return;
      const email = normalizarEmail(ctx.body.email);
      const retorno = ctx.context.returned;
      if (isAPIError(retorno)) {
        // Só credenciais inválidas contam (3.2); conta desabilitada (BANNED_USER) não (3.4).
        if (retorno.body?.code === CODIGO_CREDENCIAIS_INVALIDAS) await registrarFalha(email);
        return;
      }
      if (retorno !== undefined) await limparFalhas(email); // sucesso zera a contagem (4.4)
    }),
  },
  rateLimit: { enabled: env.AUTH_RATE_LIMIT === "on", storage: "database" },
  plugins: [
    admin({
      ac,
      roles,
      adminRoles: ["coordenacao"],
      defaultRole: "catequista",
      bannedUserMessage: MSG_CONTA_DESABILITADA,
    }),
    // Precisa ser o último plugin: grava os cookies nas Server Actions.
    nextCookies(),
  ],
});
