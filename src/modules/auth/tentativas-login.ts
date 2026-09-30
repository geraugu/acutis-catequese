import { prisma } from "@/lib/prisma";
import { JANELA_CONSULTA_FALHAS_MS } from "@/modules/auth/domain/bloqueio";
import { normalizarEmail } from "@/modules/auth/domain/credenciais";

/**
 * Persistência das tentativas falhas de login por e-mail (4.1, 4.3, 4.4).
 * Os instantes vêm do relógio da aplicação (não do now() do banco) para que a
 * política de bloqueio use uma única fonte de tempo.
 */

/** Instantes das falhas do e-mail nos últimos 30 minutos até `agora`. */
export async function listarFalhasRecentes(email: string, agora: Date = new Date()): Promise<Date[]> {
  const desde = new Date(agora.getTime() - JANELA_CONSULTA_FALHAS_MS);
  const linhas = await prisma.loginAttempt.findMany({
    where: { email: normalizarEmail(email), createdAt: { gte: desde, lte: agora } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return linhas.map((l) => l.createdAt);
}

export async function registrarFalha(email: string, quando: Date = new Date()): Promise<void> {
  await prisma.loginAttempt.create({ data: { email: normalizarEmail(email), createdAt: quando } });
}

export async function limparFalhas(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email: normalizarEmail(email) } });
}
