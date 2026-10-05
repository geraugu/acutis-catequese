import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  adicionarVisitante,
  buscarVisitantes,
  dadosDoEncontro,
  inscritosNaData,
  presencasDoEncontro,
  removerVisitante,
  salvarChamada,
} from "@/modules/presenca/repositorio";
import type { StatusPresenca } from "@/modules/presenca/domain/frequencia";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers";

const DATA = "2026-09-05" as DataCivil;
const INEXISTENTE = "00000000-0000-4000-8000-000000000000";

async function cenario() {
  const turmaId = await criarTurmaDireta({ nome: "Eucaristia A" });
  const encontroId = await criarEncontroDireto(turmaId, { data: DATA });
  const a = await criarCatequizandoDireto({ nome: "Ana" });
  const b = await criarCatequizandoDireto({ nome: "Bruno" });
  await criarInscricaoDireta(turmaId, a);
  await criarInscricaoDireta(turmaId, b);
  return { turmaId, encontroId, a, b };
}

const marcar = (pares: [string, StatusPresenca][]) => new Map<string, StatusPresenca>(pares);

describe("dadosDoEncontro", () => {
  it("devolve os dados do encontro com o número do tema entre os ativos", async () => {
    await criarTemaDireto("Tema desativado", { ativo: false });
    const t1 = await criarTemaDireto("Tema um");
    const t2 = await criarTemaDireto("Tema dois");
    const turmaId = await criarTurmaDireta({ nome: "Turma X" });
    const encontroId = await criarEncontroDireto(turmaId, { data: DATA, temaId: t2 });
    const dados = await dadosDoEncontro(turmaId, encontroId);
    expect(dados).toMatchObject({
      id: encontroId,
      turmaId,
      turmaNome: "Turma X",
      turmaEncerrada: false,
      data: DATA,
      situacao: "planejado",
      temaId: t2,
      temaTitulo: "Tema dois",
    });
    expect(dados?.temaNumero).not.toBeNull();
    const outro = await criarEncontroDireto(turmaId, { data: "2026-09-12", temaId: t1 });
    const d1 = await dadosDoEncontro(turmaId, outro);
    expect((d1?.temaNumero ?? 0) < (dados?.temaNumero ?? 0)).toBe(true);
  });

  it("não tem número quando não há tema ou o tema está desativado", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-12-01" });
    const semTema = await criarEncontroDireto(turmaId);
    const desativado = await criarTemaDireto("Desativado", { ativo: false });
    const comDesativado = await criarEncontroDireto(turmaId, {
      data: "2026-09-12",
      temaId: desativado,
    });
    const a = await dadosDoEncontro(turmaId, semTema);
    const b = await dadosDoEncontro(turmaId, comDesativado);
    expect(a).toMatchObject({ turmaEncerrada: true, temaId: null, temaNumero: null });
    expect(b).toMatchObject({ temaId: desativado, temaNumero: null });
  });

  it("devolve null se o encontro é de outra turma ou o id é inválido", async () => {
    const { encontroId } = await cenario();
    const outra = await criarTurmaDireta();
    expect(await dadosDoEncontro(outra, encontroId)).toBeNull();
    expect(await dadosDoEncontro("nao-uuid", encontroId)).toBeNull();
    expect(await dadosDoEncontro(outra, INEXISTENTE)).toBeNull();
  });
});

describe("inscritosNaData", () => {
  it("respeita a entrada e a saída exclusiva, em ordem de nome, de qualquer estado", async () => {
    const turmaId = await criarTurmaDireta();
    const zeca = await criarCatequizandoDireto({ nome: "Zeca" });
    const ana = await criarCatequizandoDireto({ nome: "Ana", estado: "inativo" });
    const futuro = await criarCatequizandoDireto({ nome: "Futuro" });
    const saiu = await criarCatequizandoDireto({ nome: "Saiu" });
    const saiuDepois = await criarCatequizandoDireto({ nome: "Saiu Depois" });
    await criarInscricaoDireta(turmaId, zeca, { dataEntrada: "2026-09-05" });
    await criarInscricaoDireta(turmaId, ana, { dataEntrada: "2026-02-01" });
    await criarInscricaoDireta(turmaId, futuro, { dataEntrada: "2026-09-06" });
    await criarInscricaoDireta(turmaId, saiu, {
      dataEntrada: "2026-02-01",
      dataSaida: "2026-09-05",
    });
    await criarInscricaoDireta(turmaId, saiuDepois, {
      dataEntrada: "2026-02-01",
      dataSaida: "2026-09-06",
    });
    const lista = await inscritosNaData(turmaId, DATA);
    expect(lista).toEqual([
      { catequizandoId: ana, nome: "Ana" },
      { catequizandoId: saiuDepois, nome: "Saiu Depois" },
      { catequizandoId: zeca, nome: "Zeca" },
    ]);
  });

  it("devolve vazio para turma inválida", async () => {
    expect(await inscritosNaData("nao-uuid", DATA)).toEqual([]);
  });
});

describe("salvarChamada", () => {
  it("grava todas as marcações e marca o encontro como realizado", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    const r = await salvarChamada(
      { encontroId, turmaId, modo: "nova" },
      marcar([
        [a, "presente"],
        [b, "justificado"],
      ]),
    );
    expect(r).toBe("ok");
    const registros = await presencasDoEncontro(encontroId);
    expect(registros).toEqual([
      {
        catequizandoId: a,
        nome: "Ana",
        status: "presente",
        visitante: false,
        turmaOrigemNome: null,
      },
      {
        catequizandoId: b,
        nome: "Bruno",
        status: "justificado",
        visitante: false,
        turmaOrigemNome: null,
      },
    ]);
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e.situacao).toBe("realizado");
    const linha = await prisma.presenca.findFirstOrThrow({ where: { encontroId } });
    expect(linha.turmaId).toBe(turmaId);
  });

  it("na correção atualiza os status sem mudar a situação", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    await salvarChamada(
      { encontroId, turmaId, modo: "nova" },
      marcar([
        [a, "presente"],
        [b, "presente"],
      ]),
    );
    const r = await salvarChamada(
      { encontroId, turmaId, modo: "correcao" },
      marcar([
        [a, "ausente"],
        [b, "presente"],
      ]),
    );
    expect(r).toBe("ok");
    const registros = await presencasDoEncontro(encontroId);
    expect(registros.map((x) => x.status)).toEqual(["ausente", "presente"]);
    expect(await prisma.presenca.count({ where: { encontroId } })).toBe(2);
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e.situacao).toBe("realizado");
  });

  it("com duas chamadas concorrentes só uma vence e a outra não grava nada", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    const [r1, r2] = await Promise.all([
      salvarChamada(
        { encontroId, turmaId, modo: "nova" },
        marcar([
          [a, "presente"],
          [b, "presente"],
        ]),
      ),
      salvarChamada(
        { encontroId, turmaId, modo: "nova" },
        marcar([
          [a, "ausente"],
          [b, "ausente"],
        ]),
      ),
    ]);
    expect([r1, r2].sort()).toEqual(["ok", "situacao-mudou"]);
    const vencedor = r1 === "ok" ? "presente" : "ausente";
    const registros = await presencasDoEncontro(encontroId);
    expect(registros).toHaveLength(2);
    expect(registros.every((x) => x.status === vencedor)).toBe(true);
  });

  it("devolve situacao-mudou sem gravar quando o encontro já não está planejado", async () => {
    const { turmaId, encontroId, a } = await cenario();
    await prisma.encontro.update({ where: { id: encontroId }, data: { situacao: "cancelado" } });
    const r = await salvarChamada({ encontroId, turmaId, modo: "nova" }, marcar([[a, "presente"]]));
    expect(r).toBe("situacao-mudou");
    expect(await prisma.presenca.count({ where: { encontroId } })).toBe(0);
  });

  it("mantém as linhas quando o encontro é reaberto para planejado", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    await salvarChamada(
      { encontroId, turmaId, modo: "nova" },
      marcar([
        [a, "presente"],
        [b, "ausente"],
      ]),
    );
    await prisma.encontro.update({ where: { id: encontroId }, data: { situacao: "planejado" } });
    expect(await prisma.presenca.count({ where: { encontroId } })).toBe(2);
    const r = await salvarChamada(
      { encontroId, turmaId, modo: "nova" },
      marcar([
        [a, "presente"],
        [b, "presente"],
      ]),
    );
    expect(r).toBe("ok");
    expect((await presencasDoEncontro(encontroId)).map((x) => x.status)).toEqual([
      "presente",
      "presente",
    ]);
  });

  it("não sobrescreve o registro de um visitante com status de inscrito", async () => {
    const { turmaId, encontroId, a } = await cenario();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const v = await criarCatequizandoDireto({ nome: "Visitante" });
    await criarPresencaDireta({
      encontroId,
      turmaId,
      catequizandoId: v,
      visitante: true,
      turmaOrigemId: outra,
    });
    await salvarChamada(
      { encontroId, turmaId, modo: "nova" },
      marcar([
        [a, "presente"],
        [v, "ausente"],
      ]),
    );
    const linha = await prisma.presenca.findFirstOrThrow({
      where: { encontroId, catequizandoId: v },
    });
    expect(linha).toMatchObject({ visitante: true, status: "presente", turmaOrigemId: outra });
  });
});

describe("buscarVisitantes", () => {
  it("devolve só os quatro campos de ativos inscritos em outra turma aberta", async () => {
    const { turmaId, encontroId } = await cenario();
    const origem = await criarTurmaDireta({ nome: "Crisma" });
    const encerrada = await criarTurmaDireta({ nome: "Antiga", encerradaEm: "2026-06-01" });
    const joao = await criarCatequizandoDireto({ nome: "João Álvares" });
    const inativo = await criarCatequizandoDireto({ nome: "João Inativo", estado: "inativo" });
    const emEncerrada = await criarCatequizandoDireto({ nome: "João Encerrada" });
    const saiu = await criarCatequizandoDireto({ nome: "João Saiu" });
    const jaVisitante = await criarCatequizandoDireto({ nome: "João Visita" });
    await criarInscricaoDireta(origem, joao);
    await criarInscricaoDireta(origem, inativo);
    await criarInscricaoDireta(encerrada, emEncerrada);
    await criarInscricaoDireta(origem, saiu, { dataSaida: "2026-08-01" });
    await criarInscricaoDireta(origem, jaVisitante);
    await criarPresencaDireta({
      encontroId,
      turmaId,
      catequizandoId: jaVisitante,
      visitante: true,
      turmaOrigemId: origem,
    });
    const r = await buscarVisitantes(turmaId, encontroId, "joao");
    expect(r).toEqual([
      {
        catequizandoId: joao,
        nome: "João Álvares",
        turmaOrigemId: origem,
        turmaOrigemNome: "Crisma",
      },
    ]);
    expect(Object.keys(r[0]).sort()).toEqual([
      "catequizandoId",
      "nome",
      "turmaOrigemId",
      "turmaOrigemNome",
    ]);
  });

  it("exclui quem já é inscrito na data e ids inválidos devolvem vazio", async () => {
    const { turmaId, encontroId } = await cenario();
    const origem = await criarTurmaDireta({ nome: "Crisma" });
    const c = await criarCatequizandoDireto({ nome: "Ana Clara" });
    // na data do encontro ainda estava na turma; hoje a inscrição vigente é em outra
    await criarInscricaoDireta(turmaId, c, { dataEntrada: "2026-02-01", dataSaida: "2026-09-06" });
    await criarInscricaoDireta(origem, c, { dataEntrada: "2026-09-06" });
    expect(await buscarVisitantes(turmaId, encontroId, "clara")).toEqual([]);
    expect(await buscarVisitantes("x", encontroId, "clara")).toEqual([]);
  });
});

describe("adicionarVisitante", () => {
  it("grava o visitante com a turma de origem e recusa duplicado", async () => {
    const { turmaId, encontroId } = await cenario();
    const origem = await criarTurmaDireta({ nome: "Crisma" });
    const v = await criarCatequizandoDireto({ nome: "Vera" });
    await criarInscricaoDireta(origem, v);
    const antes = await prisma.inscricao.findMany({ orderBy: { id: "asc" } });
    expect(await adicionarVisitante({ encontroId, turmaId }, v)).toBe("ok");
    const linha = await prisma.presenca.findFirstOrThrow({
      where: { encontroId, catequizandoId: v },
    });
    expect(linha).toMatchObject({
      visitante: true,
      status: "presente",
      turmaId,
      turmaOrigemId: origem,
    });
    expect(await adicionarVisitante({ encontroId, turmaId }, v)).toBe("duplicado");
    expect(await prisma.inscricao.findMany({ orderBy: { id: "asc" } })).toEqual(antes);
  });

  it("recusa quem não tem inscrição vigente em outra turma aberta ou está inativo", async () => {
    const { turmaId, encontroId, a } = await cenario();
    const origem = await criarTurmaDireta();
    const encerrada = await criarTurmaDireta({ encerradaEm: "2026-06-01" });
    const semInscricao = await criarCatequizandoDireto({ nome: "Sem" });
    const inativo = await criarCatequizandoDireto({ nome: "Inativo", estado: "inativo" });
    const emEncerrada = await criarCatequizandoDireto({ nome: "Enc" });
    const saiu = await criarCatequizandoDireto({ nome: "Saiu" });
    await criarInscricaoDireta(origem, inativo);
    await criarInscricaoDireta(encerrada, emEncerrada);
    await criarInscricaoDireta(origem, saiu, { dataSaida: "2026-08-01" });
    for (const id of [a, semInscricao, inativo, emEncerrada, saiu, INEXISTENTE]) {
      expect(await adicionarVisitante({ encontroId, turmaId }, id)).toBe("indisponivel");
    }
    expect(await adicionarVisitante({ encontroId, turmaId }, "nao-uuid")).toBe("indisponivel");
  });
});

describe("removerVisitante", () => {
  it("só apaga visitantes e não mexe nas inscrições", async () => {
    const { turmaId, encontroId, a } = await cenario();
    const origem = await criarTurmaDireta();
    const v = await criarCatequizandoDireto({ nome: "Vera" });
    await criarInscricaoDireta(origem, v);
    await adicionarVisitante({ encontroId, turmaId }, v);
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId: a });
    const antes = await prisma.inscricao.findMany({ orderBy: { id: "asc" } });
    expect(await removerVisitante(encontroId, a)).toBe(false);
    expect(await prisma.presenca.count({ where: { encontroId, catequizandoId: a } })).toBe(1);
    expect(await removerVisitante(encontroId, v)).toBe(true);
    expect(await removerVisitante(encontroId, v)).toBe(false);
    expect(await prisma.presenca.count({ where: { encontroId } })).toBe(1);
    expect(await prisma.inscricao.findMany({ orderBy: { id: "asc" } })).toEqual(antes);
    expect(await removerVisitante("x", v)).toBe(false);
  });
});
