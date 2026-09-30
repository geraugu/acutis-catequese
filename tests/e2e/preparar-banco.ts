/**
 * Prepara o banco de teste do e2e: limpa as tabelas de autenticação, semeia a coordenação e
 * cria um catequista. Roda via `tsx` (chamado pelo auth.setup.ts) porque o client gerado do
 * Prisma é ESM e não carrega no transpilador do Playwright.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { semearCoordenacao } from "@/modules/auth/seed-coordenacao";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

const TABELAS = [
  "user",
  "session",
  "account",
  "verification",
  "rateLimit",
  "login_attempt",
  "perfil_membro",
  "catequizando",
  "sacramento_recebido",
];

async function main() {
  if (!/acutis_test/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("O e2e só roda contra o banco acutis_test.");
  }
  const lista = TABELAS.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
  await semearCoordenacao({
    SEED_COORDENACAO_EMAIL: COORDENACAO.email,
    SEED_COORDENACAO_SENHA: COORDENACAO.senha,
    SEED_COORDENACAO_NOME: COORDENACAO.nome,
  });
  await auth.api.createUser({
    body: {
      email: CATEQUISTA.email,
      password: CATEQUISTA.senha,
      name: CATEQUISTA.nome,
      role: "catequista",
    },
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
