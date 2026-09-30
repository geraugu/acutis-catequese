import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { semearCoordenacao } from "@/modules/auth/seed-coordenacao";
import { normalizarEmail } from "@/modules/auth/domain/credenciais";

async function main() {
  const resultado = await semearCoordenacao(process.env);
  const email = normalizarEmail(process.env.SEED_COORDENACAO_EMAIL ?? "");
  console.log(
    resultado === "criada"
      ? `Conta de coordenação criada: ${email}`
      : `Conta de coordenação já existe: ${email} — nada foi alterado`,
  );
}

main()
  .catch((erro: unknown) => {
    console.error(`Falha no seed: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
