import { afterEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  desativarLinkAction,
  gerarLinkAction,
  regenerarLinkAction,
  salvarExpiracaoAction,
} from "@/modules/autocadastro/actions";
import { ERRO_EXPIRACAO_PASSADA } from "@/modules/autocadastro/domain/link";
import { MSG_LINK_JA_ATIVO, mensagemDeAviso } from "@/modules/autocadastro/mensagens";
import { MSG_TURMA_ENCERRADA } from "@/modules/autocadastro/mensagens";
import { designar } from "@/modules/turmas/repositorio";
import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarTurmaDireta } from "../turmas/helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const ativos = (turmaId: string) =>
  prisma.linkAutocadastro.findMany({ where: { turmaId, desativadoEm: null } });

describe("gestão do link (1.1, 1.4, 1.5, 1.6, 1.7, 1.10)", () => {
  it("coordenação gera, salva expiração, regenera e desativa", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    const base = `/coordenacao/turmas/${turmaId}/equipe`;

    expect(await capturarRedirect(gerarLinkAction(turmaId, {}))).toBe(`${base}?aviso=link-gerado`);
    expect(revalidatePath).toHaveBeenCalledWith(base);
    expect(revalidatePath).not.toHaveBeenCalledWith(expect.anything(), "layout");
    const [l1] = await ativos(turmaId);
    expect(l1.token).toBeTruthy();

    expect(await gerarLinkAction(turmaId, {})).toEqual({ erro: MSG_LINK_JA_ATIVO });

    expect(
      await capturarRedirect(salvarExpiracaoAction(turmaId, {}, form({ expiraEm: hojeCivil() }))),
    ).toBe(`${base}?aviso=expiracao-salva`);
    expect((await ativos(turmaId))[0].expiraEm).not.toBeNull();
    expect(await capturarRedirect(salvarExpiracaoAction(turmaId, {}, form({ expiraEm: "" })))).toBe(
      `${base}?aviso=expiracao-salva`,
    );
    expect((await ativos(turmaId))[0].expiraEm).toBeNull();

    expect(await capturarRedirect(regenerarLinkAction(turmaId, {}))).toBe(
      `${base}?aviso=link-regenerado`,
    );
    const depois = await ativos(turmaId);
    expect(depois).toHaveLength(1);
    expect(depois[0].token).not.toBe(l1.token);

    expect(await capturarRedirect(desativarLinkAction(turmaId, {}))).toBe(
      `${base}?aviso=link-desativado`,
    );
    expect(await ativos(turmaId)).toHaveLength(0);
    expect(mensagemDeAviso("link-desativado")).toBe("Link desativado");
    expect(mensagemDeAviso("link-regenerado")).toBe("Novo link gerado");
  });

  it("catequista responsável gera na própria área; de outra turma é negado", async () => {
    const turmaId = await criarTurmaDireta();
    const resp = await criarCatequista();
    await designar(turmaId, resp.id);
    usarSessao(resp);
    expect(await capturarRedirect(gerarLinkAction(turmaId, {}))).toBe(
      `/catequista/turmas/${turmaId}/equipe?aviso=link-gerado`,
    );

    usarSessao(await criarCatequista());
    expect(await capturarRedirect(desativarLinkAction(turmaId, {}))).toBe("/acesso-negado");
    expect(await capturarRedirect(regenerarLinkAction(turmaId, {}))).toBe("/acesso-negado");
    expect(await ativos(turmaId)).toHaveLength(1);
  });

  it("rejeita expiração no passado", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    await capturarRedirect(gerarLinkAction(turmaId, {}));
    const estado = await salvarExpiracaoAction(turmaId, {}, form({ expiraEm: "2020-01-01" }));
    expect(estado.erro).toBe(ERRO_EXPIRACAO_PASSADA);
    expect((await ativos(turmaId))[0].expiraEm).toBeNull();
  });

  it("rejeita turma encerrada", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-01-10" });
    usarSessao(await criarCoordenacao());
    expect(await gerarLinkAction(turmaId, {})).toEqual({ erro: MSG_TURMA_ENCERRADA });
    expect(await prisma.linkAutocadastro.count()).toBe(0);
  });
});
