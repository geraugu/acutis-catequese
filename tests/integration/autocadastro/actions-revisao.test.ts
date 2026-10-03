import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { FichaDados } from "@/modules/catequizandos/domain/ficha";
import { corrigirFichaLinkAction, descartarFichaLinkAction } from "@/modules/autocadastro/actions";
import {
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
  criarTurmaDireta,
  criarUsuarioDireto,
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
    include: { autocadastro: true },
  });
  return c;
};

const campos = (extra: Record<string, string> = {}) =>
  form({
    nome: "Ana Souza Lima",
    dataNascimento: "2005-01-01",
    telefone: "11987654321",
    email: "ana@exemplo.com",
    batismoRecebido: "on",
    batismoData: "2005-06-01",
    batismoParoquia: "São José",
    ...extra,
  });

describe("corrigirFichaLinkAction (5.5, 6.4)", () => {
  it("corrige mantendo pendente e a origem, e avisa", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCoordenacao());
    expect(await capturarRedirect(corrigirFichaLinkAction(turmaId, id, {}, campos()))).toBe(
      `/coordenacao/turmas/${turmaId}/pendentes/${id}?aviso=ficha-corrigida`,
    );
    const c = await estado(id);
    expect(c.nome).toBe("Ana Souza Lima");
    expect(c.estado).toBe("pendente");
    expect(c.autocadastro?.turmaId).toBe(turmaId);
    expect(mensagemDeAviso("ficha-corrigida")).toBe("Ficha corrigida");
  });

  it("campo inválido devolve erro por campo e os valores", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCoordenacao());
    const r = await corrigirFichaLinkAction(turmaId, id, {}, campos({ nome: "" }));
    expect(r.errosCampos?.nome).toBeTruthy();
    expect(r.valores?.telefone).toBe("11987654321");
    expect((await estado(id)).nome).toBe("Ana Souza");
  });

  it("turma encerrada bloqueia a correção", async () => {
    const { turmaId, id } = await cenario();
    await prisma.turma.update({ where: { id: turmaId }, data: { encerradaEm: new Date() } });
    usarSessao(await criarCoordenacao());
    const r = await corrigirFichaLinkAction(turmaId, id, {}, campos());
    expect(r.erro).toBe(MSG_TURMA_ENCERRADA_FICHA);
    expect((await estado(id)).nome).toBe("Ana Souza");
  });

  it("ficha já revisada é recusada", async () => {
    const { turmaId, id } = await cenario();
    await prisma.catequizando.update({ where: { id }, data: { estado: "ativo" } });
    usarSessao(await criarCoordenacao());
    expect((await corrigirFichaLinkAction(turmaId, id, {}, campos())).erro).toBe(MSG_JA_REVISADA);
  });

  it("catequista de outra turma é negado", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCatequista());
    expect(await capturarRedirect(corrigirFichaLinkAction(turmaId, id, {}, campos()))).toBe(
      "/acesso-negado",
    );
  });
});

describe("descartarFichaLinkAction (8.1–8.4)", () => {
  it("catequista responsável descarta: exclui a ficha e avisa", async () => {
    const { turmaId, id } = await cenario();
    const resp = await criarCatequista();
    await designar(turmaId, resp.id);
    usarSessao(resp);
    expect(await capturarRedirect(descartarFichaLinkAction(turmaId, id, {}))).toBe(
      `/catequista/turmas/${turmaId}/pendentes?aviso=ficha-descartada`,
    );
    expect(await prisma.catequizando.findUnique({ where: { id } })).toBeNull();
    expect(mensagemDeAviso("ficha-descartada")).toBe("Ficha descartada");
  });

  it("funciona com a turma encerrada (8.4)", async () => {
    const { turmaId, id } = await cenario();
    await prisma.turma.update({ where: { id: turmaId }, data: { encerradaEm: new Date() } });
    usarSessao(await criarCoordenacao());
    expect(await capturarRedirect(descartarFichaLinkAction(turmaId, id, {}))).toBe(
      `/coordenacao/turmas/${turmaId}/pendentes?aviso=ficha-descartada`,
    );
    expect(await prisma.catequizando.findUnique({ where: { id } })).toBeNull();
  });

  it("ficha ativa é recusada e preservada", async () => {
    const { turmaId, id } = await cenario();
    await prisma.catequizando.update({ where: { id }, data: { estado: "ativo" } });
    usarSessao(await criarCoordenacao());
    expect(await descartarFichaLinkAction(turmaId, id, {})).toEqual({ erro: MSG_JA_REVISADA });
    expect(await prisma.catequizando.findUnique({ where: { id } })).not.toBeNull();
  });

  it("catequista de outra turma é negado", async () => {
    const { turmaId, id } = await cenario();
    usarSessao(await criarCatequista());
    expect(await capturarRedirect(descartarFichaLinkAction(turmaId, id, {}))).toBe(
      "/acesso-negado",
    );
    expect(await prisma.catequizando.findUnique({ where: { id } })).not.toBeNull();
  });
});
