import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("tabelas de catequizando", () => {
  it("grava um catequizando com sacramento e lê as datas sem deslocamento de dia", async () => {
    const criado = await prisma.catequizando.create({
      data: {
        nome: "João",
        dataNascimento: new Date("2000-05-10"),
        telefone: "11987654321",
        sacramentos: {
          create: { sacramento: "batismo", data: new Date("2001-01-31"), paroquia: "Sé" },
        },
      },
    });
    const lido = await prisma.catequizando.findUniqueOrThrow({
      where: { id: criado.id },
      include: { sacramentos: true },
    });
    expect(lido.estado).toBe("ativo");
    expect(lido.dataNascimento.toISOString().slice(0, 10)).toBe("2000-05-10");
    expect(lido.sacramentos).toHaveLength(1);
    expect(lido.sacramentos[0].sacramento).toBe("batismo");
    expect(lido.sacramentos[0].data?.toISOString().slice(0, 10)).toBe("2001-01-31");
  });

  it("começa cada teste com as tabelas vazias", async () => {
    expect(await prisma.catequizando.count()).toBe(0);
    expect(await prisma.sacramentoRecebido.count()).toBe(0);
  });
});
