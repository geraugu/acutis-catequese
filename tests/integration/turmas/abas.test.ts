import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { criarLink } from "@/modules/autocadastro/repositorio";
import {
  ABAS,
  avisoDaTurma,
  cabecalhoDaTurma,
  carregarTurmaDaAba,
} from "@/app/(interno)/_turma/dados";
import { criarTurmaDireta, criarUsuarioDireto, dia } from "./helpers";

class RedirectErro extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT;${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectErro(url);
  },
}));

// Sessão simulada: cada teste define quem está logado.
let logado: SessaoUsuario;
vi.mock("@/modules/auth/dal", () => ({
  requireRole: async (papeis: string[]) => {
    if (!papeis.includes(logado.papel)) throw new RedirectErro("/acesso-negado");
    return logado;
  },
}));

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

afterEach(() => vi.restoreAllMocks());

async function destino(promessa: Promise<unknown>): Promise<string | null> {
  try {
    await promessa;
    return null;
  } catch (e) {
    if (e instanceof RedirectErro) return e.url;
    throw e;
  }
}

describe("ABAS (1.2)", () => {
  it("cinco abas na ordem, com rótulos e segmentos", () => {
    expect(ABAS.map((a) => [a.rotulo, a.segmento])).toEqual([
      ["Resumo", null],
      ["Inscritos", "inscritos"],
      ["Frequência", "frequencia"],
      ["Encontros", "encontros"],
      ["Equipe e link", "equipe"],
    ]);
  });
});

describe("carregarTurmaDaAba (9.1, 9.2)", () => {
  it("coordenação e catequista responsável passam", async () => {
    const turmaId = await criarTurmaDireta();
    const ana = await criarUsuarioDireto("Ana");
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await designar(turmaId, ana);

    logado = sessao(coord, "coordenacao");
    await expect(carregarTurmaDaAba("coordenacao", turmaId, "/x")).resolves.toBe(logado);
    logado = sessao(ana, "catequista");
    await expect(carregarTurmaDaAba("catequista", turmaId, "/x")).resolves.toBe(logado);
  });

  it("catequista de outra turma vai a /acesso-negado sem ler dados da turma", async () => {
    const turmaId = await criarTurmaDireta();
    const outra = await criarUsuarioDireto("Bia");
    logado = sessao(outra, "catequista");
    const turma = vi.spyOn(prisma.turma, "findUnique");
    const fichas = vi.spyOn(prisma.fichaAutocadastro, "groupBy");

    expect(await destino(carregarTurmaDaAba("catequista", turmaId, "/x"))).toBe("/acesso-negado");
    expect(turma).not.toHaveBeenCalled();
    expect(fichas).not.toHaveBeenCalled();
  });

  it("id inválido nega sem lançar erro inesperado", async () => {
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    logado = sessao(coord, "coordenacao");
    expect(await destino(carregarTurmaDaAba("coordenacao", "nao-uuid", "/x"))).toBe(
      "/acesso-negado",
    );
  });
});

describe("cabecalhoDaTurma (1.1, 1.2)", () => {
  it("devolve nome, situação e contagem de pendentes", async () => {
    const turmaId = await criarTurmaDireta({ nome: "Turma Aberta" });
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await criarLink(turmaId, "tok-cab", coord);
    const link = await prisma.linkAutocadastro.findFirstOrThrow({ where: { turmaId } });
    const c = await prisma.catequizando.create({
      data: {
        nome: "Ana",
        dataNascimento: dia("2015-01-01"),
        telefone: "11987654321",
        estado: "pendente",
      },
      select: { id: true },
    });
    await prisma.fichaAutocadastro.create({
      data: {
        catequizandoId: c.id,
        turmaId,
        linkId: link.id,
        consentidoEm: new Date(),
        versaoConsentimento: "v1",
      },
    });
    expect(await cabecalhoDaTurma(turmaId)).toEqual({
      nome: "Turma Aberta",
      encerrada: false,
      pendentes: 1,
    });

    const encerrada = await criarTurmaDireta({ nome: "Turma Velha", encerradaEm: "2026-06-01" });
    expect(await cabecalhoDaTurma(encerrada)).toEqual({
      nome: "Turma Velha",
      encerrada: true,
      pendentes: 0,
    });
  });

  it("turma inexistente ou id inválido devolve null", async () => {
    expect(await cabecalhoDaTurma("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await cabecalhoDaTurma("nao-uuid")).toBeNull();
  });
});

describe("avisoDaTurma (8.7)", () => {
  it("traduz códigos de turmas e de autocadastro", () => {
    expect(avisoDaTurma("link-gerado")).toBe("Link gerado.");
    expect(avisoDaTurma("ficha-confirmada")).toBe("Ficha confirmada e inscrita na turma");
    expect(avisoDaTurma("inscrito")).toEqual(expect.any(String));
  });

  it("desconhecido, vazio e array viram null", () => {
    expect(avisoDaTurma("qualquer-coisa")).toBeNull();
    expect(avisoDaTurma("")).toBeNull();
    expect(avisoDaTurma(undefined)).toBeNull();
    expect(avisoDaTurma(["link-gerado"])).toBeNull();
  });
});
