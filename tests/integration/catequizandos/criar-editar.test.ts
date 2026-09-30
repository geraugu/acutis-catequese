import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import { criarCatequizandoAction, editarCatequizandoAction } from "@/modules/catequizandos/actions";
import { criarCatequizando, obterCatequizando } from "@/modules/catequizandos/repositorio";
import { MSG_ERRO_INESPERADO } from "@/modules/catequizandos/mensagens";
import {
  camposFicha,
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const fichaBase = {
  nome: "Maria Souza",
  dataNascimento: "2000-05-10" as DataCivil,
  telefone: "11987654321",
  email: "",
  endereco: "",
  observacoes: "",
  sacramentos: {
    batismo: { recebido: false },
    eucaristia: { recebido: false },
    crisma: { recebido: false },
  },
};

describe("criarCatequizandoAction (1.3, 2.1, 2.3, 2.8, 4.1–4.3, 6.4)", () => {
  it("catequista é redirecionado para acesso negado sem gravar", async () => {
    usarSessao(await criarCatequista());
    const url = await capturarRedirect(criarCatequizandoAction({}, form(camposFicha())));
    expect(url).toBe("/acesso-negado");
    expect(await prisma.catequizando.count()).toBe(0);
  });

  it("cadastro válido grava ativo com sacramentos e redireciona com cadastrado", async () => {
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(criarCatequizandoAction({}, form(camposFicha())));
    const [c] = await prisma.catequizando.findMany();
    expect(url).toBe(`/coordenacao/catequizandos/${c.id}?aviso=cadastrado`);
    const lido = await obterCatequizando(c.id);
    expect(lido!.estado).toBe("ativo");
    expect(lido!.telefone).toBe("11987654321");
    expect(lido!.sacramentos.batismo).toEqual({
      recebido: true,
      data: "2001-01-31",
      paroquia: "Sé",
    });
    expect(lido!.sacramentosRecebidos).toEqual(["batismo", "eucaristia"]);
  });

  it("duplicado sem confirmação não grava e devolve duplicado; com confirmação grava", async () => {
    const existenteId = await criarCatequizando(fichaBase, "ativo");
    usarSessao(await criarCoordenacao());

    const estado = await criarCatequizandoAction({}, form(camposFicha({ nome: "  maria SOUZA " })));
    expect(estado.duplicado).toEqual({ id: existenteId, nome: "Maria Souza" });
    expect(estado.valores?.nome).toBe("  maria SOUZA ");
    expect(await prisma.catequizando.count()).toBe(1);

    const url = await capturarRedirect(
      criarCatequizandoAction({}, form(camposFicha({ confirmarDuplicidade: "1" }))),
    );
    expect(url).toMatch(/\?aviso=cadastrado$/);
    expect(await prisma.catequizando.count()).toBe(2);
  });

  it("erros por campo trazem os valores, inclusive em crismaData", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await criarCatequizandoAction(
      {},
      form(camposFicha({ nome: "", crismaRecebido: "on", crismaData: "2999-01-01" })),
    );
    expect(estado.errosCampos?.nome).toBeTruthy();
    expect(estado.errosCampos?.crismaData).toBeTruthy();
    expect(estado.valores?.crismaData).toBe("2999-01-01");
    expect(estado.valores?.crismaRecebido).toBe("on");
    expect(estado.valores?.telefone).toBe("(11) 98765-4321");
    expect(await prisma.catequizando.count()).toBe(0);
  });
});

describe("editarCatequizandoAction (1.3, 4.1, 6.3, 8.4)", () => {
  it("edição de ficha pendente salva sem mudar o estado", async () => {
    const id = await criarCatequizando(fichaBase, "pendente");
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      editarCatequizandoAction(id, {}, form(camposFicha({ nome: "Maria Souza Lima" }))),
    );
    expect(url).toBe(`/coordenacao/catequizandos/${id}?aviso=alteracoes-salvas`);
    const lido = await obterCatequizando(id);
    expect(lido!.nome).toBe("Maria Souza Lima");
    expect(lido!.estado).toBe("pendente");
    expect(lido!.sacramentosRecebidos).toEqual(["batismo", "eucaristia"]);
  });

  it("id inexistente devolve erro inesperado", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await editarCatequizandoAction("nao-existe", {}, form(camposFicha()));
    expect(estado.erro).toBe(MSG_ERRO_INESPERADO);
  });

  it("catequista é redirecionado sem alterar", async () => {
    const id = await criarCatequizando(fichaBase, "ativo");
    usarSessao(await criarCatequista());
    const url = await capturarRedirect(
      editarCatequizandoAction(id, {}, form(camposFicha({ nome: "Outro Nome" }))),
    );
    expect(url).toBe("/acesso-negado");
    expect((await obterCatequizando(id))!.nome).toBe("Maria Souza");
  });
});
