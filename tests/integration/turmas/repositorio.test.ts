import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  atualizarTurma,
  catequistasDoCatequizando,
  catequistasElegiveis,
  catequizandosParaInscricao,
  criarTurma,
  designadosVigentes,
  designar,
  desligar,
  encerrarTurma,
  historicoDoCatequizando,
  inscricaoVigente,
  inscrever,
  listarTurmas,
  listarTurmasDoCatequista,
  nomeEmUso,
  obterCatequizandoParaInscricao,
  obterTurma,
  removerDesignacao,
  transferir,
} from "@/modules/turmas/repositorio";
import {
  criarCatequizandoDireto,
  criarTurmaDireta,
  criarUsuarioDireto,
  dadosTurma,
  inscreverDireto,
} from "./helpers";

const HOJE = "2026-09-30" as DataCivil;
const codigo = (e: unknown) => (e as { code?: string }).code;

describe("criarTurma / atualizarTurma (2.1, 2.4, 2.5)", () => {
  it("cria com campos opcionais nulos e atualiza", async () => {
    const id = await criarTurma(dadosTurma());
    let t = await obterTurma(id);
    expect(t).toMatchObject({
      nome: "Turma São José",
      ciclo: 2026,
      diaSemana: "sabado",
      horario: "09:00",
      local: null,
      observacoes: null,
      vagas: null,
      encerrada: false,
      encerradaEm: null,
      catequistas: [],
      inscritosVigentes: 0,
      vigentes: [],
      anteriores: [],
    });
    await atualizarTurma(
      id,
      dadosTurma({ nome: "Nova", local: "Sala 2", observacoes: "x", vagas: 20 }),
    );
    t = await obterTurma(id);
    expect(t).toMatchObject({ nome: "Nova", local: "Sala 2", observacoes: "x", vagas: 20 });
    await atualizarTurma(id, dadosTurma({ nome: "Nova" }));
    expect((await obterTurma(id))!.vagas).toBeNull();
  });

  it("índice parcial recusa nome repetido (sem caixa) no mesmo ciclo entre abertas", async () => {
    await criarTurma(dadosTurma({ nome: "Turma A" }));
    const erro = await criarTurma(dadosTurma({ nome: "TURMA a" })).catch((e) => e);
    expect(codigo(erro)).toBe("P2002");
    // outro ciclo é permitido
    await expect(criarTurma(dadosTurma({ nome: "Turma A", ciclo: 2027 }))).resolves.toBeTypeOf(
      "string",
    );
  });
});

describe("nomeEmUso (2.4)", () => {
  it("ignora caixa, só considera abertas do ciclo e respeita ignorarId", async () => {
    const aberta = await criarTurmaDireta({ nome: "Turma Maria" });
    await criarTurmaDireta({ nome: "Turma Encerrada", encerradaEm: "2026-06-01" });
    expect(await nomeEmUso("turma maria", 2026)).toBe(true);
    expect(await nomeEmUso("TURMA MARIA", 2026)).toBe(true);
    expect(await nomeEmUso("Turma Maria", 2027)).toBe(false);
    expect(await nomeEmUso("turma encerrada", 2026)).toBe(false);
    expect(await nomeEmUso("Turma Maria", 2026, aberta)).toBe(false);
    // "_" não é curinga
    expect(await nomeEmUso("Turma_Maria", 2026)).toBe(false);
  });
});

describe("listagens (3.1, 7.1, 7.2)", () => {
  it("listarTurmas traz todas ordenadas com catequistas vigentes e inscritos vigentes", async () => {
    const ana = await criarUsuarioDireto("Ana");
    const bia = await criarUsuarioDireto("Bia");
    const sab = await criarTurmaDireta({ nome: "Sábado", diaSemana: "sabado", vagas: 10 });
    const dom = await criarTurmaDireta({ nome: "Domingo", diaSemana: "domingo" });
    const enc = await criarTurmaDireta({ nome: "Velha", encerradaEm: "2026-01-01" });
    await designar(sab, ana);
    await designar(sab, bia);
    await removerDesignacao(sab, bia);
    const c1 = await criarCatequizandoDireto("C1");
    const c2 = await criarCatequizandoDireto("C2");
    await inscreverDireto(sab, c1, "2026-02-01");
    await inscreverDireto(sab, c2, "2026-02-01", { data: "2026-03-01", motivo: "desligamento" });

    const lista = await listarTurmas();
    expect(lista.map((t) => t.id)).toEqual([dom, sab, enc]);
    const s = lista.find((t) => t.id === sab)!;
    expect(s.catequistas).toEqual([{ id: ana, nome: "Ana" }]);
    expect(s.inscritosVigentes).toBe(1);
    expect(s.vagas).toBe(10);
    expect(lista.find((t) => t.id === enc)!.encerrada).toBe(true);
  });

  it("listarTurmasDoCatequista só traz abertas com designação vigente", async () => {
    const ana = await criarUsuarioDireto("Ana");
    const t1 = await criarTurmaDireta({ nome: "T1" });
    const t2 = await criarTurmaDireta({ nome: "T2" });
    const t3 = await criarTurmaDireta({ nome: "T3", encerradaEm: "2026-05-01" });
    await criarTurmaDireta({ nome: "T4" });
    await designar(t1, ana);
    await designar(t2, ana);
    await removerDesignacao(t2, ana);
    await prisma.designacao.create({ data: { turmaId: t3, userId: ana } });
    const lista = await listarTurmasDoCatequista(ana);
    expect(lista.map((t) => t.id)).toEqual([t1]);
  });
});

describe("obterTurma (4.1, 4.2, 4.3, 4.4)", () => {
  it("id não-UUID ou inexistente → null", async () => {
    expect(await obterTurma("abc")).toBeNull();
    expect(await obterTurma("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("separa vigentes e anteriores com dados do catequizando", async () => {
    const t = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const bruno = await criarCatequizandoDireto("Bruno", {
      dataNascimento: "2011-07-08",
      telefone: "11911112222",
    });
    const alice = await criarCatequizandoDireto("Alice");
    const carla = await criarCatequizandoDireto("Carla");
    const iBruno = await inscreverDireto(t, bruno, "2026-02-01");
    await inscreverDireto(t, alice, "2026-02-03");
    const iCarla = await inscreverDireto(t, carla, "2026-02-01", {
      data: "2026-04-10",
      motivo: "transferencia",
    });
    await inscreverDireto(outra, carla, "2026-04-10");

    const d = (await obterTurma(t))!;
    expect(d.inscritosVigentes).toBe(2);
    expect(d.vigentes.map((i) => i.nome)).toEqual(["Alice", "Bruno"]);
    expect(d.vigentes.find((i) => i.nome === "Bruno")).toEqual({
      inscricaoId: iBruno,
      catequizandoId: bruno,
      nome: "Bruno",
      dataNascimento: "2011-07-08",
      telefone: "11911112222",
      dataEntrada: "2026-02-01",
      dataSaida: null,
      motivoSaida: null,
    });
    expect(d.anteriores).toEqual([
      expect.objectContaining({
        inscricaoId: iCarla,
        nome: "Carla",
        dataSaida: "2026-04-10",
        motivoSaida: "transferencia",
      }),
    ]);
  });
});

describe("encerrarTurma (8.1, 8.4)", () => {
  it("encerra hoje e desliga só os vigentes com motivo encerramento, devolvendo a quantidade", async () => {
    const t = await criarTurmaDireta();
    const a = await criarCatequizandoDireto("A");
    const b = await criarCatequizandoDireto("B");
    const c = await criarCatequizandoDireto("C");
    await inscreverDireto(t, a, "2026-02-01");
    await inscreverDireto(t, b, "2026-02-01");
    await inscreverDireto(t, c, "2026-02-01", { data: "2026-03-01", motivo: "desligamento" });

    expect(await encerrarTurma(t, HOJE)).toBe(2);
    const d = (await obterTurma(t))!;
    expect(d.encerrada).toBe(true);
    expect(d.encerradaEm).toBe("2026-09-30");
    expect(d.vigentes).toEqual([]);
    const porNome = Object.fromEntries(d.anteriores.map((i) => [i.nome, i]));
    expect(porNome.A).toMatchObject({ dataSaida: "2026-09-30", motivoSaida: "encerramento" });
    expect(porNome.B).toMatchObject({ dataSaida: "2026-09-30", motivoSaida: "encerramento" });
    expect(porNome.C).toMatchObject({ dataSaida: "2026-03-01", motivoSaida: "desligamento" });
  });

  it("turma sem inscritos devolve 0", async () => {
    const t = await criarTurmaDireta();
    expect(await encerrarTurma(t, HOJE)).toBe(0);
  });
});

describe("designações (9.1)", () => {
  it("elegíveis excluem inativos, coordenação e já designados", async () => {
    const t = await criarTurmaDireta();
    const ana = await criarUsuarioDireto("Ana");
    const bia = await criarUsuarioDireto("Bia");
    await criarUsuarioDireto("Banida", { banned: true });
    await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await criarUsuarioDireto("Sem papel", { role: null });
    const caio = await criarUsuarioDireto("Caio");
    await designar(t, bia);
    expect(await catequistasElegiveis(t)).toEqual([
      { id: ana, nome: "Ana" },
      { id: caio, nome: "Caio" },
    ]);
    // removido volta a ser elegível
    expect(await removerDesignacao(t, bia)).toBe(true);
    expect((await catequistasElegiveis(t)).map((u) => u.nome)).toEqual(["Ana", "Bia", "Caio"]);
  });

  it("índice parcial recusa designação vigente duplicada, mas permite redesignar após remoção", async () => {
    const t = await criarTurmaDireta();
    const ana = await criarUsuarioDireto("Ana");
    await designar(t, ana);
    const erro = await designar(t, ana).catch((e) => e);
    expect(codigo(erro)).toBe("P2002");
    expect(await designadosVigentes(t)).toEqual([ana]);

    expect(await removerDesignacao(t, ana)).toBe(true);
    expect(await removerDesignacao(t, ana)).toBe(false);
    const removida = await prisma.designacao.findFirst({ where: { turmaId: t, userId: ana } });
    expect(removida!.removidoEm).toBeInstanceOf(Date);
    expect(await designadosVigentes(t)).toEqual([]);

    await designar(t, ana);
    expect(await designadosVigentes(t)).toEqual([ana]);
    expect(await prisma.designacao.count({ where: { turmaId: t } })).toBe(2);
  });
});

describe("catequizandosParaInscricao (5.1)", () => {
  it("busca sem caixa nem acentos, só ativos, com a turma atual", async () => {
    const t = await criarTurmaDireta({ nome: "Turma A" });
    const jose = await criarCatequizandoDireto("José da Silva");
    await criarCatequizandoDireto("JOSÉ Inativo", { estado: "inativo" });
    await criarCatequizandoDireto("Maria");
    await inscreverDireto(t, jose, "2026-02-01");

    const r = await catequizandosParaInscricao("jose");
    expect(r).toEqual([
      {
        id: jose,
        nome: "José da Silva",
        dataNascimento: "2010-03-04",
        turmaAtual: { id: t, nome: "Turma A" },
      },
    ]);
    const todos = await catequizandosParaInscricao("");
    expect(todos.map((c) => c.nome).sort()).toEqual(["José da Silva", "Maria"]);
    expect(todos.find((c) => c.nome === "Maria")?.turmaAtual).toBeNull();
  });
});

describe("inscrever / inscricaoVigente (5.2, 5.6)", () => {
  it("inscreve e o índice parcial recusa a segunda inscrição vigente (P2002)", async () => {
    const t1 = await criarTurmaDireta({ nome: "T1" });
    const t2 = await criarTurmaDireta({ nome: "T2" });
    const c = await criarCatequizandoDireto("Ana");
    expect(await inscricaoVigente(c)).toBeNull();
    await inscrever(t1, c, "2026-03-01" as DataCivil);
    const v = await inscricaoVigente(c);
    expect(v).toMatchObject({ turmaId: t1, turmaNome: "T1", dataEntrada: "2026-03-01" });
    await expect(inscrever(t2, c, "2026-03-02" as DataCivil)).rejects.toSatisfy(
      (e) => codigo(e) === "P2002",
    );
  });
});

describe("transferir (5.3, 5.4)", () => {
  it("fecha a vigente com motivo transferencia e abre a nova com a mesma data", async () => {
    const t1 = await criarTurmaDireta({ nome: "T1" });
    const t2 = await criarTurmaDireta({ nome: "T2" });
    const c = await criarCatequizandoDireto("Ana");
    const antiga = await inscreverDireto(t1, c, "2026-02-01");
    await transferir(t2, c, "2026-05-10" as DataCivil);
    const linhas = await prisma.inscricao.findMany({ where: { catequizandoId: c } });
    expect(linhas).toHaveLength(2);
    const fechada = linhas.find((l) => l.id === antiga)!;
    expect(fechada.dataSaida?.toISOString().slice(0, 10)).toBe("2026-05-10");
    expect(fechada.motivoSaida).toBe("transferencia");
    expect(await inscricaoVigente(c)).toMatchObject({ turmaId: t2, dataEntrada: "2026-05-10" });
  });
});

describe("desligar (6.1, 6.4)", () => {
  it("preserva a linha, grava motivo desligamento e só age sobre vigente", async () => {
    const t = await criarTurmaDireta();
    const c = await criarCatequizandoDireto("Ana");
    const i = await inscreverDireto(t, c, "2026-02-01");
    expect(await desligar(i, "2026-06-01" as DataCivil)).toBe(true);
    const l = await prisma.inscricao.findUniqueOrThrow({ where: { id: i } });
    expect(l.dataSaida?.toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(l.motivoSaida).toBe("desligamento");
    expect(await desligar(i, "2026-06-02" as DataCivil)).toBe(false);
    expect(await inscricaoVigente(c)).toBeNull();
  });
});

describe("historicoDoCatequizando", () => {
  it("lista todas as inscrições por dataEntrada decrescente", async () => {
    const t1 = await criarTurmaDireta({ nome: "T1", ciclo: 2025 });
    const t2 = await criarTurmaDireta({ nome: "T2" });
    const c = await criarCatequizandoDireto("Ana");
    await inscreverDireto(t1, c, "2025-02-01", { data: "2025-11-30", motivo: "encerramento" });
    await inscreverDireto(t2, c, "2026-02-01");
    expect(await historicoDoCatequizando(c)).toEqual([
      {
        turmaId: t2,
        turmaNome: "T2",
        ciclo: 2026,
        dataEntrada: "2026-02-01",
        dataSaida: null,
        motivoSaida: null,
      },
      {
        turmaId: t1,
        turmaNome: "T1",
        ciclo: 2025,
        dataEntrada: "2025-02-01",
        dataSaida: "2025-11-30",
        motivoSaida: "encerramento",
      },
    ]);
  });
});

describe("catequistasDoCatequizando", () => {
  it("só designações vigentes em turmas com inscrição vigente", async () => {
    const atual = await criarTurmaDireta({ nome: "Atual" });
    const antiga = await criarTurmaDireta({ nome: "Antiga" });
    const c = await criarCatequizandoDireto("Ana");
    await inscreverDireto(antiga, c, "2025-02-01", { data: "2025-12-01", motivo: "desligamento" });
    await inscreverDireto(atual, c, "2026-02-01");
    const vigente = await criarUsuarioDireto("Vigente");
    const removido = await criarUsuarioDireto("Removido");
    const daAntiga = await criarUsuarioDireto("Da antiga");
    await designar(atual, vigente);
    await designar(atual, removido);
    await removerDesignacao(atual, removido);
    await designar(antiga, daAntiga);
    expect(await catequistasDoCatequizando(c)).toEqual([vigente]);
    expect(await catequistasDoCatequizando(await criarCatequizandoDireto("Sem turma"))).toEqual([]);
  });
});

describe("obterCatequizandoParaInscricao (5.1)", () => {
  it("devolve estado e nascimento; inexistente ou id não-UUID dá null", async () => {
    const ativo = await criarCatequizandoDireto("Ana", { dataNascimento: "2012-05-06" });
    const inativo = await criarCatequizandoDireto("Bia", { estado: "inativo" });
    expect(await obterCatequizandoParaInscricao(ativo)).toEqual({
      estado: "ativo",
      dataNascimento: "2012-05-06",
    });
    expect((await obterCatequizandoParaInscricao(inativo))?.estado).toBe("inativo");
    expect(await obterCatequizandoParaInscricao("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await obterCatequizandoParaInscricao("nao-uuid")).toBeNull();
  });
});
