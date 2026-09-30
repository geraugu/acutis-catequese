/**
 * Cria uma ficha pendente direto no banco de teste e imprime o id. Roda via `tsx` (como o
 * preparar-banco.ts) porque o client gerado do Prisma é ESM e não carrega no Playwright.
 * Uso: tsx tests/e2e/criar-ficha-pendente.ts "<nome>"
 */
import { prisma } from "@/lib/prisma";

async function main() {
  if (!/acutis_test/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("O e2e só roda contra o banco acutis_test.");
  }
  const nome = process.argv[2];
  if (!nome) throw new Error("Informe o nome da ficha.");
  const ficha = await prisma.catequizando.create({
    data: {
      nome,
      dataNascimento: new Date("2005-03-10T00:00:00Z"),
      telefone: "11987654321",
      estado: "pendente",
      sacramentos: { create: [{ sacramento: "batismo" }] },
    },
  });
  process.stdout.write(ficha.id);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
