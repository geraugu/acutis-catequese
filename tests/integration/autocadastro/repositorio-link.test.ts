import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  criarLink,
  desativarLink,
  obterLinkDaTurma,
  obterLinkPublico,
  regenerarLink,
  registrarTentativa,
  salvarExpiracao,
} from "@/modules/autocadastro/repositorio";
import { criarTurmaDireta, criarUsuarioDireto, dia } from "../turmas/helpers";

const codigo = (e: unknown) => (e as { code?: string }).code;

async function fichaPendente(
  turmaId: string,
  linkId: string,
  opcoes: { revisada?: boolean; estado?: "pendente" | "ativo" } = {},
) {
  const c = await prisma.catequizando.create({
    data: {
      nome: "Ana",
      dataNascimento: dia("2015-01-01"),
      telefone: "11987654321",
      estado: opcoes.estado ?? "pendente",
    },
    select: { id: true },
  });
  await prisma.fichaAutocadastro.create({
    data: {
      catequizandoId: c.id,
      turmaId,
      linkId,
      consentidoEm: new Date(),
      versaoConsentimento: "v1",
      revisadaEm: opcoes.revisada ? new Date() : null,
    },
  });
}

describe("link da turma (1.1, 1.3, 1.4, 1.5, 1.6, 1.8)", () => {
  it("cria, lê com contagem de pendentes e impede dois links ativos", async () => {
    const turmaId = await criarTurmaDireta();
    const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    expect(await obterLinkDaTurma(turmaId)).toBeNull();

    await criarLink(turmaId, "tok-1", userId);
    const link = await obterLinkDaTurma(turmaId);
    expect(link).toMatchObject({
      token: "tok-1",
      expiraEm: null,
      desativadoEm: null,
      pendentes: 0,
    });

    await fichaPendente(turmaId, link!.id);
    await fichaPendente(turmaId, link!.id);
    await fichaPendente(turmaId, link!.id, { revisada: true, estado: "ativo" });
    expect((await obterLinkDaTurma(turmaId))!.pendentes).toBe(2);

    await expect(criarLink(turmaId, "tok-2", userId)).rejects.toSatisfy(
      (e) => codigo(e) === "P2002",
    );
  });

  it("desativa, salva expiração e permite gerar novo depois", async () => {
    const turmaId = await criarTurmaDireta();
    const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    expect(await desativarLink(turmaId)).toBe(false);
    expect(await salvarExpiracao(turmaId, "2026-12-01" as DataCivil)).toBe(false);

    await criarLink(turmaId, "tok-1", userId);
    expect(await salvarExpiracao(turmaId, "2026-12-01" as DataCivil)).toBe(true);
    expect((await obterLinkDaTurma(turmaId))!.expiraEm).toBe("2026-12-01");
    expect(await salvarExpiracao(turmaId, null)).toBe(true);
    expect((await obterLinkDaTurma(turmaId))!.expiraEm).toBeNull();

    expect(await desativarLink(turmaId)).toBe(true);
    expect((await obterLinkDaTurma(turmaId))!.desativadoEm).toBeInstanceOf(Date);
    expect(await desativarLink(turmaId)).toBe(false);

    await criarLink(turmaId, "tok-2", userId);
    expect((await obterLinkDaTurma(turmaId))!.token).toBe("tok-2");
  });

  it("regenerar invalida o token anterior", async () => {
    const turmaId = await criarTurmaDireta();
    const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await criarLink(turmaId, "antigo", userId);
    await regenerarLink(turmaId, "novo", userId);

    expect((await obterLinkDaTurma(turmaId))!.token).toBe("novo");
    expect((await obterLinkPublico("antigo"))!.desativadoEm).toBeInstanceOf(Date);
    expect((await obterLinkPublico("novo"))!.desativadoEm).toBeNull();
    expect(await prisma.linkAutocadastro.count({ where: { turmaId, desativadoEm: null } })).toBe(1);
  });
});

describe("obterLinkPublico (2.1, 2.3)", () => {
  it("devolve só os dados permitidos da turma", async () => {
    const turmaId = await criarTurmaDireta({ local: "Salão", observacoes: "segredo", vagas: 10 });
    const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await criarLink(turmaId, "tok", userId);

    const p = await obterLinkPublico("tok");
    expect(p).toEqual({
      linkId: expect.any(String),
      turmaId,
      desativadoEm: null,
      expiraEm: null,
      turmaEncerrada: false,
      turma: { nome: "Turma São José", diaSemana: "sabado", horario: "09:00", local: "Salão" },
    });
    expect(await obterLinkPublico("inexistente")).toBeNull();
  });

  it("indica turma encerrada", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-09-01" });
    const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await criarLink(turmaId, "tok", userId);
    expect((await obterLinkPublico("tok"))!.turmaEncerrada).toBe(true);
  });
});

describe("registrarTentativa (4.1, 4.2)", () => {
  const politica = { maximo: 5, janelaMs: 60 * 60_000 };

  it("permite até o máximo e reabre a janela depois", async () => {
    const agora = new Date("2026-10-03T12:00:00Z");
    for (let i = 0; i < 5; i++)
      expect(await registrarTentativa("origem:x", politica, agora)).toBe(true);
    expect(await registrarTentativa("origem:x", politica, agora)).toBe(false);
    expect(await registrarTentativa("origem:y", politica, agora)).toBe(true);
    const depois = new Date(agora.getTime() + politica.janelaMs);
    expect(await registrarTentativa("origem:x", politica, depois)).toBe(true);
  });

  it("concorrência nunca excede o limite", async () => {
    const agora = new Date("2026-10-03T12:00:00Z");
    const r = await Promise.all(
      Array.from({ length: 10 }, () => registrarTentativa("link:c", politica, agora)),
    );
    expect(r.filter(Boolean)).toHaveLength(5);
    const linha = await prisma.limiteAutocadastro.findUnique({ where: { chave: "link:c" } });
    expect(linha!.contagem).toBe(5);
  });
});
