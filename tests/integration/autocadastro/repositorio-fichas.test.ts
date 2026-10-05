import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { FichaDados } from "@/modules/catequizandos/domain/ficha";
import {
  atualizarFichaPendente,
  confirmarComInscricao,
  criarFichaPendente,
  criarLink,
  descartar,
  obterLinkDaTurma,
} from "@/modules/autocadastro/repositorio";
import { criarTurmaDireta, criarUsuarioDireto, dia } from "../turmas/helpers";

const ficha = (extra: Partial<FichaDados> = {}): FichaDados => ({
  nome: "Ana Souza",
  dataNascimento: "2015-01-01" as DataCivil,
  telefone: "11987654321",
  email: "ana@exemplo.com",
  sacramentos: {
    batismo: { recebido: true, data: "2015-06-01" as DataCivil, paroquia: "São José" },
    eucaristia: { recebido: false },
    crisma: { recebido: false },
  },
  ...extra,
});

async function cenario() {
  const turmaId = await criarTurmaDireta();
  const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  await criarLink(turmaId, `tok-${turmaId}`, userId);
  const link = await obterLinkDaTurma(turmaId);
  const consentimento = { em: new Date("2026-10-01T12:00:00Z"), versao: "v1" };
  const id = await criarFichaPendente(ficha(), link!.id, turmaId, consentimento);
  return { turmaId, linkId: link!.id, id, consentimento };
}

describe("criarFichaPendente (3.5, 7.1)", () => {
  it("cria catequizando pendente com sacramentos e consentimento gravado", async () => {
    const { turmaId, linkId, id, consentimento } = await cenario();
    const c = await prisma.catequizando.findUniqueOrThrow({
      where: { id },
      include: { sacramentos: true, autocadastro: true },
    });
    expect(c.estado).toBe("pendente");
    expect(c.nome).toBe("Ana Souza");
    expect(c.sacramentos).toHaveLength(1);
    expect(c.sacramentos[0]).toMatchObject({ sacramento: "batismo", paroquia: "São José" });
    expect(c.autocadastro).toMatchObject({
      turmaId,
      linkId,
      consentidoEm: consentimento.em,
      versaoConsentimento: "v1",
      revisadaEm: null,
    });
  });
});

describe("confirmarComInscricao (5.5, 8.1)", () => {
  it("ativa, inscreve com a data informada e recusa a segunda confirmação", async () => {
    const { turmaId, id } = await cenario();
    expect(await confirmarComInscricao(id, turmaId, "2026-09-15" as DataCivil)).toBe("ok");
    const c = await prisma.catequizando.findUniqueOrThrow({
      where: { id },
      include: { inscricoes: true, autocadastro: true },
    });
    expect(c.estado).toBe("ativo");
    expect(c.inscricoes).toHaveLength(1);
    expect(c.inscricoes[0]).toMatchObject({
      turmaId,
      dataEntrada: dia("2026-09-15"),
      dataSaida: null,
    });
    expect(c.autocadastro!.revisadaEm).not.toBeNull();

    expect(await confirmarComInscricao(id, turmaId, "2026-09-15" as DataCivil)).toBe("ja-revisada");
    expect(await prisma.inscricao.count({ where: { catequizandoId: id } })).toBe(1);
  });

  it("recusa confirmar por outra turma", async () => {
    const { id } = await cenario();
    const outra = await criarTurmaDireta({ nome: "Outra turma" });
    expect(await confirmarComInscricao(id, outra, "2026-09-15" as DataCivil)).toBe("ja-revisada");
    expect(await prisma.inscricao.count({ where: { catequizandoId: id } })).toBe(0);
  });

  it("confirmações concorrentes: uma ok, outra já revisada", async () => {
    const { turmaId, id } = await cenario();
    const r = await Promise.all([
      confirmarComInscricao(id, turmaId, "2026-09-15" as DataCivil),
      confirmarComInscricao(id, turmaId, "2026-09-15" as DataCivil),
    ]);
    expect(r.sort()).toEqual(["ja-revisada", "ok"]);
    expect(await prisma.inscricao.count({ where: { catequizandoId: id } })).toBe(1);
  });
});

describe("atualizarFichaPendente (7.5)", () => {
  it("corrige campos e sacramentos mantendo estado e origem", async () => {
    const { turmaId, linkId, id } = await cenario();
    const nova = ficha({
      nome: "Ana Maria",
      email: undefined,
      sacramentos: {
        batismo: { recebido: false },
        eucaristia: { recebido: true },
        crisma: { recebido: false },
      },
    });
    expect(await atualizarFichaPendente(id, turmaId, nova)).toBe("ok");
    const c = await prisma.catequizando.findUniqueOrThrow({
      where: { id },
      include: { sacramentos: true, autocadastro: true },
    });
    expect(c).toMatchObject({ nome: "Ana Maria", email: null, estado: "pendente" });
    expect(c.sacramentos.map((s) => s.sacramento)).toEqual(["eucaristia"]);
    expect(c.autocadastro).toMatchObject({ turmaId, linkId, revisadaEm: null });
  });

  it("recusa corrigir ficha já revisada ou de outra turma", async () => {
    const { turmaId, id } = await cenario();
    const outra = await criarTurmaDireta({ nome: "Outra turma" });
    expect(await atualizarFichaPendente(id, outra, ficha({ nome: "X" }))).toBe("ja-revisada");
    await confirmarComInscricao(id, turmaId, "2026-09-15" as DataCivil);
    expect(await atualizarFichaPendente(id, turmaId, ficha({ nome: "X" }))).toBe("ja-revisada");
    expect((await prisma.catequizando.findUniqueOrThrow({ where: { id } })).nome).toBe("Ana Souza");
  });
});

describe("descartar (8.1, 8.2)", () => {
  it("apaga sacramentos, origem e catequizando", async () => {
    const { turmaId, id } = await cenario();
    expect(await descartar(id, turmaId)).toBe("ok");
    expect(await prisma.catequizando.count({ where: { id } })).toBe(0);
    expect(await prisma.sacramentoRecebido.count({ where: { catequizandoId: id } })).toBe(0);
    expect(await prisma.fichaAutocadastro.count({ where: { catequizandoId: id } })).toBe(0);
  });

  it("recusa descartar ficha ativa ou de outra turma", async () => {
    const { turmaId, id } = await cenario();
    const outra = await criarTurmaDireta({ nome: "Outra turma" });
    expect(await descartar(id, outra)).toBe("ja-revisada");
    await confirmarComInscricao(id, turmaId, "2026-09-15" as DataCivil);
    expect(await descartar(id, turmaId)).toBe("ja-revisada");
    expect(await prisma.catequizando.count({ where: { id } })).toBe(1);
    expect(await prisma.fichaAutocadastro.count({ where: { catequizandoId: id } })).toBe(1);
  });
});
