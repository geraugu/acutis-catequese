import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

function criarPrisma() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
}

// Em desenvolvimento, o hot reload recarrega módulos; o cache global evita vários clientes.
const globalParaPrisma = globalThis as unknown as { prisma?: ReturnType<typeof criarPrisma> };

export const prisma = globalParaPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
