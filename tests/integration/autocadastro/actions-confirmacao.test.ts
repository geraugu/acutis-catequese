import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import { hojeCivil } from "@/modules/compartilhado/datas";
import type { FichaDados } from "@/modules/catequizandos/domain/ficha";
import { confirmarFichaLinkAction } from "@/modules/autocadastro/actions";
import {
  MSG_FICHA_INVALIDA,
  MSG_JA_REVISADA,
  MSG_TURMA_ENCERRADA_FICHA,
  mensagemDeAviso,
} from "@/modules/autocadastro/mensagens";
import { criarFichaPendente, criarLink, obterLinkDaTurma } from "@/modules/autocadastro/repositorio";
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
  criarTurmaDireta,
  criarUsuarioDireto,
  inscreverDireto,
} from "../turmas/helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const ficha = (extra: Partial<FichaDados> = {}): FichaDados => ({
  nome: "Ana Souza",
  dataNascimento: "2005-01-01" as DataCivil,
  telefone: "11987654321",
  email: "ana@exemplo.com",
  sacramentos: {
    batismo: { recebido: true, data: "2005-06-01" as DataCivil, paroquia: "São José" },
    eucaristia: { recebido: false },
    crisma: { recebido: false },
  },
  ...extra,
});

async function cenario(opcoes: { vagas?: number; fichaExtra?: Partial<FichaDados> } = {}) {
  const turmaId = await criarTurmaDireta(opcoes.vagas ? { vagas: opcoes.vagas } : {});
  const userId = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  await criarLink(turmaId, `tok-${turmaId}`, userId);
  const link = await obterLinkDaTurma(turmaId);
  const id = await criarFichaPendente(ficha(opcoes.fichaExtra), link!.id, turmaId, {
    em: new Date(),
    versao: "v1",
  });
  return { turmaId, id };
}

const estado = async (id: string) => {
  const c = await prisma.catequizando.findUniqueOrThrow({
    where: { id },
    include: { inscricoes: true, autocadastro: true },
  });
  return c;
};

describe("confirmarFichaLinkAction (6.4, 7.1–7.6)", () => {
  it("coordenação confirma em turma livre: ativa, inscreve hoje e avisa", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCoordenacao());
    expect(await capturarRedirect(confirmarFichaLinkAction(turmaId, id, {}, form({})))).toBe(
      `/coordenacao/turmas/${turmaId}?aviso=ficha-confirmada`,
    );
    const c = await estado(id);
    expect(c.estado).toBe("ativo");
    expect(c.inscricoes).toHaveLength(1);
    expect(c.inscricoes[0].dataEntrada.toISOString().slice(0, 10)).toBe(hojeCivil());
    expect(c.autocadastro?.revisadaEm).not.toBeNull();
    expect(mensagemDeAviso("ficha-confirmada")).toBe("Ficha confirmada e inscrita na turma");
  });

  it("catequista responsável confirma; turma lotada pede confirmação e depois inscreve", async () => {
    const { turmaId, id } = await cenario({ vagas: 1 });
    await inscreverDireto(turmaId, await criarCatequizandoDireto("Outro"), "2026-02-01");
    const resp = await criarCatequista();
    await designar(turmaId, resp.id);
    usarSessao(resp);

    expect(await confirmarFichaLinkAction(turmaId, id, {}, form({}))).toEqual({
      lotada: { inscritos: 1, vagas: 1 },
    });
    expect((await estado(id)).estado).toBe("pendente");

    expect(
      await capturarRedirect(
        confirmarFichaLinkAction(turmaId, id, {}, form({ confirmarLotacao: "1" })),
      ),
    ).toBe(`/catequista/turmas/${turmaId}?aviso=ficha-confirmada`);
    expect((await estado(id)).estado).toBe("ativo");
  });

  it("turma encerrada bloqueia a confirmação", async () => {
    const { turmaId, id } = await cenario();
    await prisma.turma.update({ where: { id: turmaId }, data: { encerradaEm: new Date() } });
    usarSessao(await criarCoordenacao());
    expect(await confirmarFichaLinkAction(turmaId, id, {}, form({}))).toEqual({
      erro: MSG_TURMA_ENCERRADA_FICHA,
    });
    expect((await estado(id)).estado).toBe("pendente");
  });

  it("ficha inválida não é confirmada e devolve erros por campo", async () => {
    const { turmaId, id } = await cenario({ fichaExtra: { telefone: "123" } });
    usarSessao(await criarCoordenacao());
    const r = await confirmarFichaLinkAction(turmaId, id, {}, form({}));
    expect(r.erro).toBe(MSG_FICHA_INVALIDA);
    expect(r.errosCampos?.telefone).toBeTruthy();
    expect((await estado(id)).estado).toBe("pendente");
  });

  it("revisão concorrente: a segunda confirmação informa já revisada", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCoordenacao());
    await capturarRedirect(confirmarFichaLinkAction(turmaId, id, {}, form({})));
    expect(await confirmarFichaLinkAction(turmaId, id, {}, form({}))).toEqual({
      erro: MSG_JA_REVISADA,
    });
    expect((await estado(id)).inscricoes).toHaveLength(1);
  });

  it("catequista de outra turma é negado", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCatequista());
    expect(await capturarRedirect(confirmarFichaLinkAction(turmaId, id, {}, form({})))).toBe(
      "/acesso-negado",
    );
    expect((await estado(id)).estado).toBe("pendente");
  });
});
