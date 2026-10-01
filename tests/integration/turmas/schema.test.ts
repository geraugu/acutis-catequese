import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

async function criarBase() {
  const user = await prisma.user.create({
    data: { id: "u1", name: "Ana", email: "ana@exemplo.com", role: "catequista" },
  });
  const catequizando = await prisma.catequizando.create({
    data: { nome: "João", dataNascimento: new Date("2015-05-10"), telefone: "11987654321" },
  });
  const turma = await prisma.turma.create({
    data: { nome: "Eucaristia A", ciclo: 2026, diaSemana: "sabado", horario: "09:00" },
  });
  return { user, catequizando, turma };
}

describe("tabelas de turmas", () => {
  it("grava turma, designação e inscrição e lê dataEntrada sem deslocamento de dia", async () => {
    const { user, catequizando, turma } = await criarBase();
    await prisma.designacao.create({ data: { turmaId: turma.id, userId: user.id } });
    await prisma.inscricao.create({
      data: {
        turmaId: turma.id,
        catequizandoId: catequizando.id,
        dataEntrada: new Date("2026-03-01"),
      },
    });
    const lida = await prisma.turma.findUniqueOrThrow({
      where: { id: turma.id },
      include: { designacoes: true, inscricoes: true },
    });
    expect(lida.diaSemana).toBe("sabado");
    expect(lida.vagas).toBeNull();
    expect(lida.designacoes).toHaveLength(1);
    expect(lida.designacoes[0].removidoEm).toBeNull();
    expect(lida.inscricoes).toHaveLength(1);
    expect(lida.inscricoes[0].dataEntrada.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(lida.inscricoes[0].dataSaida).toBeNull();
  });

  it("começa cada teste com as tabelas vazias", async () => {
    expect(await prisma.turma.count()).toBe(0);
    expect(await prisma.designacao.count()).toBe(0);
    expect(await prisma.inscricao.count()).toBe(0);
  });
});
