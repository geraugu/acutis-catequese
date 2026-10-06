import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
import { LayoutDaTurma } from "@/app/(interno)/_turma/layout-turma";
import { AbaFrequencia, AbaInscritos } from "@/app/(interno)/_turma/abas";
import { criarEncontroDireto } from "../programa/helpers";
import { criarPresencaDireta } from "../presenca/helpers";
import {
  criarCatequizandoDireto,
  criarTurmaDireta,
  criarUsuarioDireto,
  dia,
  inscreverDireto,
} from "./helpers";

class RedirectErro extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT;${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectErro(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useSelectedLayoutSegment: () => null,
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

describe("LayoutDaTurma (1.1, 1.6, 1.7, 9.1, 9.3, 9.5)", () => {
  async function html(papel: "coordenacao" | "catequista", turmaId: string) {
    const el = await LayoutDaTurma({
      papel,
      turmaId,
      children: createElement("p", null, "conteúdo da aba"),
    });
    return renderToStaticMarkup(el);
  }

  it("coordenação vê cabeçalho, barra com as cinco abas e o conteúdo", async () => {
    const turmaId = await criarTurmaDireta({ nome: "Turma Layout" });
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    logado = sessao(coord, "coordenacao");
    const h = await html("coordenacao", turmaId);
    expect(h).toContain("Turma Layout");
    expect(h).toContain("← Voltar para as turmas");
    for (const aba of ABAS) expect(h).toContain(aba.rotulo);
    expect(h).toContain(`href="/coordenacao/turmas/${turmaId}/equipe"`);
    expect(h).toContain("conteúdo da aba");
  });

  it("catequista responsável vê cabeçalho e barra do papel dele", async () => {
    const turmaId = await criarTurmaDireta({ nome: "Turma da Ana" });
    const ana = await criarUsuarioDireto("Ana");
    await designar(turmaId, ana);
    logado = sessao(ana, "catequista");
    const h = await html("catequista", turmaId);
    expect(h).toContain("Turma da Ana");
    expect(h).toContain("← Voltar para minhas turmas");
    expect(h).toContain(`href="/catequista/turmas/${turmaId}/inscritos"`);
  });

  it("mostra a contagem de pendentes na aba Equipe e link", async () => {
    const turmaId = await criarTurmaDireta();
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    await criarLink(turmaId, "tok-layout", coord);
    const link = await prisma.linkAutocadastro.findFirstOrThrow({ where: { turmaId } });
    const c = await prisma.catequizando.create({
      data: {
        nome: "Bia",
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
    logado = sessao(coord, "coordenacao");
    expect(await html("coordenacao", turmaId)).toContain("1 ficha pendente");
  });

  it("catequista de outra turma é negado antes de qualquer dado", async () => {
    const turmaId = await criarTurmaDireta({ nome: "Turma Alheia" });
    const outra = await criarUsuarioDireto("Bia");
    logado = sessao(outra, "catequista");
    const fichas = vi.spyOn(prisma.fichaAutocadastro, "groupBy");
    expect(await destino(html("catequista", turmaId))).toBe("/acesso-negado");
    expect(fichas).not.toHaveBeenCalled();
  });

  it("turma inexistente vira não encontrada", async () => {
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    logado = sessao(coord, "coordenacao");
    await expect(html("coordenacao", "00000000-0000-4000-8000-000000000000")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});

describe("AbaInscritos (3.1 a 3.5, 8.7, 9.4)", () => {
  async function html(
    papel: "coordenacao" | "catequista",
    turmaId: string,
    extra: { termo?: string; aviso?: string | string[] } = {},
  ) {
    const el = await AbaInscritos({ papel, turmaId, aviso: extra.aviso, termo: extra.termo ?? "" });
    return renderToStaticMarkup(el);
  }

  async function turmaComInscritos(extra: { encerradaEm?: string } = {}) {
    const turmaId = await criarTurmaDireta(extra);
    const bia = await criarCatequizandoDireto("Bia Vigente");
    const caio = await criarCatequizandoDireto("Caio Anterior");
    await inscreverDireto(turmaId, bia, "2026-02-01");
    await inscreverDireto(turmaId, caio, "2026-02-01", {
      data: "2026-03-01",
      motivo: "desligamento",
    });
    return turmaId;
  }

  it("coordenação em turma aberta vê as duas listas, inscrever e desligar", async () => {
    const turmaId = await turmaComInscritos();
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const h = await html("coordenacao", turmaId);
    expect(h).toContain("Bia Vigente");
    expect(h).toContain("Inscritos anteriores");
    expect(h).toContain("Caio Anterior");
    expect(h).toContain("Inscrever catequizando");
    expect(h).toContain("Desligar");
  });

  it("a busca mostra os candidatos na própria aba", async () => {
    const turmaId = await criarTurmaDireta();
    await criarCatequizandoDireto("Zulmira Candidata");
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    expect(await html("coordenacao", turmaId)).not.toContain("Zulmira Candidata");
    const h = await html("coordenacao", turmaId, { termo: "Zulmira" });
    expect(h).toContain("Zulmira Candidata");
    expect(h).toContain('value="Zulmira"');
  });

  it("turma encerrada: coordenação só consulta", async () => {
    const turmaId = await turmaComInscritos({ encerradaEm: "2026-06-01" });
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const h = await html("coordenacao", turmaId, { termo: "Bia" });
    expect(h).toContain("Bia Vigente");
    expect(h).not.toContain("Inscrever catequizando");
    expect(h).not.toContain("Desligar");
  });

  it("catequista responsável só consulta, mesmo com turma aberta", async () => {
    const turmaId = await turmaComInscritos();
    const ana = await criarUsuarioDireto("Ana");
    await designar(turmaId, ana);
    logado = sessao(ana, "catequista");
    const h = await html("catequista", turmaId, { termo: "Bia" });
    expect(h).toContain("Bia Vigente");
    expect(h).toContain("Caio Anterior");
    expect(h).not.toContain("Inscrever catequizando");
    expect(h).not.toContain("Desligar");
  });

  it("catequista de outra turma é negado", async () => {
    const turmaId = await turmaComInscritos();
    logado = sessao(await criarUsuarioDireto("Bia"), "catequista");
    expect(await destino(html("catequista", turmaId))).toBe("/acesso-negado");
  });

  it("mostra a mensagem de aviso no topo", async () => {
    const turmaId = await criarTurmaDireta();
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const h = await html("coordenacao", turmaId, { aviso: "inscrito" });
    expect(h).toContain("Catequizando inscrito.");
    expect(h.indexOf("Catequizando inscrito.")).toBeLessThan(h.indexOf("Inscritos</h2>"));
  });
});

describe("AbaFrequencia (4.1 a 4.4, 8.7, 9.2)", () => {
  async function html(
    papel: "coordenacao" | "catequista",
    turmaId: string,
    ordem: "nome" | "frequencia" = "nome",
  ) {
    return renderToStaticMarkup(await AbaFrequencia({ papel, turmaId, aviso: undefined, ordem }));
  }

  // Ana presente 1 de 2 (50%); Bia presente 2 de 2 (100%).
  async function turmaComChamada(extra: { encerradaEm?: string } = {}) {
    const turmaId = await criarTurmaDireta(extra);
    const ana = await criarCatequizandoDireto("Ana Souza");
    const bia = await criarCatequizandoDireto("Bia Lima");
    await inscreverDireto(turmaId, ana, "2026-02-01");
    await inscreverDireto(turmaId, bia, "2026-02-01");
    const e1 = await criarEncontroDireto(turmaId, { data: "2026-03-07", situacao: "realizado" });
    const e2 = await criarEncontroDireto(turmaId, { data: "2026-03-14", situacao: "realizado" });
    for (const [enc, cat, status] of [
      [e1, ana, "presente"],
      [e2, ana, "ausente"],
      [e1, bia, "presente"],
      [e2, bia, "presente"],
    ] as const) {
      await criarPresencaDireta({ encontroId: enc, turmaId, catequizandoId: cat, status });
    }
    return turmaId;
  }

  it("mostra o percentual da turma, a quantidade em baixa e a lista", async () => {
    const turmaId = await turmaComChamada();
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const h = await html("coordenacao", turmaId);
    expect(h).toContain("75%");
    expect(h).toContain("em baixa frequência");
    expect(h).toContain("Ana Souza");
    expect(h).toContain("Bia Lima");
    expect(h).toContain("50%");
  });

  it("ordena por nome ou por menor frequência, com links da própria aba", async () => {
    const turmaId = await turmaComChamada();
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const base = `/coordenacao/turmas/${turmaId}/frequencia`;
    const porNome = await html("coordenacao", turmaId, "nome");
    expect(porNome.indexOf("Ana Souza")).toBeLessThan(porNome.indexOf("Bia Lima"));
    expect(porNome).toContain(`href="${base}?ordem=frequencia"`);
    expect(porNome).toContain(`href="${base}?ordem=nome"`);

    // Inverte a ordem: Bia (100%) antes de Ana só se ordenar por nome; por frequência, Ana (50%) vem primeiro.
    const porFreq = await html("coordenacao", turmaId, "frequencia");
    expect(porFreq.indexOf("Ana Souza")).toBeLessThan(porFreq.indexOf("Bia Lima"));
  });

  it("por menor frequência coloca quem frequenta menos antes, mesmo contra a ordem alfabética", async () => {
    const turmaId = await criarTurmaDireta();
    const ana = await criarCatequizandoDireto("Ana Alta");
    const zeca = await criarCatequizandoDireto("Zeca Baixo");
    await inscreverDireto(turmaId, ana, "2026-02-01");
    await inscreverDireto(turmaId, zeca, "2026-02-01");
    const e = await criarEncontroDireto(turmaId, { data: "2026-03-07", situacao: "realizado" });
    await criarPresencaDireta({ encontroId: e, turmaId, catequizandoId: ana });
    await criarPresencaDireta({
      encontroId: e,
      turmaId,
      catequizandoId: zeca,
      status: "ausente",
    });
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const h = await html("coordenacao", turmaId, "frequencia");
    expect(h.indexOf("Zeca Baixo")).toBeLessThan(h.indexOf("Ana Alta"));
  });

  it("sem chamada registrada mostra 'Sem encontros registrados'", async () => {
    const turmaId = await criarTurmaDireta();
    const ana = await criarCatequizandoDireto("Ana Souza");
    await inscreverDireto(turmaId, ana, "2026-02-01");
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    expect(await html("coordenacao", turmaId)).toContain("Sem encontros registrados");
  });

  it("turma encerrada continua consultável", async () => {
    const turmaId = await turmaComChamada({ encerradaEm: "2026-06-01" });
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const h = await html("coordenacao", turmaId);
    expect(h).toContain("Ana Souza");
    expect(h).toContain("75%");
  });

  it("catequista responsável consulta com links no próprio papel", async () => {
    const turmaId = await turmaComChamada();
    const ana = await criarUsuarioDireto("Ana");
    await designar(turmaId, ana);
    logado = sessao(ana, "catequista");
    const h = await html("catequista", turmaId);
    expect(h).toContain(`href="/catequista/turmas/${turmaId}/frequencia?ordem=frequencia"`);
  });

  it("catequista de outra turma é negado", async () => {
    const turmaId = await turmaComChamada();
    logado = sessao(await criarUsuarioDireto("Bia"), "catequista");
    expect(await destino(html("catequista", turmaId))).toBe("/acesso-negado");
  });

  it("mostra a mensagem de aviso no topo", async () => {
    const turmaId = await criarTurmaDireta();
    logado = sessao(await criarUsuarioDireto("Coord", { role: "coordenacao" }), "coordenacao");
    const el = await AbaFrequencia({
      papel: "coordenacao",
      turmaId,
      aviso: "inscrito",
      ordem: "nome",
    });
    const h = renderToStaticMarkup(el);
    expect(h.indexOf("Catequizando inscrito.")).toBeLessThan(h.indexOf("Frequência</h2>"));
  });
});
