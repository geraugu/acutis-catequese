/** Devolve o limite de frequência ao padrão (75) no banco de teste. Uso: tsx tests/e2e/restaurar-limite.ts */
import { prisma } from "@/lib/prisma";

async function main() {
  if (!/acutis_test/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("O e2e só roda contra o banco acutis_test.");
  }
  await prisma.limiteFrequencia.upsert({
    where: { id: 1 },
    update: { percentual: 75 },
    create: { id: 1, percentual: 75 },
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
