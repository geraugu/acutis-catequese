import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("banco de teste", () => {
  it("grava e lê uma tentativa de login", async () => {
    const criada = await prisma.loginAttempt.create({ data: { email: "catequista@exemplo.com" } });
    const lida = await prisma.loginAttempt.findUnique({ where: { id: criada.id } });
    expect(lida?.email).toBe("catequista@exemplo.com");
    expect(await prisma.loginAttempt.count()).toBe(1);
  });

  it("começa cada teste com as tabelas vazias", async () => {
    expect(await prisma.loginAttempt.count()).toBe(0);
  });

  it("está conectado ao banco acutis_test", async () => {
    const [linha] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(linha.db).toBe("acutis_test");
  });
});
