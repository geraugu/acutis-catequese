import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  candidatosDeReposicao,
  reservasDoCatequizando,
  reservasDoEncontro,
  temasTrabalhados,
  visaoOQueFalta,
} from "@/modules/presenca/reposicao-repositorio";
import {
  criarCatequizandoDireto,
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

/** Origem com o tema 1 e o tema 2 já trabalhados; o tema 3 ainda não. */
async function cenario() {
  const origem = await criarTurmaDireta({ nome: "Origem" });
  const outra = await criarTurmaDireta({ nome: "Terça" });
  const catequizandoId = await criarCatequizandoDireto({ nome: "Ana" });
  await criarInscricaoDireta(origem, catequizandoId);
  const t1 = await criarTemaDireto("Tema 1");
  const t2 = await criarTemaDireto("Tema 2");
  const t3 = await criarTemaDireto("Tema 3");
  await criarEncontroRealizadoDireto(origem, t1, "2026-09-05");
  await criarEncontroRealizadoDireto(origem, t2, "2026-09-12");
  return { origem, outra, catequizandoId, t1, t2, t3 };
}

describe("temasTrabalhados", () => {
  it("devolve só temas de encontros realizados nas turmas de origem", async () => {
    const c = await cenario();
    await criarEncontroPlanejadoDireto(c.origem, c.t3, "2026-10-20");
    await criarEncontroRealizadoDireto(c.outra, c.t3, "2026-09-13");
    const temas = await temasTrabalhados([c.origem]);
    expect([...temas].sort()).toEqual([c.t1, c.t2].sort());
  });

  it("sem origem devolve vazio", async () => {
    expect((await temasTrabalhados([])).size).toBe(0);
  });
});

describe("candidatosDeReposicao", () => {
  it("inclui outras turmas e o dia seguinte; exclui passado, cancelado, encerrada e origem", async () => {
    const c = await cenario();
    const encerrada = await criarTurmaDireta({ nome: "Encerrada", encerradaEm: "2026-10-01" });
    const boa = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-13");
    await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-05");
    await prisma.encontro.create({
      data: {
        turmaId: c.outra,
        temaId: c.t1,
        data: new Date("2026-10-20T00:00:00Z"),
        horario: "09:00",
        situacao: "cancelado",
        motivoCancelamento: "feriado",
      },
    });
    await criarEncontroPlanejadoDireto(encerrada, c.t1, "2026-10-21");
    await criarEncontroPlanejadoDireto(c.origem, c.t1, "2026-10-22");
    await criarEncontroPlanejadoDireto(c.outra, c.t3, "2026-10-23");
    const lista = await candidatosDeReposicao([c.t1], [c.origem], HOJE);
    expect(lista.map((x) => x.encontroId)).toEqual([boa]);
    expect(lista[0]).toMatchObject({ turmaNome: "Terça", data: "2026-10-13", temaId: c.t1 });
  });

  it("inclui o encontro de hoje", async () => {
    const c = await cenario();
    const hoje = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-12");
    const lista = await candidatosDeReposicao([c.t1], [c.origem], HOJE);
    expect(lista.map((x) => x.encontroId)).toEqual([hoje]);
  });
});

describe("visaoOQueFalta", () => {
  it("lista só temas trabalhados na origem, na ordem do programa", async () => {
    const c = await cenario();
    const v = await visaoOQueFalta(c.catequizandoId, HOJE);
    expect(v.origemTurmaIds).toEqual([c.origem]);
    expect(v.temas.map((t) => t.tema.id)).toEqual([c.t1, c.t2]);
    expect(v.temas.map((t) => t.tema.numero)).toEqual([1, 2]);
  });

  it("tema cumprido como visitante sai da lista", async () => {
    const c = await cenario();
    const visitado = await criarEncontroRealizadoDireto(c.outra, c.t1, "2026-09-06");
    await criarPresencaDireta({
      encontroId: visitado,
      turmaId: c.outra,
      catequizandoId: c.catequizandoId,
      visitante: true,
      turmaOrigemId: c.origem,
    });
    const v = await visaoOQueFalta(c.catequizandoId, HOJE);
    expect(v.temas.map((t) => t.tema.id)).toEqual([c.t2]);
  });

  it("traz opções de outras turmas por data, sem as que já têm presença", async () => {
    const c = await cenario();
    const dia2 = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    const outroCiclo = await criarTurmaDireta({ nome: "Cristo Rei" });
    const dia1 = await criarEncontroPlanejadoDireto(outroCiclo, c.t1, "2026-10-13");
    const comPresenca = await criarEncontroPlanejadoDireto(outroCiclo, c.t1, "2026-10-15");
    await criarPresencaDireta({
      encontroId: comPresenca,
      turmaId: outroCiclo,
      catequizandoId: c.catequizandoId,
      visitante: true,
      turmaOrigemId: c.origem,
    });
    const v = await visaoOQueFalta(c.catequizandoId, HOJE);
    const t1 = v.temas.find((t) => t.tema.id === c.t1);
    expect(t1?.opcoes.map((o) => o.encontroId)).toEqual([dia1, dia2]);
    expect(t1?.reserva).toBeNull();
  });

  it("marca conflito quando a data coincide com encontro da origem", async () => {
    const c = await cenario();
    await criarEncontroPlanejadoDireto(c.origem, c.t3, "2026-10-14");
    const op = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    const v = await visaoOQueFalta(c.catequizandoId, HOJE);
    const o = v.temas.find((t) => t.tema.id === c.t1)?.opcoes.find((x) => x.encontroId === op);
    expect(o?.conflito).toBe(true);
  });

  it("exibe a reserva ativa no lugar das opções", async () => {
    const c = await cenario();
    const enc = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-21");
    const id = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: enc,
      turmaOrigemId: c.origem,
    });
    const v = await visaoOQueFalta(c.catequizandoId, HOJE);
    const t1 = v.temas.find((t) => t.tema.id === c.t1);
    expect(t1?.reserva).toMatchObject({
      id,
      situacao: "reservada",
      turmaDestinoNome: "Terça",
      data: "2026-10-14",
    });
    expect(t1?.opcoes).toEqual([]);
  });

  it("reserva obsoleta não aparece como ativa e o tema volta a ter opções", async () => {
    const c = await cenario();
    const enc = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    await prisma.encontro.update({
      where: { id: enc },
      data: { situacao: "cancelado", motivoCancelamento: "chuva" },
    });
    const outra = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-21");
    await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: enc,
      turmaOrigemId: c.origem,
    });
    const v = await visaoOQueFalta(c.catequizandoId, HOJE);
    const t1 = v.temas.find((t) => t.tema.id === c.t1);
    expect(t1?.reserva).toBeNull();
    expect(t1?.opcoes.map((o) => o.encontroId)).toEqual([outra]);
  });

  it("sem inscrição vigente não há origem nem temas", async () => {
    const turma = await criarTurmaDireta({ nome: "Antiga" });
    const id = await criarCatequizandoDireto({ nome: "Bia" });
    await criarInscricaoDireta(turma, id, { dataSaida: "2026-08-01" });
    const v = await visaoOQueFalta(id, HOJE);
    expect(v).toEqual({ origemTurmaIds: [], temas: [] });
  });

  it("id inválido devolve visão vazia", async () => {
    expect(await visaoOQueFalta("nao-uuid", HOJE)).toEqual({ origemTurmaIds: [], temas: [] });
  });
});

describe("reservasDoCatequizando", () => {
  it("devolve o histórico completo com situação efetiva e motivo", async () => {
    const c = await cenario();
    const e1 = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    const e2 = await criarEncontroPlanejadoDireto(c.outra, c.t2, "2026-10-21");
    const e3 = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-28");
    await prisma.encontro.update({
      where: { id: e1 },
      data: { situacao: "cancelado", motivoCancelamento: "chuva" },
    });
    const obsoleta = await criarReservaDireta({ ...base(c), encontroId: e1, temaId: c.t1 });
    const ativa = await criarReservaDireta({ ...base(c), encontroId: e2, temaId: c.t2 });
    const manual = await criarReservaDireta({
      ...base(c),
      encontroId: e3,
      temaId: c.t1,
      situacao: "cancelada",
      motivoCancelamento: "tema-alterado",
    });
    const lista = await reservasDoCatequizando(c.catequizandoId);
    expect(lista).toHaveLength(3);
    const por = new Map(lista.map((r) => [r.id, r]));
    expect(por.get(obsoleta)).toMatchObject({
      situacao: "cancelada",
      motivo: "encontro-cancelado",
      temaNumero: 1,
      turmaOrigemNome: "Origem",
    });
    expect(por.get(ativa)).toMatchObject({ situacao: "reservada", motivo: null });
    expect(por.get(manual)).toMatchObject({ situacao: "cancelada", motivo: "tema-alterado" });
  });

  it("cancelada pelo usuário e saída da origem", async () => {
    const c = await cenario();
    const e1 = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    const e2 = await criarEncontroPlanejadoDireto(c.outra, c.t2, "2026-10-21");
    const usuario = await criarReservaDireta({
      ...base(c),
      encontroId: e1,
      temaId: c.t1,
      situacao: "cancelada",
    });
    const saiu = await criarReservaDireta({ ...base(c), encontroId: e2, temaId: c.t2 });
    await prisma.inscricao.updateMany({
      where: { catequizandoId: c.catequizandoId },
      data: { dataSaida: new Date("2026-10-10T00:00:00Z") },
    });
    const por = new Map((await reservasDoCatequizando(c.catequizandoId)).map((r) => [r.id, r]));
    expect(por.get(usuario)).toMatchObject({ motivo: "cancelada-por-usuario" });
    expect(por.get(saiu)).toMatchObject({ situacao: "cancelada", motivo: "saiu-da-turma" });
  });

  it("id inválido ou sem reservas devolve lista vazia", async () => {
    expect(await reservasDoCatequizando("nao-uuid")).toEqual([]);
    expect(await reservasDoCatequizando(INEXISTENTE)).toEqual([]);
  });
});

describe("reservasDoEncontro", () => {
  it("lista as reservas do encontro com nome, origem e situação efetiva", async () => {
    const c = await cenario();
    const enc = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    const bruno = await criarCatequizandoDireto({ nome: "Bruno" });
    await criarInscricaoDireta(c.origem, bruno);
    const r1 = await criarReservaDireta({ ...base(c), encontroId: enc, temaId: c.t1 });
    const r2 = await criarReservaDireta({
      catequizandoId: bruno,
      temaId: c.t1,
      encontroId: enc,
      turmaOrigemId: c.origem,
      situacao: "compareceu",
    });
    const lista = await reservasDoEncontro(enc);
    expect(lista).toEqual([
      expect.objectContaining({
        reservaId: r1,
        catequizandoId: c.catequizandoId,
        nome: "Ana",
        turmaOrigemNome: "Origem",
        situacao: "reservada",
      }),
      expect.objectContaining({ reservaId: r2, nome: "Bruno", situacao: "compareceu" }),
    ]);
  });

  it("catequizando inativado aparece como cancelada (o gatilho encerra a inscrição)", async () => {
    const c = await cenario();
    const enc = await criarEncontroPlanejadoDireto(c.outra, c.t1, "2026-10-14");
    await criarReservaDireta({ ...base(c), encontroId: enc, temaId: c.t1 });
    await prisma.catequizando.update({
      where: { id: c.catequizandoId },
      data: { estado: "inativo" },
    });
    const [r] = await reservasDoEncontro(enc);
    expect(r).toMatchObject({ situacao: "cancelada", motivo: "saiu-da-turma" });
  });

  it("id inválido devolve vazio", async () => {
    expect(await reservasDoEncontro("nao-uuid")).toEqual([]);
  });
});

function base(c: { catequizandoId: string; origem: string }) {
  return { catequizandoId: c.catequizandoId, turmaOrigemId: c.origem };
}
