import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { salvarLimiteAction } from "@/modules/presenca/actions";
import { MSG_ERRO_INESPERADO } from "@/modules/presenca/mensagens";
import * as repositorio from "@/modules/presenca/repositorio";
import { alertasDeFrequencia, obterLimite } from "@/modules/presenca/repositorio";
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
  return { ...real, salvarLimite: vi.fn(real.salvarLimite) };
});

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const DESTINO = "/coordenacao/frequencia?aviso=limite-salvo";
const salvar = (percentual?: string) =>
  salvarLimiteAction({}, form(percentual === undefined ? {} : { percentual }));
const linhas = () => prisma.limiteFrequencia.findMany();

// Catequizando com 2 presenças em 3 encontros realizados: 66,7%.
async function catequizandoCom2De3() {
  const turmaId = await criarTurmaDireta({ nome: "Turma limite" });
  const catequizandoId = await criarCatequizandoDireto({ nome: "Maria" });
  await criarInscricaoDireta(turmaId, catequizandoId, { dataEntrada: "2020-01-01" });
  const status = ["presente", "presente", "ausente"] as const;
  for (const [i, s] of status.entries()) {
    const encontroId = await criarEncontroDireto(turmaId, {
      data: `2020-03-0${i + 1}`,
      situacao: "realizado",
    });
    await criarPresencaDireta({ encontroId, turmaId, catequizandoId, status: s });
  }
  return { turmaId, catequizandoId };
}

describe("salvarLimiteAction (1.3, 7.2, 7.3, 7.11)", () => {
  it("salva o limite, lê de volta e redireciona com aviso", async () => {
    usarSessao(await criarCoordenacao());
    expect(await capturarRedirect(salvar("75"))).toBe(DESTINO);
    expect(await obterLimite()).toBe(75);
    expect(await capturarRedirect(salvar(" 80 "))).toBe(DESTINO);
    expect(await obterLimite()).toBe(80);
    expect(await linhas()).toHaveLength(1);
  });

  it("aceita os extremos 1 e 100", async () => {
    usarSessao(await criarCoordenacao());
    await capturarRedirect(salvar("1"));
    expect(await obterLimite()).toBe(1);
    await capturarRedirect(salvar("100"));
    expect(await obterLimite()).toBe(100);
  });

  it.each([
    ["vazio", ""],
    ["só espaços", "   "],
    ["decimal", "70,5"],
    ["decimal com ponto", "70.5"],
    ["texto", "abc"],
    ["zero", "0"],
    ["acima de 100", "101"],
    ["negativo", "-5"],
  ])("recusa %s com mensagem no campo, devolve o digitado e não grava", async (_n, digitado) => {
    usarSessao(await criarCoordenacao());
    const estado = await salvar(digitado);
    expect(estado.errosCampos?.percentual).toBe("Informe um limite inteiro de 1 a 100");
    expect(estado.valores).toEqual({ percentual: digitado });
    expect(await linhas()).toEqual([]);
  });

  it("campo ausente é tratado como vazio", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await salvar();
    expect(estado.errosCampos?.percentual).toBeTruthy();
    expect(estado.valores).toEqual({ percentual: "" });
    expect(await linhas()).toEqual([]);
  });

  it("valor inválido não altera o limite já salvo", async () => {
    usarSessao(await criarCoordenacao());
    await capturarRedirect(salvar("55"));
    await salvar("101");
    expect(await obterLimite()).toBe(55);
  });

  it("catequista é rejeitado sem alterar o valor; sem sessão vai a /login", async () => {
    usarSessao(await criarCoordenacao());
    await capturarRedirect(salvar("55"));
    usarSessao(await criarCatequista());
    expect(await capturarRedirect(salvar("90"))).toBe("/acesso-negado");
    limparSessao();
    expect(await capturarRedirect(salvar("90"))).toBe("/login");
    expect(await obterLimite()).toBe(55);
  });

  it("os alertas são recalculados na leitura seguinte com o novo limite (7.11)", async () => {
    const { catequizandoId } = await catequizandoCom2De3();
    usarSessao(await criarCoordenacao());

    await capturarRedirect(salvar("67"));
    const com67 = await alertasDeFrequencia("todas", await obterLimite());
    expect(com67.map((a) => a.catequizandoId)).toEqual([catequizandoId]);

    await capturarRedirect(salvar("60"));
    expect(await alertasDeFrequencia("todas", await obterLimite())).toEqual([]);
  });

  it("falha inesperada devolve a mensagem padrão e registra só o nome do erro", async () => {
    usarSessao(await criarCoordenacao());
    vi.mocked(repositorio.salvarLimite).mockRejectedValueOnce(new Error("boom 12345"));
    const erroLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const estado = await salvar("70");
    expect(estado).toEqual({ erro: MSG_ERRO_INESPERADO, valores: { percentual: "70" } });
    expect(JSON.stringify(erroLog.mock.calls)).not.toContain("boom");
    expect(JSON.stringify(erroLog.mock.calls)).toContain("Error");
  });
});
