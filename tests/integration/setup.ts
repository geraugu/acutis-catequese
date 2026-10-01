import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

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
  "turma",
  "designacao",
  "inscricao",
  "tema",
  "encontro",
];

const url = process.env.DATABASE_URL ?? "";
if (!/acutis_test/.test(url)) {
  // Proteção: nunca tocar no banco de desenvolvimento.
  throw new Error("Testes de integração só rodam contra o banco de teste (acutis_test).");
}

beforeEach(async () => {
  const lista = TABELAS.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
