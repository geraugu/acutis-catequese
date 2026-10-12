import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  adicionarVisitante,
  frequenciaDaTurma,
  removerVisitante,
  salvarChamada,
} from "@/modules/presenca/repositorio";
import {
  criarCatequizandoDireto,
  criarEncontroPlanejadoDireto,
  criarEncontroRealizadoDireto,
  criarInscricaoDireta,
  criarReservaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers-reposicao";

async function cenario() {
  const origem = await criarTurmaDireta({ nome: "Origem" });
  const visitada = await criarTurmaDireta({ nome: "Terça" });
  const catequizandoId = await criarCatequizandoDireto({ nome: "Ana" });
  await criarInscricaoDireta(origem, catequizandoId);
  const tema = await criarTemaDireto("Tema 1");
  await criarEncontroRealizadoDireto(origem, tema, "2026-09-05");
  const destino = await criarEncontroPlanejadoDireto(visitada, tema, "2026-10-20");
  return { origem, visitada, catequizandoId, tema, destino };
}

type Cenario = Awaited<ReturnType<typeof cenario>>;

const reservar = (c: Cenario, encontroId = c.destino, situacao?: "nao_compareceu") =>
  criarReservaDireta({
    catequizandoId: c.catequizandoId,
    temaId: c.tema,
    encontroId,
    turmaOrigemId: c.origem,
    situacao,
  });

const situacaoDe = async (id: string) =>
  (await prisma.reservaReposicao.findUniqueOrThrow({ where: { id } })).situacao;

describe("adicionarVisitante com reserva (5.2)", () => {
  it("marca a reserva como compareceu e cria a presença de visitante", async () => {
    const c = await cenario();
    const reserva = await reservar(c);
    const r = await adicionarVisitante(
      { encontroId: c.destino, turmaId: c.visitada },
      c.catequizandoId,
    );
    expect(r).toBe("ok");
    expect(await situacaoDe(reserva)).toBe("compareceu");
    const p = await prisma.presenca.findMany({ where: { encontroId: c.destino } });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ visitante: true, status: "presente", turmaOrigemId: c.origem });
  });

  it("promove nao_compareceu para compareceu (visitante registrado depois)", async () => {
    const c = await cenario();
    const reserva = await reservar(c, c.destino, "nao_compareceu");
    await adicionarVisitante({ encontroId: c.destino, turmaId: c.visitada }, c.catequizandoId);
    expect(await situacaoDe(reserva)).toBe("compareceu");
  });

  it("visitante direto, sem reserva, segue igual ao atual", async () => {
    const c = await cenario();
    const r = await adicionarVisitante(
      { encontroId: c.destino, turmaId: c.visitada },
      c.catequizandoId,
    );
    expect(r).toBe("ok");
    expect(await prisma.reservaReposicao.count()).toBe(0);
    expect(await prisma.presenca.count({ where: { encontroId: c.destino } })).toBe(1);
  });

  it("não toca reserva de outro encontro nem cancelada", async () => {
    const c = await cenario();
    const outroEncontro = await criarEncontroPlanejadoDireto(c.visitada, c.tema, "2026-11-03");
    const deOutro = await reservar(c, outroEncontro);
    await adicionarVisitante({ encontroId: c.destino, turmaId: c.visitada }, c.catequizandoId);
    expect(await situacaoDe(deOutro)).toBe("reservada");
  });
});

describe("removerVisitante com reserva (5.5)", () => {
  it("devolve compareceu para reservada", async () => {
    const c = await cenario();
    const reserva = await reservar(c);
    await adicionarVisitante({ encontroId: c.destino, turmaId: c.visitada }, c.catequizandoId);
    expect(await removerVisitante(c.destino, c.catequizandoId)).toBe(true);
    expect(await situacaoDe(reserva)).toBe("reservada");
    expect(await prisma.presenca.count({ where: { encontroId: c.destino } })).toBe(0);
  });

  it("remover visitante sem reserva segue igual", async () => {
    const c = await cenario();
    await adicionarVisitante({ encontroId: c.destino, turmaId: c.visitada }, c.catequizandoId);
    expect(await removerVisitante(c.destino, c.catequizandoId)).toBe(true);
    expect(await prisma.reservaReposicao.count()).toBe(0);
  });
});

describe("salvarChamada com reservas (5.4, 5.6)", () => {
  it("marca as reservadas do encontro como nao_compareceu sem criar presença", async () => {
    const c = await cenario();
    const reserva = await reservar(c);
    const antesVisitada = await frequenciaDaTurma(c.visitada);
    const antesOrigem = await frequenciaDaTurma(c.origem);
    const r = await salvarChamada(
      { encontroId: c.destino, turmaId: c.visitada, modo: "nova" },
      new Map(),
    );
    expect(r).toBe("ok");
    expect(await situacaoDe(reserva)).toBe("nao_compareceu");
    expect(await prisma.presenca.count({ where: { encontroId: c.destino } })).toBe(0);
    expect(await frequenciaDaTurma(c.visitada)).toEqual(antesVisitada);
    expect(await frequenciaDaTurma(c.origem)).toEqual(antesOrigem);
  });

  it("mantém compareceu e não afeta reserva de outro encontro", async () => {
    const c = await cenario();
    const compareceu = await reservar(c);
    await adicionarVisitante({ encontroId: c.destino, turmaId: c.visitada }, c.catequizandoId);
    const outroEncontro = await criarEncontroPlanejadoDireto(c.visitada, c.tema, "2026-11-03");
    const deOutro = await criarReservaDireta({
      catequizandoId: await criarCatequizandoDireto({ nome: "Bia" }),
      temaId: c.tema,
      encontroId: outroEncontro,
      turmaOrigemId: c.origem,
    });
    await salvarChamada({ encontroId: c.destino, turmaId: c.visitada, modo: "nova" }, new Map());
    expect(await situacaoDe(compareceu)).toBe("compareceu");
    expect(await situacaoDe(deOutro)).toBe("reservada");
  });

  it("modo situacao-mudou não altera reservas", async () => {
    const c = await cenario();
    const reserva = await reservar(c);
    await salvarChamada({ encontroId: c.destino, turmaId: c.visitada, modo: "nova" }, new Map());
    // segunda gravação em modo nova: encontro já realizado
    const r = await salvarChamada(
      { encontroId: c.destino, turmaId: c.visitada, modo: "nova" },
      new Map(),
    );
    expect(r).toBe("situacao-mudou");
    expect(await situacaoDe(reserva)).toBe("nao_compareceu");
  });
});
