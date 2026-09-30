import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  confirmarFichaAction,
  inativarCatequizandoAction,
  reativarCatequizandoAction,
  recusarFichaAction,
} from "@/modules/catequizandos/actions";
import { criarCatequizando, obterCatequizando } from "@/modules/catequizandos/repositorio";
import { MSG_FICHA_INVALIDA, MSG_TRANSICAO_INVALIDA } from "@/modules/catequizandos/mensagens";
import type { EstadoCatequizando } from "@/modules/catequizandos/domain/estado";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  limparSessao,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const ficha = (dataNascimento = "2000-05-10") => ({
  nome: "Maria Souza",
  dataNascimento: dataNascimento as DataCivil,
  telefone: "11987654321",
  sacramentos: {
    batismo: { recebido: false },
    eucaristia: { recebido: false },
    crisma: { recebido: false },
  },
});

const novo = (estado: EstadoCatequizando, nascimento?: string) =>
  criarCatequizando(ficha(nascimento), estado);
const estadoDe = async (id: string) => (await obterCatequizando(id))!.estado;

describe("transições de estado (1.3, 7.2, 7.4, 7.5, 8.1–8.3)", () => {
  it("inativa e reativa", async () => {
    usarSessao(await criarCoordenacao());
    const id = await novo("ativo");
    expect(await capturarRedirect(inativarCatequizandoAction(id, {}))).toBe(
      `/coordenacao/catequizandos/${id}?aviso=inativado`,
    );
    expect(await estadoDe(id)).toBe("inativo");
    expect(await capturarRedirect(reativarCatequizandoAction(id, {}))).toBe(
      `/coordenacao/catequizandos/${id}?aviso=reativado`,
    );
    expect(await estadoDe(id)).toBe("ativo");
  });

  it("confirma pendente válida", async () => {
    usarSessao(await criarCoordenacao());
    const id = await novo("pendente");
    expect(await capturarRedirect(confirmarFichaAction(id, {}))).toBe(
      `/coordenacao/catequizandos/${id}?aviso=ficha-confirmada`,
    );
    expect(await estadoDe(id)).toBe("ativo");
  });

  it("recusa confirmar pendente abaixo da idade mínima sem mudar o estado", async () => {
    usarSessao(await criarCoordenacao());
    const id = await novo("pendente", "2020-01-01");
    expect(await confirmarFichaAction(id, {})).toEqual({ erro: MSG_FICHA_INVALIDA });
    expect(await estadoDe(id)).toBe("pendente");
  });

  it("recusar a ficha deixa inativa e mantém a linha", async () => {
    usarSessao(await criarCoordenacao());
    const id = await novo("pendente");
    expect(await capturarRedirect(recusarFichaAction(id, {}))).toBe(
      `/coordenacao/catequizandos/${id}?aviso=ficha-recusada`,
    );
    expect(await estadoDe(id)).toBe("inativo");
    expect(await prisma.catequizando.count()).toBe(1);
  });

  it("reativar alguém já ativo devolve erro", async () => {
    usarSessao(await criarCoordenacao());
    const id = await novo("ativo");
    expect(await reativarCatequizandoAction(id, {})).toEqual({ erro: MSG_TRANSICAO_INVALIDA });
    expect(await estadoDe(id)).toBe("ativo");
  });

  it("catequista é rejeitado sem mudar nada", async () => {
    const id = await novo("pendente");
    usarSessao(await criarCatequista());
    for (const acao of [
      inativarCatequizandoAction,
      reativarCatequizandoAction,
      confirmarFichaAction,
      recusarFichaAction,
    ]) {
      expect(await capturarRedirect(acao(id, {}))).toBe("/acesso-negado");
    }
    expect(await estadoDe(id)).toBe("pendente");
  });
});
