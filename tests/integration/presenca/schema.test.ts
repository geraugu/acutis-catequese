import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarPresencaDireta,
  criarTurmaDireta,
} from "./helpers";

async function codigoDoErro(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) return e.code;
    throw e;
  }
  return null;
}

async function cenario() {
  const turmaId = await criarTurmaDireta({ nome: "Eucaristia A" });
  const outraTurmaId = await criarTurmaDireta({ nome: "Eucaristia B" });
  const encontroId = await criarEncontroDireto(turmaId);
  const catequizandoId = await criarCatequizandoDireto();
  return { turmaId, outraTurmaId, encontroId, catequizandoId };
}

/** Insere por SQL direto para que a falha venha da restrição CHECK do banco. */
async function mensagemDoCheck(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (e) {
    return String(e instanceof Error ? e.message : e);
  }
  return null;
}

describe("tabelas de presença", () => {
  it("grava uma presença com os valores padrão", async () => {
    const { turmaId, encontroId, catequizandoId } = await cenario();
    const id = await criarPresencaDireta({ encontroId, turmaId, catequizandoId });
    const p = await prisma.presenca.findUniqueOrThrow({ where: { id } });
    expect(p.status).toBe("presente");
    expect(p.visitante).toBe(false);
    expect(p.turmaOrigemId).toBeNull();
  });

  it("recusa a segunda presença do mesmo catequizando no mesmo encontro", async () => {
    const { turmaId, encontroId, catequizandoId } = await cenario();
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId });
    const codigo = await codigoDoErro(
      criarPresencaDireta({ encontroId, turmaId, catequizandoId, status: "ausente" }),
    );
    expect(codigo).toBe("P2002");
  });

  it("presenca_visitante_ck recusa visitante ausente ou justificado", async () => {
    const { turmaId, outraTurmaId, encontroId, catequizandoId } = await cenario();
    for (const status of ["ausente", "justificado"] as const) {
      const msg = await mensagemDoCheck(
        criarPresencaDireta({
          encontroId,
          turmaId,
          catequizandoId,
          status,
          visitante: true,
          turmaOrigemId: outraTurmaId,
        }),
      );
      expect(msg).toContain("presenca_visitante_ck");
    }
  });

  it("presenca_visitante_ck recusa visitante sem turma de origem", async () => {
    const { turmaId, encontroId, catequizandoId } = await cenario();
    const msg = await mensagemDoCheck(
      criarPresencaDireta({ encontroId, turmaId, catequizandoId, visitante: true }),
    );
    expect(msg).toContain("presenca_visitante_ck");
  });

  it("presenca_visitante_ck recusa visitante com origem igual à turma do encontro", async () => {
    const { turmaId, encontroId, catequizandoId } = await cenario();
    const msg = await mensagemDoCheck(
      criarPresencaDireta({
        encontroId,
        turmaId,
        catequizandoId,
        visitante: true,
        turmaOrigemId: turmaId,
      }),
    );
    expect(msg).toContain("presenca_visitante_ck");
  });

  it("aceita visitante presente com origem em outra turma", async () => {
    const { turmaId, outraTurmaId, encontroId, catequizandoId } = await cenario();
    await criarPresencaDireta({
      encontroId,
      turmaId,
      catequizandoId,
      visitante: true,
      turmaOrigemId: outraTurmaId,
    });
    expect(await prisma.presenca.count()).toBe(1);
  });

  it("presenca_origem_ck recusa presença comum com turma de origem", async () => {
    const { turmaId, outraTurmaId, encontroId, catequizandoId } = await cenario();
    const msg = await mensagemDoCheck(
      criarPresencaDireta({ encontroId, turmaId, catequizandoId, turmaOrigemId: outraTurmaId }),
    );
    expect(msg).toContain("presenca_origem_ck");
  });

  it("limite_frequencia_ck recusa percentual fora de 1 a 100 e id diferente de 1", async () => {
    for (const percentual of [0, 101]) {
      const msg = await mensagemDoCheck(
        prisma.limiteFrequencia.create({ data: { id: 1, percentual } }),
      );
      expect(msg).toContain("limite_frequencia_ck");
    }
    const msgId = await mensagemDoCheck(
      prisma.limiteFrequencia.create({ data: { id: 2, percentual: 75 } }),
    );
    expect(msgId).toContain("limite_frequencia_ck");
    await prisma.limiteFrequencia.create({ data: { id: 1, percentual: 1 } });
    await prisma.limiteFrequencia.update({ where: { id: 1 }, data: { percentual: 100 } });
    expect((await prisma.limiteFrequencia.findUniqueOrThrow({ where: { id: 1 } })).percentual).toBe(
      100,
    );
  });

  it("recusa apagar encontro, turma e catequizando que tenham presenças", async () => {
    const { turmaId, outraTurmaId, encontroId, catequizandoId } = await cenario();
    await criarPresencaDireta({
      encontroId,
      turmaId,
      catequizandoId,
      visitante: true,
      turmaOrigemId: outraTurmaId,
    });
    expect(await codigoDoErro(prisma.encontro.delete({ where: { id: encontroId } }))).toBe("P2003");
    expect(await codigoDoErro(prisma.turma.delete({ where: { id: turmaId } }))).toBe("P2003");
    expect(await codigoDoErro(prisma.turma.delete({ where: { id: outraTurmaId } }))).toBe("P2003");
    expect(await codigoDoErro(prisma.catequizando.delete({ where: { id: catequizandoId } }))).toBe(
      "P2003",
    );
  });
});

describe("limpeza entre testes", () => {
  it("grava presença e limite para a próxima verificação", async () => {
    const { turmaId, encontroId, catequizandoId } = await cenario();
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId });
    await prisma.limiteFrequencia.create({ data: { id: 1, percentual: 75 } });
    expect(await prisma.presenca.count()).toBe(1);
  });

  it("começa com as tabelas zeradas", async () => {
    expect(await prisma.presenca.count()).toBe(0);
    expect(await prisma.limiteFrequencia.count()).toBe(0);
  });
});
