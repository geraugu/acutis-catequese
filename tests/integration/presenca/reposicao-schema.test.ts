import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarCatequizandoDireto,
  criarEncontroPlanejadoDireto,
  criarReservaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers-reposicao";

async function cenario() {
  const origem = await criarTurmaDireta({ nome: "Origem" });
  const destino = await criarTurmaDireta({ nome: "Destino" });
  const catequizandoId = await criarCatequizandoDireto();
  const temaId = await criarTemaDireto("Tema 1");
  const encontroId = await criarEncontroPlanejadoDireto(destino, temaId);
  return { origem, catequizandoId, temaId, encontroId };
}

describe("reserva_reposicao (schema)", () => {
  it("grava uma reserva com situação padrão reservada", async () => {
    const c = await cenario();
    const id = await criarReservaDireta({ ...c, turmaOrigemId: c.origem });
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id } });
    expect(r.situacao).toBe("reservada");
    expect(r.motivoCancelamento).toBeNull();
  });

  it("recusa segunda reserva reservada do mesmo catequizando e tema", async () => {
    const c = await cenario();
    await criarReservaDireta({ ...c, turmaOrigemId: c.origem });
    await expect(criarReservaDireta({ ...c, turmaOrigemId: c.origem })).rejects.toThrow();
  });

  it("aceita nova reserva depois de a primeira virar cancelada", async () => {
    const c = await cenario();
    const id = await criarReservaDireta({ ...c, turmaOrigemId: c.origem });
    await prisma.reservaReposicao.update({ where: { id }, data: { situacao: "cancelada" } });
    const novo = await criarReservaDireta({ ...c, turmaOrigemId: c.origem });
    expect(novo).not.toBe(id);
  });

  it("aceita reservas de temas diferentes e permite várias não ativas", async () => {
    const c = await cenario();
    await criarReservaDireta({ ...c, turmaOrigemId: c.origem, situacao: "cancelada" });
    await criarReservaDireta({ ...c, turmaOrigemId: c.origem, situacao: "cancelada" });
    await criarReservaDireta({ ...c, turmaOrigemId: c.origem, situacao: "compareceu" });
  });
});
