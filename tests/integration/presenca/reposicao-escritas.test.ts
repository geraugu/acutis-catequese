import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  cancelar,
  marcarNaoCompareceu,
  reservar,
  reservasDoCatequizando,
} from "@/modules/presenca/reposicao-repositorio";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarEncontroPlanejadoDireto,
  criarEncontroRealizadoDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarReservaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers-reposicao";

const HOJE = "2026-10-12" as DataCivil;
const INEXISTENTE = "00000000-0000-4000-8000-000000000000";

async function cenario() {
  const origem = await criarTurmaDireta({ nome: "Origem" });
  const outra = await criarTurmaDireta({ nome: "Terça" });
  const catequizandoId = await criarCatequizandoDireto({ nome: "Ana" });
  await criarInscricaoDireta(origem, catequizandoId);
  const t1 = await criarTemaDireto("Tema 1");
  const t2 = await criarTemaDireto("Tema 2");
  await criarEncontroRealizadoDireto(origem, t1, "2026-09-05");
  await criarEncontroRealizadoDireto(origem, t2, "2026-09-12");
  const destino1 = await criarEncontroPlanejadoDireto(outra, t1, "2026-10-20");
  const destino2 = await criarEncontroPlanejadoDireto(outra, t2, "2026-10-27");
  return { origem, outra, catequizandoId, t1, t2, destino1, destino2 };
}

const entrada = (c: Awaited<ReturnType<typeof cenario>>, encontroId: string, temaId: string) => ({
  catequizandoId: c.catequizandoId,
  encontroId,
  temaId,
  criadoPorId: "usuario-teste",
});

describe("reservar", () => {
  it("cria a reserva com a turma de origem (4.1)", async () => {
    const c = await cenario();
    const r = await reservar(entrada(c, c.destino1, c.t1), HOJE);
    expect(r.ok).toBe(true);
    const linhas = await prisma.reservaReposicao.findMany({
      where: { catequizandoId: c.catequizandoId },
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      situacao: "reservada",
      turmaOrigemId: c.origem,
      encontroId: c.destino1,
      temaId: c.t1,
    });
  });

  it("recusa opção indisponível (4.4)", async () => {
    const c = await cenario();
    const passado = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-05");
    const cancelado = await criarEncontroDireto(c.outra, {
      data: "2026-10-21",
      temaId: c.t1,
      situacao: "cancelado",
    });
    const daOrigem = await criarEncontroPlanejadoDireto(c.origem, c.t1, "2026-10-22");
    const encerrada = await criarTurmaDireta({ nome: "Enc", encerradaEm: "2026-10-01" });
    const deEncerrada = await criarEncontroPlanejadoDireto(encerrada, c.t1, "2026-10-23");
    const casos: [string, string][] = [
      [passado, c.t1],
      [cancelado, c.t1],
      [daOrigem, c.t1],
      [deEncerrada, c.t1],
      [c.destino1, c.t2], // tema diferente do encontro
      [INEXISTENTE, c.t1],
      ["nao-uuid", c.t1],
    ];
    for (const [enc, tema] of casos) {
      expect(await reservar(entrada(c, enc, tema), HOJE)).toEqual({
        ok: false,
        motivo: "indisponivel",
      });
    }
    expect(await prisma.reservaReposicao.count()).toBe(0);
  });

  it("sem turma de origem devolve sem-origem", async () => {
    const c = await cenario();
    const solto = await criarCatequizandoDireto({ nome: "Solto" });
    const r = await reservar({ ...entrada(c, c.destino1, c.t1), catequizandoId: solto }, HOJE);
    expect(r).toEqual({ ok: false, motivo: "sem-origem" });
  });

  it("recusa conflito de data com a origem ou com outra reserva (4.3)", async () => {
    const c = await cenario();
    await criarEncontroPlanejadoDireto(c.origem, null, "2026-10-20");
    expect(await reservar(entrada(c, c.destino1, c.t1), HOJE)).toEqual({
      ok: false,
      motivo: "conflito-de-data",
    });
    const t3 = await criarTemaDireto("Tema 3");
    await criarEncontroRealizadoDireto(c.origem, t3, "2026-09-19");
    const quarta = await criarTurmaDireta({ nome: "Quarta" });
    const d27 = await criarEncontroPlanejadoDireto(quarta, t3, "2026-10-27");
    expect((await reservar(entrada(c, c.destino2, c.t2), HOJE)).ok).toBe(true);
    expect(await reservar(entrada(c, d27, t3), HOJE)).toEqual({
      ok: false,
      motivo: "conflito-de-data",
    });
  });

  it("duas reservas simultâneas do mesmo tema: só uma vence (4.2)", async () => {
    const c = await cenario();
    const outro = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-11-03");
    const rs = await Promise.all([
      reservar(entrada(c, c.destino1, c.t1), HOJE),
      reservar(entrada(c, outro, c.t1), HOJE),
    ]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    const falha = rs.find((r) => !r.ok);
    expect(falha).toMatchObject({ ok: false, motivo: "ja-reservada" });
    expect(
      await prisma.reservaReposicao.count({ where: { situacao: "reservada", temaId: c.t1 } }),
    ).toBe(1);
  });

  it("mesmo tema já reservado devolve ja-reservada; mesmo encontro devolve indisponivel", async () => {
    const c = await cenario();
    const outro = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-11-03");
    expect((await reservar(entrada(c, c.destino1, c.t1), HOJE)).ok).toBe(true);
    expect(await reservar(entrada(c, outro, c.t1), HOJE)).toEqual({
      ok: false,
      motivo: "ja-reservada",
    });
    expect(await reservar(entrada(c, c.destino1, c.t1), HOJE)).toEqual({
      ok: false,
      motivo: "indisponivel",
    });
  });

  it("encontro em que já há presença é indisponível (3.4)", async () => {
    const c = await cenario();
    await criarPresencaDireta({
      encontroId: c.destino1,
      turmaId: c.outra,
      catequizandoId: c.catequizandoId,
      visitante: true,
      turmaOrigemId: c.origem,
    });
    expect(await reservar(entrada(c, c.destino1, c.t1), HOJE)).toEqual({
      ok: false,
      motivo: "indisponivel",
    });
  });

  it("reserva obsoleta não bloqueia a nova e é gravada como cancelada (6.1-6.3)", async () => {
    const c = await cenario();
    const velho = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.destino1,
      turmaOrigemId: c.origem,
    });
    await prisma.encontro.update({ where: { id: c.destino1 }, data: { situacao: "cancelado" } });
    const novo = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-11-03");
    const r = await reservar(entrada(c, novo, c.t1), HOJE);
    expect(r.ok).toBe(true);
    const gravada = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: velho } });
    expect(gravada).toMatchObject({
      situacao: "cancelada",
      motivoCancelamento: "encontro-cancelado",
    });
    const hist = await reservasDoCatequizando(c.catequizandoId);
    expect(hist.map((h) => h.situacao).sort()).toEqual(["cancelada", "reservada"]);
  });

  it("não escreve em presença, inscrição nem encontro (4.6)", async () => {
    const c = await cenario();
    const antes = await Promise.all([
      prisma.presenca.count(),
      prisma.inscricao.findMany({ orderBy: { id: "asc" } }),
      prisma.encontro.findMany({ orderBy: { id: "asc" } }),
    ]);
    expect((await reservar(entrada(c, c.destino1, c.t1), HOJE)).ok).toBe(true);
    const depois = await Promise.all([
      prisma.presenca.count(),
      prisma.inscricao.findMany({ orderBy: { id: "asc" } }),
      prisma.encontro.findMany({ orderBy: { id: "asc" } }),
    ]);
    expect(depois).toEqual(antes);
  });
});

describe("cancelar", () => {
  it("cancela a reservada sem motivo gravado (4.5)", async () => {
    const c = await cenario();
    const id = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.destino1,
      turmaOrigemId: c.origem,
    });
    expect(await cancelar(id, c.catequizandoId)).toBe("ok");
    const l = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id } });
    expect(l).toMatchObject({ situacao: "cancelada", motivoCancelamento: null });
    const [h] = await reservasDoCatequizando(c.catequizandoId);
    expect(h).toMatchObject({ situacao: "cancelada", motivo: "cancelada-por-usuario" });
  });

  it("recusa id inválido, outro catequizando e situação diferente", async () => {
    const c = await cenario();
    const outro = await criarCatequizandoDireto({ nome: "Bia" });
    const id = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.destino1,
      turmaOrigemId: c.origem,
    });
    const feita = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t2,
      encontroId: c.destino2,
      turmaOrigemId: c.origem,
      situacao: "compareceu",
    });
    expect(await cancelar("x", c.catequizandoId)).toBe("indisponivel");
    expect(await cancelar(INEXISTENTE, c.catequizandoId)).toBe("indisponivel");
    expect(await cancelar(id, outro)).toBe("indisponivel");
    expect(await cancelar(feita, c.catequizandoId)).toBe("indisponivel");
    expect((await prisma.reservaReposicao.findUniqueOrThrow({ where: { id } })).situacao).toBe(
      "reservada",
    );
  });
});

describe("marcarNaoCompareceu", () => {
  it("marca a ausência sem criar presença e é idempotente (5.3)", async () => {
    const c = await cenario();
    const id = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.destino1,
      turmaOrigemId: c.origem,
    });
    expect(await marcarNaoCompareceu(c.destino1, c.catequizandoId)).toBe("ok");
    expect(await marcarNaoCompareceu(c.destino1, c.catequizandoId)).toBe("ok");
    expect((await prisma.reservaReposicao.findUniqueOrThrow({ where: { id } })).situacao).toBe(
      "nao_compareceu",
    );
    expect(await prisma.presenca.count()).toBe(0);
  });

  it("sem reserva ativa ou com id inválido devolve indisponivel", async () => {
    const c = await cenario();
    expect(await marcarNaoCompareceu(c.destino1, c.catequizandoId)).toBe("indisponivel");
    expect(await marcarNaoCompareceu("x", c.catequizandoId)).toBe("indisponivel");
    await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.destino1,
      turmaOrigemId: c.origem,
      situacao: "cancelada",
    });
    expect(await marcarNaoCompareceu(c.destino1, c.catequizandoId)).toBe("indisponivel");
  });
});
