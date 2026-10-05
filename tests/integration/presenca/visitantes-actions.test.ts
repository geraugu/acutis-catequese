import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { adicionarVisitanteAction, removerVisitanteAction } from "@/modules/presenca/actions";
import {
  MSG_ERRO_INESPERADO,
  MSG_TURMA_ENCERRADA,
  MSG_VISITANTE_DUPLICADO,
  MSG_VISITANTE_INDISPONIVEL,
  MSG_VISITANTE_SEM_TEMA,
} from "@/modules/presenca/mensagens";
import * as repositorio from "@/modules/presenca/repositorio";
import { cumpridosDoCatequizando } from "@/modules/presenca/repositorio";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);
vi.mock("@/modules/presenca/repositorio", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/presenca/repositorio")>();
  return { ...real, adicionarVisitante: vi.fn(real.adicionarVisitante) };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(repositorio.adicionarVisitante).mockClear();
  limparSessao();
});

const coord = (t: string) => `/coordenacao/turmas/${t}/encontros`;
// Convenção: `base` é a do cronograma; o retorno vai para a página de visitantes do encontro.
const volta = (t: string, e: string, aviso: string) =>
  `${coord(t)}/${e}/chamada/visitantes?aviso=${aviso}`;
const PASSADO = "2020-03-07";
const FUTURO = "2099-03-07";

const adicionar = (t: string, e: string, c: string) => adicionarVisitanteAction(t, e, coord(t), c);
const remover = (t: string, e: string, c: string) => removerVisitanteAction(t, e, coord(t), c);

const presencas = (encontroId: string) =>
  prisma.presenca.findMany({
    where: { encontroId },
    select: { catequizandoId: true, status: true, visitante: true, turmaOrigemId: true },
    orderBy: { catequizandoId: "asc" },
  });
const inscricoes = () => prisma.inscricao.findMany({ orderBy: { id: "asc" } });

async function cenario(
  extra: {
    encontro?: Parameters<typeof criarEncontroDireto>[1];
    turma?: { encerradaEm?: string };
  } = {},
) {
  const temaId = await criarTemaDireto(`Tema ${Math.random()}`);
  const turmaId = await criarTurmaDireta({ nome: `Turma ${Math.random()}`, ...extra.turma });
  const origemId = await criarTurmaDireta({ nome: `Origem ${Math.random()}` });
  const encontroId = await criarEncontroDireto(turmaId, {
    data: PASSADO,
    temaId,
    ...extra.encontro,
  });
  const visitante = await criarCatequizandoDireto({ nome: "Visitante" });
  await criarInscricaoDireta(origemId, visitante, { dataEntrada: "2020-01-01" });
  return { temaId, turmaId, origemId, encontroId, visitante };
}

describe("adicionarVisitanteAction (4.1, 4.3 a 4.5, 9.1)", () => {
  it("registra presente com a turma de origem, sem tocar a inscrição, e avisa", async () => {
    const { turmaId, origemId, encontroId, visitante } = await cenario();
    usarSessao(await criarCoordenacao());
    const antes = await inscricoes();
    const url = await capturarRedirect(adicionar(turmaId, encontroId, visitante));
    expect(url).toBe(volta(turmaId, encontroId, "visitante-adicionado"));
    expect(await presencas(encontroId)).toEqual([
      { catequizandoId: visitante, status: "presente", visitante: true, turmaOrigemId: origemId },
    ]);
    expect(await inscricoes()).toEqual(antes);
  });

  it("catequista da turma pode adicionar, com base do catequista", async () => {
    const { turmaId, encontroId, visitante } = await cenario();
    const catequista = await criarCatequista();
    await (await import("@/modules/turmas/repositorio")).designar(turmaId, catequista.id);
    usarSessao(catequista);
    const base = `/catequista/turmas/${turmaId}/encontros`;
    const url = await capturarRedirect(
      adicionarVisitanteAction(turmaId, encontroId, base, visitante),
    );
    expect(url).toBe(`${base}/${encontroId}/chamada/visitantes?aviso=visitante-adicionado`);
  });

  it("recusa encontro sem tema", async () => {
    const { turmaId, encontroId, visitante } = await cenario({ encontro: { temaId: null } });
    usarSessao(await criarCoordenacao());
    expect(await adicionar(turmaId, encontroId, visitante)).toEqual({
      erro: MSG_VISITANTE_SEM_TEMA,
    });
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("recusa em turma encerrada", async () => {
    const { turmaId, encontroId, visitante } = await cenario({
      turma: { encerradaEm: "2020-12-01" },
    });
    usarSessao(await criarCoordenacao());
    expect(await adicionar(turmaId, encontroId, visitante)).toEqual({
      erro: MSG_TURMA_ENCERRADA,
    });
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("recusa encontro cancelado e de data futura com a mensagem da chamada", async () => {
    const cancelado = await cenario({
      encontro: { situacao: "cancelado", motivoCancelamento: "chuva" },
    });
    usarSessao(await criarCoordenacao());
    const r1 = await adicionar(cancelado.turmaId, cancelado.encontroId, cancelado.visitante);
    expect(r1.erro).toMatch(/cancelado/i);
    expect(await presencas(cancelado.encontroId)).toEqual([]);

    const futuro = await cenario({ encontro: { data: FUTURO } });
    const r2 = await adicionar(futuro.turmaId, futuro.encontroId, futuro.visitante);
    expect(r2.erro).toMatch(/a partir da data/i);
    expect(await presencas(futuro.encontroId)).toEqual([]);
  });

  it("recusa duplicado sem alterar a presença existente", async () => {
    const { turmaId, origemId, encontroId, visitante } = await cenario();
    await criarPresencaDireta({
      encontroId,
      turmaId,
      catequizandoId: visitante,
      status: "presente",
      visitante: true,
      turmaOrigemId: origemId,
    });
    usarSessao(await criarCoordenacao());
    expect(await adicionar(turmaId, encontroId, visitante)).toEqual({
      erro: MSG_VISITANTE_DUPLICADO,
    });
    expect(await presencas(encontroId)).toHaveLength(1);
  });

  it("recusa catequizando inscrito na própria turma na data do encontro", async () => {
    const { turmaId, encontroId } = await cenario();
    const inscrito = await criarCatequizandoDireto({ nome: "Inscrito" });
    await criarInscricaoDireta(turmaId, inscrito, { dataEntrada: "2020-01-01" });
    // Também inscrito em outra turma aberta, para o repositório sozinho aceitar.
    const outra = await criarTurmaDireta({ nome: "Outra" });
    await criarInscricaoDireta(outra, inscrito, {
      dataEntrada: "2020-01-01",
      dataSaida: "2020-02-01",
    });
    usarSessao(await criarCoordenacao());
    const adicionarRepo = vi.mocked(repositorio.adicionarVisitante);
    expect(await adicionar(turmaId, encontroId, inscrito)).toEqual({
      erro: MSG_VISITANTE_INDISPONIVEL,
    });
    expect(adicionarRepo).not.toHaveBeenCalled();
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("recusa catequizando sem inscrição em outra turma aberta", async () => {
    const { turmaId, encontroId } = await cenario();
    const solto = await criarCatequizandoDireto({ nome: "Solto" });
    usarSessao(await criarCoordenacao());
    expect(await adicionar(turmaId, encontroId, solto)).toEqual({
      erro: MSG_VISITANTE_INDISPONIVEL,
    });
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("encontro de outra turma (id trocado) não grava", async () => {
    const { turmaId, visitante } = await cenario();
    const outra = await cenario();
    usarSessao(await criarCoordenacao());
    const r = await adicionar(turmaId, outra.encontroId, visitante);
    expect(r).toEqual({ erro: MSG_ERRO_INESPERADO });
    expect(await presencas(outra.encontroId)).toEqual([]);
  });

  it("catequista de outra turma e usuário sem sessão são rejeitados sem alterar dados", async () => {
    const { turmaId, encontroId, visitante } = await cenario();
    usarSessao(await criarCatequista());
    expect(await capturarRedirect(adicionar(turmaId, encontroId, visitante))).toBe(
      "/acesso-negado",
    );
    limparSessao();
    expect(await capturarRedirect(adicionar(turmaId, encontroId, visitante))).toBe("/login");
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("falha inesperada devolve a mensagem padrão e registra só ids e o nome do erro", async () => {
    const { turmaId, encontroId, visitante } = await cenario();
    usarSessao(await criarCoordenacao());
    vi.mocked(repositorio.adicionarVisitante).mockRejectedValueOnce(new Error("boom"));
    const erroLog = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await adicionar(turmaId, encontroId, visitante)).toEqual({ erro: MSG_ERRO_INESPERADO });
    expect(erroLog).toHaveBeenCalledWith("[presenca] falha ao adicionar o visitante", {
      turmaId,
      encontroId,
      erro: "Error",
    });
    expect(await presencas(encontroId)).toEqual([]);
  });
});

describe("removerVisitanteAction (4.6, 4.8, 9.1)", () => {
  async function comVisitante() {
    const c = await cenario({ encontro: { situacao: "realizado" } });
    await criarPresencaDireta({
      encontroId: c.encontroId,
      turmaId: c.turmaId,
      catequizandoId: c.visitante,
      visitante: true,
      turmaOrigemId: c.origemId,
    });
    return c;
  }

  it("apaga só o registro de visitante e recalcula o progresso", async () => {
    const c = await comVisitante();
    const inscrito = await criarCatequizandoDireto({ nome: "Inscrito" });
    await criarInscricaoDireta(c.turmaId, inscrito, { dataEntrada: "2020-01-01" });
    await criarPresencaDireta({
      encontroId: c.encontroId,
      turmaId: c.turmaId,
      catequizandoId: inscrito,
    });
    expect((await cumpridosDoCatequizando(c.visitante)).map((x) => x.temaId)).toEqual([c.temaId]);
    const antes = await inscricoes();
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(remover(c.turmaId, c.encontroId, c.visitante));
    expect(url).toBe(volta(c.turmaId, c.encontroId, "visitante-removido"));
    expect(await presencas(c.encontroId)).toEqual([
      { catequizandoId: inscrito, status: "presente", visitante: false, turmaOrigemId: null },
    ]);
    expect(await cumpridosDoCatequizando(c.visitante)).toEqual([]);
    expect(await inscricoes()).toEqual(antes);
  });

  it("não remove presença de inscrito e informa o erro", async () => {
    const c = await cenario({ encontro: { situacao: "realizado" } });
    const inscrito = await criarCatequizandoDireto({ nome: "Inscrito" });
    await criarInscricaoDireta(c.turmaId, inscrito, { dataEntrada: "2020-01-01" });
    await criarPresencaDireta({
      encontroId: c.encontroId,
      turmaId: c.turmaId,
      catequizandoId: inscrito,
    });
    usarSessao(await criarCoordenacao());
    expect(await remover(c.turmaId, c.encontroId, inscrito)).toEqual({
      erro: MSG_VISITANTE_INDISPONIVEL,
    });
    expect(await presencas(c.encontroId)).toHaveLength(1);
  });

  it("recusa em turma encerrada sem apagar", async () => {
    const c = await comVisitante();
    await prisma.turma.update({
      where: { id: c.turmaId },
      data: { encerradaEm: new Date("2020-12-01T00:00:00Z") },
    });
    usarSessao(await criarCoordenacao());
    expect(await remover(c.turmaId, c.encontroId, c.visitante)).toEqual({
      erro: MSG_TURMA_ENCERRADA,
    });
    expect(await presencas(c.encontroId)).toHaveLength(1);
  });

  it("encontro de outra turma (id trocado) não apaga", async () => {
    const c = await comVisitante();
    const outra = await cenario();
    usarSessao(await criarCoordenacao());
    expect(await remover(outra.turmaId, c.encontroId, c.visitante)).toEqual({
      erro: MSG_ERRO_INESPERADO,
    });
    expect(await presencas(c.encontroId)).toHaveLength(1);
  });

  it("catequista de outra turma e usuário sem sessão são rejeitados sem alterar dados", async () => {
    const c = await comVisitante();
    usarSessao(await criarCatequista());
    expect(await capturarRedirect(remover(c.turmaId, c.encontroId, c.visitante))).toBe(
      "/acesso-negado",
    );
    limparSessao();
    expect(await capturarRedirect(remover(c.turmaId, c.encontroId, c.visitante))).toBe("/login");
    expect(await presencas(c.encontroId)).toHaveLength(1);
  });
});
