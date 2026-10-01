import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarTemaAction,
  desativarTemaAction,
  editarTemaAction,
  excluirTemaAction,
  moverTemaAction,
  reativarTemaAction,
} from "@/modules/programa/actions";
import {
  MSG_ERRO_INESPERADO,
  MSG_TEMA_EM_USO,
  MSG_TITULO_EM_USO,
} from "@/modules/programa/mensagens";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarEncontroDireto, criarTemaDireto, criarTurmaDireta } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const LISTA = "/coordenacao/programa";

async function posicoes(): Promise<Record<string, number>> {
  const temas = await prisma.tema.findMany({ select: { titulo: true, posicao: true } });
  return Object.fromEntries(temas.map((t) => [t.titulo, t.posicao]));
}

describe("acesso (1.5)", () => {
  it("catequista é recusado em todas as actions de tema sem alterar dados", async () => {
    const a = await criarTemaDireto("Criação");
    const b = await criarTemaDireto("Aliança");
    usarSessao(await criarCatequista());

    expect(await capturarRedirect(criarTemaAction({}, form({ titulo: "Novo" })))).toBe(
      "/acesso-negado",
    );
    expect(await capturarRedirect(editarTemaAction(a, {}, form({ titulo: "Outro" })))).toBe(
      "/acesso-negado",
    );
    expect(await capturarRedirect(moverTemaAction(b, "subir"))).toBe("/acesso-negado");
    expect(await capturarRedirect(desativarTemaAction(a, {}))).toBe("/acesso-negado");
    expect(await capturarRedirect(reativarTemaAction(a, {}))).toBe("/acesso-negado");
    expect(await capturarRedirect(excluirTemaAction(b, {}))).toBe("/acesso-negado");

    expect(await prisma.tema.count()).toBe(2);
    expect(await posicoes()).toEqual({ Criação: 1, Aliança: 2 });
    const t = await prisma.tema.findUniqueOrThrow({ where: { id: a } });
    expect(t).toMatchObject({ titulo: "Criação", ativo: true });
  });
});

describe("criarTemaAction (1.1, 2.1, 2.3, 2.4)", () => {
  it("cria o tema ao fim da lista e redireciona com tema-criado", async () => {
    await criarTemaDireto("Criação");
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      criarTemaAction({}, form({ titulo: "  Aliança ", descricao: "Abraão" })),
    );
    expect(url).toBe(`${LISTA}?aviso=tema-criado`);
    const t = await prisma.tema.findFirstOrThrow({ where: { titulo: "Aliança" } });
    expect(t).toMatchObject({ descricao: "Abraão", posicao: 2, ativo: true, chave: "alianca" });
  });

  it("devolve erros por campo com os valores, sem gravar", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await criarTemaAction({}, form({ titulo: "", descricao: "x".repeat(2001) }));
    expect(estado.errosCampos?.titulo).toBeTruthy();
    expect(estado.errosCampos?.descricao).toBeTruthy();
    expect(estado.valores?.titulo).toBe("");
    expect(await prisma.tema.count()).toBe(0);
  });

  it("recusa título em uso com acento e caixa diferentes", async () => {
    await criarTemaDireto("Criação");
    usarSessao(await criarCoordenacao());
    const estado = await criarTemaAction({}, form({ titulo: "CRIACAO" }));
    expect(estado.errosCampos?.titulo).toBe(MSG_TITULO_EM_USO);
    expect(estado.valores?.titulo).toBe("CRIACAO");
    expect(await prisma.tema.count()).toBe(1);
  });

  it("converte o P2002 da corrida em título em uso", async () => {
    await criarTemaDireto("Criação");
    usarSessao(await criarCoordenacao());
    vi.spyOn(prisma.tema, "findFirst").mockResolvedValue(null);
    const estado = await criarTemaAction({}, form({ titulo: "criação" }));
    expect(estado.errosCampos?.titulo).toBe(MSG_TITULO_EM_USO);
    expect(await prisma.tema.count()).toBe(1);
  });
});

describe("editarTemaAction (2.1, 2.3, 2.4, 2.5)", () => {
  it("salva e redireciona com alteracoes-salvas", async () => {
    const id = await criarTemaDireto("Criação");
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      editarTemaAction(id, {}, form({ titulo: "A Criação", descricao: "" })),
    );
    expect(url).toBe(`${LISTA}?aviso=alteracoes-salvas`);
    const t = await prisma.tema.findUniqueOrThrow({ where: { id } });
    expect(t).toMatchObject({ titulo: "A Criação", chave: "a criacao", descricao: null });
  });

  it("aceita mudar só acento/caixa do próprio título", async () => {
    const id = await criarTemaDireto("Criação");
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(editarTemaAction(id, {}, form({ titulo: "CRIAÇÃO" })));
    expect(url).toBe(`${LISTA}?aviso=alteracoes-salvas`);
  });

  it("devolve erros por campo e título em uso de outro tema", async () => {
    const id = await criarTemaDireto("Criação");
    await criarTemaDireto("Aliança");
    usarSessao(await criarCoordenacao());
    const invalido = await editarTemaAction(id, {}, form({ titulo: "x" }));
    expect(invalido.errosCampos?.titulo).toBeTruthy();
    expect(invalido.valores?.titulo).toBe("x");
    const emUso = await editarTemaAction(id, {}, form({ titulo: "alianca" }));
    expect(emUso.errosCampos?.titulo).toBe(MSG_TITULO_EM_USO);
    vi.spyOn(prisma.tema, "findFirst").mockResolvedValue(null);
    const corrida = await editarTemaAction(id, {}, form({ titulo: "ALIANÇA" }));
    expect(corrida.errosCampos?.titulo).toBe(MSG_TITULO_EM_USO);
    const t = await prisma.tema.findUniqueOrThrow({ where: { id } });
    expect(t.titulo).toBe("Criação");
  });

  it("id inválido ou inexistente devolve erro inesperado sem lançar", async () => {
    usarSessao(await criarCoordenacao());
    for (const id of ["abc", randomUUID()]) {
      const estado = await editarTemaAction(id, {}, form({ titulo: "Válido" }));
      expect(estado.erro).toBe(MSG_ERRO_INESPERADO);
    }
  });
});

describe("moverTemaAction (2.6)", () => {
  it("sobe e desce trocando com o vizinho ativo; no limite não faz nada", async () => {
    const a = await criarTemaDireto("A");
    await criarTemaDireto("Off", { ativo: false });
    const b = await criarTemaDireto("B");
    const c = await criarTemaDireto("C");
    usarSessao(await criarCoordenacao());

    expect(await capturarRedirect(moverTemaAction(c, "subir"))).toBe(LISTA);
    expect(await posicoes()).toEqual({ A: 1, Off: 2, B: 4, C: 3 });

    expect(await capturarRedirect(moverTemaAction(a, "descer"))).toBe(LISTA);
    expect(await posicoes()).toEqual({ A: 3, Off: 2, B: 4, C: 1 });

    expect(await capturarRedirect(moverTemaAction(c, "subir"))).toBe(LISTA);
    expect(await capturarRedirect(moverTemaAction(b, "descer"))).toBe(LISTA);
    expect(await posicoes()).toEqual({ A: 3, Off: 2, B: 4, C: 1 });
  });

  it("ids inválidos não lançam nem alteram nada", async () => {
    await criarTemaDireto("A");
    usarSessao(await criarCoordenacao());
    expect(await capturarRedirect(moverTemaAction("abc", "subir"))).toBe(LISTA);
    expect(await capturarRedirect(moverTemaAction(randomUUID(), "descer"))).toBe(LISTA);
    expect(await posicoes()).toEqual({ A: 1 });
  });
});

describe("desativar e reativar (3.1, 3.2)", () => {
  it("desativa e reativa com os avisos", async () => {
    const id = await criarTemaDireto("Criação");
    usarSessao(await criarCoordenacao());
    expect(await capturarRedirect(desativarTemaAction(id, {}))).toBe(
      `${LISTA}?aviso=tema-desativado`,
    );
    expect((await prisma.tema.findUniqueOrThrow({ where: { id } })).ativo).toBe(false);
    expect(await capturarRedirect(reativarTemaAction(id, {}))).toBe(
      `${LISTA}?aviso=tema-reativado`,
    );
    expect((await prisma.tema.findUniqueOrThrow({ where: { id } })).ativo).toBe(true);
  });

  it("id inválido ou inexistente devolve erro inesperado", async () => {
    usarSessao(await criarCoordenacao());
    for (const id of ["abc", randomUUID()]) {
      expect((await desativarTemaAction(id, {})).erro).toBe(MSG_ERRO_INESPERADO);
      expect((await reativarTemaAction(id, {})).erro).toBe(MSG_ERRO_INESPERADO);
    }
  });
});

describe("excluirTemaAction (3.3, 3.4)", () => {
  it("exclui tema não usado e recusa tema em uso (mesmo por encontro cancelado)", async () => {
    const livre = await criarTemaDireto("Livre");
    const usado = await criarTemaDireto("Usado");
    const turma = await criarTurmaDireta();
    await criarEncontroDireto(turma, { temaId: usado, situacao: "cancelado" });
    usarSessao(await criarCoordenacao());

    expect((await excluirTemaAction(usado, {})).erro).toBe(MSG_TEMA_EM_USO);
    expect(await prisma.tema.count({ where: { id: usado } })).toBe(1);

    expect(await capturarRedirect(excluirTemaAction(livre, {}))).toBe(
      `${LISTA}?aviso=tema-excluido`,
    );
    expect(await prisma.tema.count({ where: { id: livre } })).toBe(0);
  });

  it("id inválido ou inexistente devolve erro inesperado", async () => {
    usarSessao(await criarCoordenacao());
    for (const id of ["abc", randomUUID()]) {
      expect((await excluirTemaAction(id, {})).erro).toBe(MSG_ERRO_INESPERADO);
    }
  });
});
