import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function criarTurma() {
  return prisma.turma.create({
    data: { nome: "Eucaristia A", ciclo: 2026, diaSemana: "sabado", horario: "09:00" },
  });
}

async function codigoDoErro(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) return e.code;
    throw e;
  }
  return null;
}

describe("tabelas do programa", () => {
  it("grava tema e encontro e lê a data sem deslocamento de dia", async () => {
    const turma = await criarTurma();
    const tema = await prisma.tema.create({
      data: { titulo: "Batismo", chave: "batismo", posicao: 1 },
    });
    await prisma.encontro.create({
      data: { turmaId: turma.id, temaId: tema.id, data: new Date("2026-10-03"), horario: "09:00" },
    });
    const lida = await prisma.turma.findUniqueOrThrow({
      where: { id: turma.id },
      include: { encontros: { include: { tema: true } } },
    });
    expect(lida.encontros).toHaveLength(1);
    expect(lida.encontros[0].data.toISOString().slice(0, 10)).toBe("2026-10-03");
    expect(lida.encontros[0].situacao).toBe("planejado");
    expect(lida.encontros[0].tema?.ativo).toBe(true);
  });

  it("tema_chave_unica recusa a mesma chave", async () => {
    await prisma.tema.create({ data: { titulo: "Batismo", chave: "batismo", posicao: 1 } });
    const codigo = await codigoDoErro(
      prisma.tema.create({ data: { titulo: "batismo", chave: "batismo", posicao: 2 } }),
    );
    expect(codigo).toBe("P2002");
  });

  it("encontro_horario_unico recusa duplicidade e aceita quando o primeiro está cancelado", async () => {
    const turma = await criarTurma();
    const base = { turmaId: turma.id, data: new Date("2026-10-03"), horario: "09:00" };
    const primeiro = await prisma.encontro.create({ data: base });
    expect(await codigoDoErro(prisma.encontro.create({ data: base }))).toBe("P2002");
    await prisma.encontro.update({
      where: { id: primeiro.id },
      data: { situacao: "cancelado", motivoCancelamento: "Chuva" },
    });
    await prisma.encontro.create({ data: base });
    expect(await prisma.encontro.count()).toBe(2);
  });

  it("começa cada teste com as tabelas vazias", async () => {
    expect(await prisma.tema.count()).toBe(0);
    expect(await prisma.encontro.count()).toBe(0);
  });
});
