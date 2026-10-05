import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { salvarChamadaAction } from "@/modules/presenca/actions";
import {
  MSG_ERRO_INESPERADO,
  MSG_FALTAM_MARCACOES,
  MSG_SEM_INSCRITOS,
  MSG_TURMA_ENCERRADA,
} from "@/modules/presenca/mensagens";
import * as repositorio from "@/modules/presenca/repositorio";
import { designar } from "@/modules/turmas/repositorio";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTurmaDireta,
} from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);
vi.mock("@/modules/presenca/repositorio", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/presenca/repositorio")>();
  return { ...real, salvarChamada: vi.fn(real.salvarChamada) };
});

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const coord = (t: string) => `/coordenacao/turmas/${t}/encontros`;
const cat = (t: string) => `/catequista/turmas/${t}/encontros`;
const PASSADO = "2020-03-07";
const FUTURO = "2099-03-07";

const situacao = async (id: string) =>
  (await prisma.encontro.findUniqueOrThrow({ where: { id }, select: { situacao: true } })).situacao;
const presencas = async (encontroId: string) =>
  prisma.presenca.findMany({
    where: { encontroId },
    select: { catequizandoId: true, status: true },
    orderBy: { catequizandoId: "asc" },
  });

async function cenario(
  extra: { nome?: string; encontro?: Parameters<typeof criarEncontroDireto>[1] } = {},
) {
  const turmaId = await criarTurmaDireta({ nome: extra.nome });
  const encontroId = await criarEncontroDireto(turmaId, { data: PASSADO, ...extra.encontro });
  const a = await criarCatequizandoDireto({ nome: "Ana" });
  const b = await criarCatequizandoDireto({ nome: "Bruno" });
  await criarInscricaoDireta(turmaId, a, { dataEntrada: "2020-01-01" });
  await criarInscricaoDireta(turmaId, b, { dataEntrada: "2020-01-01" });
  return { turmaId, encontroId, a, b };
}

const salvar = (t: string, e: string, dados: Record<string, string>, base = coord(t)) =>
  salvarChamadaAction(t, e, base, {}, form(dados));

describe("salvarChamadaAction (1.5, 2.3 a 2.6, 3.2, 3.5, 9.1, 10.6)", () => {
  it("salva com todos marcados, marca realizado e redireciona com o aviso", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      salvar(turmaId, encontroId, { [`status:${a}`]: "presente", [`status:${b}`]: "ausente" }),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=chamada-salva`);
    expect(await situacao(encontroId)).toBe("realizado");
    expect(await presencas(encontroId)).toEqual(
      expect.arrayContaining([
        { catequizandoId: a, status: "presente" },
        { catequizandoId: b, status: "ausente" },
      ]),
    );
  });

  it("catequista responsável salva e volta à base do catequista", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    const c = await criarCatequista();
    await designar(turmaId, c.id);
    usarSessao(c);
    const url = await capturarRedirect(
      salvar(
        turmaId,
        encontroId,
        { [`status:${a}`]: "presente", [`status:${b}`]: "presente" },
        cat(turmaId),
      ),
    );
    expect(url).toBe(`${cat(turmaId)}?aviso=chamada-salva`);
  });

  it("devolve os faltantes sem gravar, preservando as marcações feitas", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    usarSessao(await criarCoordenacao());
    const r = await salvar(turmaId, encontroId, { [`status:${a}`]: "presente" });
    expect(r).toEqual({
      erro: MSG_FALTAM_MARCACOES,
      faltantes: [b],
      valores: { [`status:${a}`]: "presente" },
    });
    expect(await situacao(encontroId)).toBe("planejado");
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("recusa data futura, encontro cancelado, turma encerrada e turma sem inscritos", async () => {
    usarSessao(await criarCoordenacao());
    const futuro = await cenario({ nome: "Futura", encontro: { data: FUTURO } });
    const rFuturo = await salvar(futuro.turmaId, futuro.encontroId, {
      [`status:${futuro.a}`]: "presente",
    });
    expect(rFuturo.erro).toMatch(/a partir da data/);
    expect(await situacao(futuro.encontroId)).toBe("planejado");

    const cancelado = await cenario({ nome: "Cancelada", encontro: { situacao: "cancelado" } });
    const rCancelado = await salvar(cancelado.turmaId, cancelado.encontroId, {
      [`status:${cancelado.a}`]: "presente",
    });
    expect(rCancelado.erro).toMatch(/cancelado/);
    expect(await presencas(cancelado.encontroId)).toEqual([]);

    const turmaEnc = await criarTurmaDireta({ nome: "Encerrada", encerradaEm: "2020-12-01" });
    const encEnc = await criarEncontroDireto(turmaEnc, { data: PASSADO });
    const x = await criarCatequizandoDireto({ nome: "Caio" });
    await criarInscricaoDireta(turmaEnc, x, { dataEntrada: "2020-01-01" });
    expect(await salvar(turmaEnc, encEnc, { [`status:${x}`]: "presente" })).toEqual({
      erro: MSG_TURMA_ENCERRADA,
    });
    expect(await presencas(encEnc)).toEqual([]);

    const turmaVazia = await criarTurmaDireta({ nome: "Vazia" });
    const encVazio = await criarEncontroDireto(turmaVazia, { data: PASSADO });
    expect(await salvar(turmaVazia, encVazio, {})).toEqual({ erro: MSG_SEM_INSCRITOS });
    expect(await situacao(encVazio)).toBe("planejado");
  });

  it("corrige encontro realizado com o aviso de atualização, com novo inscrito entrando", async () => {
    const { turmaId, encontroId, a, b } = await cenario({ encontro: { situacao: "realizado" } });
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId: a, status: "presente" });
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId: b, status: "presente" });
    const novo = await criarCatequizandoDireto({ nome: "Davi" });
    await criarInscricaoDireta(turmaId, novo, { dataEntrada: "2020-02-01" });
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      salvar(turmaId, encontroId, {
        [`status:${a}`]: "ausente",
        [`status:${b}`]: "presente",
        [`status:${novo}`]: "justificado",
      }),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=chamada-atualizada`);
    const feitas = await presencas(encontroId);
    expect(feitas).toHaveLength(3);
    expect(feitas).toEqual(
      expect.arrayContaining([
        { catequizandoId: a, status: "ausente" },
        { catequizandoId: novo, status: "justificado" },
      ]),
    );
  });

  it("encontro reaberto (planejado com presenças) salvo de novo é nova chamada preenchida", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId: a, status: "presente" });
    usarSessao(await criarCoordenacao());
    // a linha de a já vem preenchida na tela, mas o envio precisa trazer todas as marcações
    const r = await salvar(turmaId, encontroId, { [`status:${a}`]: "presente" });
    expect(r.faltantes).toEqual([b]);
    const url = await capturarRedirect(
      salvar(turmaId, encontroId, { [`status:${a}`]: "presente", [`status:${b}`]: "ausente" }),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=chamada-salva`);
    expect(await situacao(encontroId)).toBe("realizado");
  });

  it("catequista de outra turma e usuário sem sessão são rejeitados sem alterar dados", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    const dados = { [`status:${a}`]: "presente", [`status:${b}`]: "presente" };
    const outro = await criarCatequista();
    usarSessao(outro);
    expect(await capturarRedirect(salvar(turmaId, encontroId, dados))).toBe("/acesso-negado");
    limparSessao();
    expect(await capturarRedirect(salvar(turmaId, encontroId, dados))).toBe("/login");
    expect(await situacao(encontroId)).toBe("planejado");
    expect(await presencas(encontroId)).toEqual([]);
  });

  it("falha inesperada devolve a mensagem padrão com as marcações preservadas", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    usarSessao(await criarCoordenacao());
    vi.mocked(repositorio.salvarChamada).mockRejectedValueOnce(new Error("boom"));
    const erroLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const dados = { [`status:${a}`]: "presente", [`status:${b}`]: "ausente" };
    expect(await salvar(turmaId, encontroId, dados)).toEqual({
      erro: MSG_ERRO_INESPERADO,
      valores: dados,
    });
    expect(erroLog).toHaveBeenCalledWith("[presenca] falha ao salvar a chamada", {
      turmaId,
      encontroId,
      erro: "Error",
    });
    expect(await situacao(encontroId)).toBe("planejado");
  });

  it("base malformada cai na base da coordenação", async () => {
    const { turmaId, encontroId, a, b } = await cenario();
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      salvar(
        turmaId,
        encontroId,
        { [`status:${a}`]: "presente", [`status:${b}`]: "presente" },
        "https://malicioso.example/x",
      ),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=chamada-salva`);
  });
});
