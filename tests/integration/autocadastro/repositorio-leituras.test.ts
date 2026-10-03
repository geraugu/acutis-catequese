import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { FichaDados } from "@/modules/catequizandos/domain/ficha";
import {
  buscarCoincidencias,
  confirmarComInscricao,
  contarPendentesPorTurma,
  criarFichaPendente,
  criarLink,
  listarFila,
  obterFichaLink,
  obterLinkDaTurma,
} from "@/modules/autocadastro/repositorio";
import {
  criarCatequizandoDireto,
  criarTurmaDireta,
  criarUsuarioDireto,
  inscreverDireto,
} from "../turmas/helpers";

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

async function turmaComLink(extra: { encerradaEm?: string } = {}) {
  const turmaId = await criarTurmaDireta({ ...extra, nome: `Turma ${randomUUID()}` });
  const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  await criarLink(turmaId, `tok-${turmaId}`, userId);
  const link = await obterLinkDaTurma(turmaId);
  return { turmaId, linkId: link!.id };
}

const consentimento = { em: new Date("2026-10-01T12:00:00Z"), versao: "v1" };

async function enviar(linkId: string, turmaId: string, f: FichaDados, recebidaEm?: Date) {
  const id = await criarFichaPendente(f, linkId, turmaId, consentimento);
  if (recebidaEm) {
    await prisma.fichaAutocadastro.update({ where: { catequizandoId: id }, data: { recebidaEm } });
  }
  return id;
}

/** Telefone único por teste para não colidir com dados de outros testes. */
const telUnico = () => `119${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

describe("listarFila (5.1)", () => {
  it("lista as pendentes da turma da mais antiga para a mais recente, sem revisadas nem de outra turma", async () => {
    const { turmaId, linkId } = await turmaComLink();
    const outra = await turmaComLink();
    const nova = await enviar(linkId, turmaId, ficha({ nome: "Nova" }), new Date("2026-10-02T10:00:00Z"));
    const velha = await enviar(linkId, turmaId, ficha({ nome: "Velha" }), new Date("2026-09-01T10:00:00Z"));
    const revisada = await enviar(linkId, turmaId, ficha({ nome: "Revisada" }));
    await confirmarComInscricao(revisada, turmaId, "2026-10-01" as DataCivil);
    await enviar(outra.linkId, outra.turmaId, ficha({ nome: "Outra" }));

    const fila = await listarFila(turmaId);
    expect(fila.map((i) => i.catequizandoId)).toEqual([velha, nova]);
    expect(fila[0]).toMatchObject({
      nome: "Velha",
      recebidaEm: new Date("2026-09-01T10:00:00Z"),
      email: "ana@exemplo.com",
      telefone: "11987654321",
    });
  });

  it("continua legível com a turma encerrada (8.4)", async () => {
    const { turmaId, linkId } = await turmaComLink();
    const id = await enviar(linkId, turmaId, ficha());
    await prisma.turma.update({ where: { id: turmaId }, data: { encerradaEm: new Date() } });
    expect((await listarFila(turmaId)).map((i) => i.catequizandoId)).toEqual([id]);
    expect(await obterFichaLink(turmaId, id)).not.toBeNull();
  });
});

describe("obterFichaLink (5.2)", () => {
  it("devolve a ficha completa com o consentimento", async () => {
    const { turmaId, linkId } = await turmaComLink();
    const id = await enviar(linkId, turmaId, ficha({ endereco: "Rua A" }));
    const d = await obterFichaLink(turmaId, id);
    expect(d).toMatchObject({
      catequizandoId: id,
      nome: "Ana Souza",
      dataNascimento: "2015-01-01",
      telefone: "11987654321",
      email: "ana@exemplo.com",
      endereco: "Rua A",
      consentidoEm: consentimento.em,
      versaoConsentimento: "v1",
    });
    expect(d!.recebidaEm).toBeInstanceOf(Date);
    expect(d!.sacramentos).toEqual({
      batismo: { recebido: true, data: "2015-06-01", paroquia: "São José" },
      eucaristia: { recebido: false },
      crisma: { recebido: false },
    });
  });

  it("devolve null para outra turma, ficha revisada ou id inválido", async () => {
    const { turmaId, linkId } = await turmaComLink();
    const outra = await turmaComLink();
    const id = await enviar(linkId, turmaId, ficha());
    expect(await obterFichaLink(outra.turmaId, id)).toBeNull();
    expect(await obterFichaLink(turmaId, "nao-e-uuid")).toBeNull();
    await confirmarComInscricao(id, turmaId, "2026-10-01" as DataCivil);
    expect(await obterFichaLink(turmaId, id)).toBeNull();
  });
});

describe("buscarCoincidencias (6.1, 6.2, 6.3)", () => {
  it("encontra por telefone com formatação diferente e por e-mail normalizado, ignorando a própria ficha", async () => {
    const { turmaId, linkId } = await turmaComLink();
    const tel = telUnico();
    const formatado = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
    const existente = await criarCatequizandoDireto("Existente Tel", { telefone: formatado });
    const email = `x-${tel}@exemplo.com`;
    const porEmail = await criarCatequizandoDireto("Existente Email", { telefone: telUnico() });
    await prisma.catequizando.update({ where: { id: porEmail }, data: { email: email.toUpperCase() } });
    const propria = await enviar(linkId, turmaId, ficha({ telefone: tel, email }));

    const coord = { papel: "coordenacao" as const, userId: "x" };
    const r = await buscarCoincidencias(` ${email} `, tel, propria, coord);
    expect(r.map((c) => c.id).sort()).toEqual([existente, porEmail].sort());
    expect(r.every((c) => c.visivel)).toBe(true);
    expect(await buscarCoincidencias(null, telUnico(), propria, coord)).toEqual([]);
  });

  it("oculta o coincidente para o catequista de outra turma e mostra para o da turma dele", async () => {
    const tel = telUnico();
    const turmaDoCoincidente = await criarTurmaDireta({ nome: `Turma ${randomUUID()}` });
    const coincidente = await criarCatequizandoDireto("Coincidente", { telefone: tel });
    await inscreverDireto(turmaDoCoincidente, coincidente, "2026-02-01");

    const responsavel = await criarUsuarioDireto("Resp");
    await prisma.designacao.create({ data: { turmaId: turmaDoCoincidente, userId: responsavel } });
    const deOutra = await criarUsuarioDireto("Outro");
    const outraTurma = await criarTurmaDireta({ nome: `Turma ${randomUUID()}` });
    await prisma.designacao.create({ data: { turmaId: outraTurma, userId: deOutra } });
    const removido = await criarUsuarioDireto("Removido");
    await prisma.designacao.create({
      data: { turmaId: turmaDoCoincidente, userId: removido, removidoEm: new Date() },
    });

    const ignorar = "00000000-0000-0000-0000-000000000000";
    const [paraOutro] = await buscarCoincidencias(null, tel, ignorar, { papel: "catequista", userId: deOutra });
    expect(paraOutro).toMatchObject({ id: coincidente, visivel: false });
    const [paraResp] = await buscarCoincidencias(null, tel, ignorar, { papel: "catequista", userId: responsavel });
    expect(paraResp).toMatchObject({ id: coincidente, nome: "Coincidente", visivel: true });
    const [paraRemovido] = await buscarCoincidencias(null, tel, ignorar, { papel: "catequista", userId: removido });
    expect(paraRemovido!.visivel).toBe(false);
  });
});

describe("contarPendentesPorTurma (5.3)", () => {
  it("conta as pendentes por turma e omite turmas sem pendências", async () => {
    const a = await turmaComLink();
    const b = await turmaComLink();
    const vazia = await turmaComLink();
    await enviar(a.linkId, a.turmaId, ficha());
    await enviar(a.linkId, a.turmaId, ficha());
    const revisada = await enviar(a.linkId, a.turmaId, ficha());
    await confirmarComInscricao(revisada, a.turmaId, "2026-10-01" as DataCivil);
    await enviar(b.linkId, b.turmaId, ficha());

    const m = await contarPendentesPorTurma([a.turmaId, b.turmaId, vazia.turmaId]);
    expect(m.get(a.turmaId)).toBe(2);
    expect(m.get(b.turmaId)).toBe(1);
    expect(m.has(vazia.turmaId)).toBe(false);
    expect((await contarPendentesPorTurma([])).size).toBe(0);
  });
});
