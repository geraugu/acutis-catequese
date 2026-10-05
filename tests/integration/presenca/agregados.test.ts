import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  alertasDeFrequencia,
  cumpridosDoCatequizando,
  frequenciaDaTurma,
  frequenciaPorTurma,
  inscritosSemOTema,
  presencasDoCatequizando,
  resumoPorEncontro,
  salvarChamada,
  temasAtivosNumerados,
} from "@/modules/presenca/repositorio";
import type { StatusPresenca } from "@/modules/presenca/domain/frequencia";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTemaDireto,
  criarTurmaDireta,
  dia,
} from "./helpers";

const INEXISTENTE = "00000000-0000-4000-8000-000000000000";

async function encontroRealizado(
  turmaId: string,
  data: string,
  extra: { temaId?: string | null; horario?: string } = {},
) {
  return criarEncontroDireto(turmaId, { data, situacao: "realizado", ...extra });
}

const pres = (
  encontroId: string,
  turmaId: string,
  catequizandoId: string,
  status: StatusPresenca,
) => criarPresencaDireta({ encontroId, turmaId, catequizandoId, status });

describe("resumoPorEncontro", () => {
  it("conta inscritos e visitantes à parte, só de encontros realizados", async () => {
    const turma = await criarTurmaDireta({ nome: "Resumo A" });
    const origem = await criarTurmaDireta({ nome: "Resumo Origem" });
    const e1 = await encontroRealizado(turma, "2026-09-05");
    const e2 = await encontroRealizado(turma, "2026-09-12");
    const plan = await criarEncontroDireto(turma, { data: "2026-09-19" });
    const a = await criarCatequizandoDireto({ nome: "Ana" });
    const b = await criarCatequizandoDireto({ nome: "Bia" });
    const v = await criarCatequizandoDireto({ nome: "Visi" });
    await pres(e1, turma, a, "presente");
    await pres(e1, turma, b, "justificado");
    await criarPresencaDireta({
      encontroId: e1,
      turmaId: turma,
      catequizandoId: v,
      visitante: true,
      turmaOrigemId: origem,
    });
    await pres(e2, turma, a, "ausente");
    await pres(plan, turma, a, "presente");
    const r = await resumoPorEncontro(turma);
    expect(r.get(e1)).toEqual({
      presentes: 1,
      ausentes: 0,
      justificados: 1,
      total: 2,
      visitantes: 1,
    });
    expect(r.get(e2)).toMatchObject({ ausentes: 1, total: 1, visitantes: 0 });
    expect(r.has(plan)).toBe(false);
    expect((await resumoPorEncontro("nao-uuid")).size).toBe(0);
  });

  it("encontro reaberto sai do resumo", async () => {
    const turma = await criarTurmaDireta();
    const e = await encontroRealizado(turma, "2026-09-05");
    const a = await criarCatequizandoDireto();
    await pres(e, turma, a, "presente");
    await prisma.encontro.update({ where: { id: e }, data: { situacao: "planejado" } });
    expect((await resumoPorEncontro(turma)).has(e)).toBe(false);
  });
});

describe("frequenciaDaTurma", () => {
  it("lista os vigentes por nome, sem visitantes e sem encontros reabertos", async () => {
    const turma = await criarTurmaDireta({ nome: "Freq A" });
    const outra = await criarTurmaDireta({ nome: "Freq B" });
    const e1 = await encontroRealizado(turma, "2026-09-05");
    const e2 = await encontroRealizado(turma, "2026-09-12");
    const reaberto = await encontroRealizado(turma, "2026-09-19");
    const eOutra = await encontroRealizado(outra, "2026-09-05");
    const zeca = await criarCatequizandoDireto({ nome: "Zeca" });
    const ana = await criarCatequizandoDireto({ nome: "Ana" });
    const sem = await criarCatequizandoDireto({ nome: "Bruno sem presenças" });
    const visita = await criarCatequizandoDireto({ nome: "Visitante" });
    const saiu = await criarCatequizandoDireto({ nome: "Saiu" });
    await criarInscricaoDireta(turma, zeca);
    await criarInscricaoDireta(turma, ana);
    await criarInscricaoDireta(turma, sem);
    await criarInscricaoDireta(turma, saiu, { dataSaida: "2026-09-10" });
    await criarInscricaoDireta(outra, visita);
    await pres(e1, turma, ana, "presente");
    await pres(e2, turma, ana, "ausente");
    await pres(e1, turma, zeca, "justificado");
    await pres(reaberto, turma, ana, "ausente");
    await pres(eOutra, outra, ana, "ausente");
    await prisma.encontro.update({ where: { id: reaberto }, data: { situacao: "planejado" } });
    await criarPresencaDireta({
      encontroId: e1,
      turmaId: turma,
      catequizandoId: visita,
      visitante: true,
      turmaOrigemId: outra,
    });
    const r = await frequenciaDaTurma(turma);
    expect(r.map((x) => x.nome)).toEqual(["Ana", "Bruno sem presenças", "Zeca"]);
    expect(r[0].contagem).toEqual({ presentes: 1, ausentes: 1, justificados: 0, total: 2 });
    expect(r[1].contagem.total).toBe(0);
    expect(r[2].contagem).toMatchObject({ justificados: 1, total: 1 });
    expect(await frequenciaDaTurma("nao-uuid")).toEqual([]);
    expect(await frequenciaDaTurma(INEXISTENTE)).toEqual([]);
  });

  it("quem entrou depois só conta os encontros em que constava na chamada", async () => {
    const turma = await criarTurmaDireta();
    const e1 = await encontroRealizado(turma, "2026-09-05");
    const e2 = await encontroRealizado(turma, "2026-09-12");
    const tarde = await criarCatequizandoDireto({ nome: "Tarde" });
    await criarInscricaoDireta(turma, tarde, { dataEntrada: "2026-09-10" });
    await pres(e2, turma, tarde, "presente");
    expect(e1).not.toBe(e2);
    const [t] = await frequenciaDaTurma(turma);
    expect(t.contagem).toEqual({ presentes: 1, ausentes: 0, justificados: 0, total: 1 });
  });

  it("turma encerrada é consultável e inclui quem teve inscrição ou presença nela", async () => {
    const turma = await criarTurmaDireta({ nome: "Encerrada" });
    const e = await encontroRealizado(turma, "2026-09-05");
    const a = await criarCatequizandoDireto({ nome: "Ana" });
    const b = await criarCatequizandoDireto({ nome: "Beto" });
    await criarInscricaoDireta(turma, a);
    await criarInscricaoDireta(turma, b);
    await pres(e, turma, a, "presente");
    await prisma.inscricao.updateMany({
      where: { turmaId: turma },
      data: { dataSaida: dia("2026-12-01"), motivoSaida: "encerramento" },
    });
    await prisma.turma.update({ where: { id: turma }, data: { encerradaEm: dia("2026-12-01") } });
    const r = await frequenciaDaTurma(turma);
    expect(r.map((x) => [x.nome, x.contagem.presentes, x.contagem.total])).toEqual([
      ["Ana", 1, 1],
      ["Beto", 0, 0],
    ]);
  });
});

describe("frequenciaPorTurma", () => {
  it("uma entrada por turma, a atual primeiro e depois por ciclo decrescente", async () => {
    const velha = await criarTurmaDireta({ nome: "Ciclo velho" });
    const media = await criarTurmaDireta({ nome: "Ciclo médio" });
    const atual = await criarTurmaDireta({ nome: "Ciclo atual" });
    await prisma.turma.update({ where: { id: velha }, data: { ciclo: 2024 } });
    await prisma.turma.update({ where: { id: media }, data: { ciclo: 2025 } });
    const c = await criarCatequizandoDireto({ nome: "Cátia" });
    const eV = await encontroRealizado(velha, "2024-09-05");
    const eM = await encontroRealizado(media, "2025-09-05");
    const eA = await encontroRealizado(atual, "2026-09-05");
    await criarInscricaoDireta(velha, c, { dataSaida: "2025-01-01" });
    await criarInscricaoDireta(atual, c);
    await pres(eV, velha, c, "ausente");
    await pres(eM, media, c, "presente");
    await pres(eA, atual, c, "presente");
    const r = await frequenciaPorTurma(c);
    expect(r.map((x) => [x.turmaNome, x.atual])).toEqual([
      ["Ciclo atual", true],
      ["Ciclo médio", false],
      ["Ciclo velho", false],
    ]);
    expect(r[2].contagem).toMatchObject({ ausentes: 1, total: 1 });
    expect(await frequenciaPorTurma("nao-uuid")).toEqual([]);
  });

  it("não conta visitas nem reaberto; desligado continua consultável", async () => {
    const turma = await criarTurmaDireta({ nome: "Casa" });
    const outra = await criarTurmaDireta({ nome: "Fora" });
    const e1 = await encontroRealizado(turma, "2026-09-05");
    const e2 = await encontroRealizado(turma, "2026-09-12");
    const eFora = await encontroRealizado(outra, "2026-09-05");
    const c = await criarCatequizandoDireto({ nome: "Desligado", estado: "inativo" });
    await criarInscricaoDireta(turma, c, { dataSaida: "2026-09-20" });
    await pres(e1, turma, c, "presente");
    await pres(e2, turma, c, "ausente");
    await criarPresencaDireta({
      encontroId: eFora,
      turmaId: outra,
      catequizandoId: c,
      visitante: true,
      turmaOrigemId: turma,
    });
    await prisma.encontro.update({ where: { id: e2 }, data: { situacao: "planejado" } });
    const r = await frequenciaPorTurma(c);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ turmaId: turma, atual: false });
    expect(r[0].contagem).toMatchObject({ presentes: 1, total: 1 });
  });

  it("a falta de origem continua depois da reposição", async () => {
    const turma = await criarTurmaDireta();
    const e = await encontroRealizado(turma, "2026-09-05");
    const rep = await encontroRealizado(turma, "2026-09-06");
    const c = await criarCatequizandoDireto();
    await criarInscricaoDireta(turma, c);
    await pres(e, turma, c, "ausente");
    await criarPresencaDireta({
      encontroId: rep,
      turmaId: turma,
      catequizandoId: c,
      visitante: true,
      turmaOrigemId: await criarTurmaDireta({ nome: "Outra origem" }),
    });
    const [t] = await frequenciaPorTurma(c);
    expect(t.contagem).toMatchObject({ presentes: 0, ausentes: 1, total: 1 });
  });
});

describe("presencasDoCatequizando e progresso", () => {
  it("lista encontros realizados, mais recente primeiro, com tema e visitante", async () => {
    const tema = await criarTemaDireto("Tema lista");
    const turma = await criarTurmaDireta({ nome: "Lista A" });
    const outra = await criarTurmaDireta({ nome: "Lista B" });
    const e1 = await encontroRealizado(turma, "2026-09-05", { temaId: tema });
    const e2 = await encontroRealizado(outra, "2026-09-12");
    const plan = await criarEncontroDireto(turma, { data: "2026-09-19" });
    const c = await criarCatequizandoDireto();
    await criarInscricaoDireta(turma, c);
    await pres(e1, turma, c, "ausente");
    await criarPresencaDireta({
      encontroId: e2,
      turmaId: outra,
      catequizandoId: c,
      visitante: true,
      turmaOrigemId: turma,
    });
    await pres(plan, turma, c, "presente");
    expect(await presencasDoCatequizando(c)).toEqual([
      {
        data: "2026-09-12",
        turmaNome: "Lista B",
        temaTitulo: null,
        status: "presente",
        visitante: true,
      },
      {
        data: "2026-09-05",
        turmaNome: "Lista A",
        temaTitulo: "Tema lista",
        status: "ausente",
        visitante: false,
      },
    ]);
    expect(await presencasDoCatequizando("nao-uuid")).toEqual([]);
  });

  it("cumpridos: só presente em realizado com tema, na turma ou como visitante", async () => {
    const t1 = await criarTemaDireto("Cumprido 1");
    const t2 = await criarTemaDireto("Cumprido 2");
    const t3 = await criarTemaDireto("Cumprido 3");
    const turma = await criarTurmaDireta({ nome: "Prog A" });
    const outra = await criarTurmaDireta({ nome: "Prog B" });
    const c = await criarCatequizandoDireto();
    await criarInscricaoDireta(turma, c);
    const e1 = await encontroRealizado(turma, "2026-09-05", { temaId: t1 });
    const e2 = await encontroRealizado(outra, "2026-09-12", { temaId: t2 });
    const e3 = await encontroRealizado(turma, "2026-09-19", { temaId: t3 });
    const e4 = await encontroRealizado(turma, "2026-09-26");
    const e5 = await criarEncontroDireto(turma, { data: "2026-10-03", temaId: t3 });
    await pres(e1, turma, c, "presente");
    await criarPresencaDireta({
      encontroId: e2,
      turmaId: outra,
      catequizandoId: c,
      visitante: true,
      turmaOrigemId: turma,
    });
    await pres(e3, turma, c, "justificado");
    await pres(e4, turma, c, "presente");
    await pres(e5, turma, c, "presente");
    const r = await cumpridosDoCatequizando(c);
    expect(r.sort((x, y) => x.data.localeCompare(y.data))).toEqual([
      { temaId: t1, turmaNome: "Prog A", data: "2026-09-05", visitante: false },
      { temaId: t2, turmaNome: "Prog B", data: "2026-09-12", visitante: true },
    ]);
  });

  it("temasAtivosNumerados devolve só os ativos na ordem do programa", async () => {
    const a = await criarTemaDireto("Ord ativo B", { posicao: 9002 });
    const x = await criarTemaDireto("Ord desativado", { posicao: 9001, ativo: false });
    const b = await criarTemaDireto("Ord ativo A", { posicao: 9000 });
    const r = await temasAtivosNumerados();
    const ids = r.map((t) => t.id);
    expect(ids).not.toContain(x);
    expect(ids.indexOf(b)).toBeLessThan(ids.indexOf(a));
    expect(r.map((t) => t.numero)).toEqual(r.map((_, i) => i + 1));
  });
});

describe("inscritosSemOTema", () => {
  it("exclui quem esteve presente no tema, inclusive em reposição de outra turma", async () => {
    const tema = await criarTemaDireto("Sem tema");
    const turma = await criarTurmaDireta({ nome: "ST A" });
    const outra = await criarTurmaDireta({ nome: "ST B" });
    const eFuturo = await criarEncontroDireto(turma, { data: "2026-10-10", temaId: tema });
    const eOutra = await encontroRealizado(outra, "2026-09-05", { temaId: tema });
    const eAntes = await encontroRealizado(turma, "2026-09-05", { temaId: tema });
    const ana = await criarCatequizandoDireto({ nome: "Ana presente" });
    const bia = await criarCatequizandoDireto({ nome: "Bia visitou" });
    const cris = await criarCatequizandoDireto({ nome: "Cris ausente" });
    const dani = await criarCatequizandoDireto({ nome: "Dani nada" });
    for (const c of [ana, bia, cris, dani]) await criarInscricaoDireta(turma, c);
    await pres(eAntes, turma, ana, "presente");
    await criarPresencaDireta({
      encontroId: eOutra,
      turmaId: outra,
      catequizandoId: bia,
      visitante: true,
      turmaOrigemId: turma,
    });
    await pres(eAntes, turma, cris, "ausente");
    const r = await inscritosSemOTema(turma, "2026-10-10" as DataCivil, tema);
    expect(r.map((x) => x.nome)).toEqual(["Cris ausente", "Dani nada"]);
    expect(eFuturo).toBeTruthy();
    expect(await inscritosSemOTema("nao-uuid", "2026-10-10" as DataCivil, tema)).toEqual([]);
  });
});

describe("alertasDeFrequencia", () => {
  it("só inscrição vigente em turma aberta, ordenada e restrita às turmas informadas", async () => {
    const t1 = await criarTurmaDireta({ nome: "Alerta 1" });
    const t2 = await criarTurmaDireta({ nome: "Alerta 2" });
    const enc = await criarTurmaDireta({ nome: "Alerta encerrada" });
    const e1a = await encontroRealizado(t1, "2026-09-05");
    const e1b = await encontroRealizado(t1, "2026-09-12");
    const e2a = await encontroRealizado(t2, "2026-09-05");
    const eEnc = await encontroRealizado(enc, "2026-09-05");
    const zero = await criarCatequizandoDireto({ nome: "Zero" });
    const meio = await criarCatequizandoDireto({ nome: "Meio" });
    const bom = await criarCatequizandoDireto({ nome: "Bom" });
    const saiu = await criarCatequizandoDireto({ nome: "Saiu" });
    const inativo = await criarCatequizandoDireto({ nome: "Inativo", estado: "inativo" });
    const encerrado = await criarCatequizandoDireto({ nome: "Turma encerrada" });
    const outro = await criarCatequizandoDireto({ nome: "Da turma 2" });
    for (const c of [zero, meio, bom, inativo]) await criarInscricaoDireta(t1, c);
    await criarInscricaoDireta(t1, saiu, { dataSaida: "2026-09-13" });
    await criarInscricaoDireta(enc, encerrado, { dataSaida: "2026-12-01" });
    await criarInscricaoDireta(t2, outro);
    await prisma.turma.update({ where: { id: enc }, data: { encerradaEm: dia("2026-12-01") } });
    await pres(e1a, t1, zero, "ausente");
    await pres(e1b, t1, zero, "justificado");
    await pres(e1a, t1, meio, "presente");
    await pres(e1b, t1, meio, "ausente");
    await pres(e1a, t1, bom, "presente");
    await pres(e1b, t1, bom, "presente");
    await pres(e1a, t1, saiu, "ausente");
    await pres(e1a, t1, inativo, "ausente");
    await pres(eEnc, enc, encerrado, "ausente");
    await pres(e2a, t2, outro, "ausente");
    await prisma.inscricao.updateMany({
      where: { catequizandoId: inativo },
      data: { dataSaida: dia("2026-09-14"), motivoSaida: "inativacao" },
    });
    const todas = await alertasDeFrequencia("todas", 75);
    const nossos = todas.filter((a) => [t1, t2].includes(a.turmaId));
    expect(nossos.map((a) => a.nome)).toEqual(["Da turma 2", "Zero", "Meio"]);
    expect(nossos[1]).toMatchObject({ catequizandoId: zero, turmaId: t1, turmaNome: "Alerta 1" });
    expect(nossos[2].contagem).toMatchObject({ presentes: 1, total: 2 });
    expect(todas.some((a) => a.catequizandoId === encerrado)).toBe(false);
    const soT1 = await alertasDeFrequencia([t1], 75);
    expect(soT1.map((a) => a.nome)).toEqual(["Zero", "Meio"]);
    expect(await alertasDeFrequencia([], 75)).toEqual([]);
    expect(await alertasDeFrequencia(["nao-uuid"], 75)).toEqual([]);
  });

  it("quem não tem encontros não alerta", async () => {
    const t = await criarTurmaDireta({ nome: "Sem encontros" });
    const c = await criarCatequizandoDireto();
    await criarInscricaoDireta(t, c);
    expect(await alertasDeFrequencia([t], 100)).toEqual([]);
  });
});

describe("nenhuma presença é removida pelos efeitos de outros módulos", () => {
  it("desligar, transferir, inativar e encerrar a turma preservam as presenças", async () => {
    const turma = await criarTurmaDireta({ nome: "Preserva" });
    const destino = await criarTurmaDireta({ nome: "Preserva destino" });
    const e = await encontroRealizado(turma, "2026-09-05");
    const cs = [
      await criarCatequizandoDireto({ nome: "P1" }),
      await criarCatequizandoDireto({ nome: "P2" }),
      await criarCatequizandoDireto({ nome: "P3" }),
    ];
    for (const c of cs) {
      await criarInscricaoDireta(turma, c);
      await pres(e, turma, c, "presente");
    }
    const total = () => prisma.presenca.count({ where: { encontroId: e } });
    expect(await total()).toBe(3);
    const sair = (c: string, motivo: "desligamento" | "transferencia" | "inativacao") =>
      prisma.inscricao.updateMany({
        where: { catequizandoId: c, turmaId: turma },
        data: { dataSaida: dia("2026-09-10"), motivoSaida: motivo },
      });
    await sair(cs[0], "desligamento");
    await sair(cs[1], "transferencia");
    await criarInscricaoDireta(destino, cs[1], { dataEntrada: "2026-09-10" });
    await sair(cs[2], "inativacao");
    await prisma.catequizando.update({ where: { id: cs[2] }, data: { estado: "inativo" } });
    await prisma.turma.update({ where: { id: turma }, data: { encerradaEm: dia("2026-12-01") } });
    expect(await total()).toBe(3);
    const r = await frequenciaDaTurma(turma);
    expect(r.every((x) => x.contagem.presentes === 1)).toBe(true);
    expect(r).toHaveLength(3);
  });

  it("salvarChamada continua funcionando sobre os mesmos dados", async () => {
    const turma = await criarTurmaDireta();
    const e = await criarEncontroDireto(turma);
    const c = await criarCatequizandoDireto();
    await criarInscricaoDireta(turma, c);
    expect(
      await salvarChamada(
        { encontroId: e, turmaId: turma, modo: "nova" },
        new Map<string, StatusPresenca>([[c, "ausente"]]),
      ),
    ).toBe("ok");
    expect((await frequenciaDaTurma(turma))[0].contagem.ausentes).toBe(1);
  });
});
