import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { criarUsuarioDireto } from "../turmas/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers";

class RedirectErro extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT;${url}`);
  }
}
class NaoEncontradoErro extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectErro(url);
  },
  notFound: () => {
    throw new NaoEncontradoErro("NEXT_NOT_FOUND");
  },
}));

// A sessão simulada: cada teste define quem está logado antes de renderizar a página.
let logado: SessaoUsuario;
vi.mock("@/modules/auth/dal", () => ({
  requireRole: async (papeis: string[]) => {
    if (!papeis.includes(logado.papel)) throw new Error("papel inválido");
    return logado;
  },
}));

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

type Busca = Record<string, string | string[] | undefined>;

async function paginaTurma(papel: "coordenacao" | "catequista", id: string, busca: Busca = {}) {
  const mod =
    papel === "coordenacao"
      ? await import("@/app/(interno)/coordenacao/turmas/[id]/page")
      : await import("@/app/(interno)/catequista/turmas/[id]/page");
  const el = await mod.default({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(busca),
  });
  return renderToStaticMarkup(el);
}

/** Nome do primeiro item da lista de frequência (a ordem do bloco, não a da lista de inscritos). */
function primeiroNaLista(h: string): string {
  const lista = h.slice(h.indexOf('class="presenca-inscritos"'));
  return /<a [^>]*>([^<]+)<\/a>/.exec(lista)?.[1] ?? "";
}

async function paginaFicha(papel: "coordenacao" | "catequista", id: string) {
  const mod =
    papel === "coordenacao"
      ? await import("@/app/(interno)/coordenacao/catequizandos/[id]/page")
      : await import("@/app/(interno)/catequista/catequizandos/[id]/page");
  const props = { params: Promise.resolve({ id }), searchParams: Promise.resolve({}) };
  return renderToStaticMarkup(await mod.default(props));
}

async function cenario() {
  const resp = await criarUsuarioDireto("Ana");
  const outro = await criarUsuarioDireto("Bia");
  const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  const turmaId = await criarTurmaDireta();
  await designar(turmaId, resp);
  const maria = await criarCatequizandoDireto({ nome: "Ana Souza" });
  const joao = await criarCatequizandoDireto({ nome: "João Lima" });
  await criarInscricaoDireta(turmaId, maria, { dataEntrada: "2019-01-01" });
  await criarInscricaoDireta(turmaId, joao, { dataEntrada: "2019-01-01" });
  const tema = await criarTemaDireto("A criação");
  const passado = await criarEncontroDireto(turmaId, {
    data: "2020-03-07",
    temaId: tema,
    situacao: "realizado",
  });
  await criarPresencaDireta({
    encontroId: passado,
    turmaId,
    catequizandoId: maria,
    status: "presente",
  });
  await criarPresencaDireta({
    encontroId: passado,
    turmaId,
    catequizandoId: joao,
    status: "ausente",
  });
  return { resp, outro, coord, turmaId, maria, joao };
}

describe("páginas da turma com frequência (2.8, 5.5, 6.2)", () => {
  it("mostra o encontro de hoje destacado e a frequência da turma nos dois papéis", async () => {
    const c = await cenario();
    const hoje = await criarEncontroDireto(c.turmaId, { data: hojeCivil() });
    for (const [id, papel] of [
      [c.coord, "coordenacao"],
      [c.resp, "catequista"],
    ] as const) {
      logado = sessao(id, papel);
      const h = await paginaTurma(papel, c.turmaId);
      expect(h).toContain("Encontro de hoje");
      expect(h).toContain(`href="/${papel}/turmas/${c.turmaId}/encontros/${hoje}/chamada"`);
      expect(h).toContain("Frequência");
      expect(h).toContain("Ana Souza");
      expect(h).toContain(`href="/${papel}/catequizandos/${c.maria}"`);
      expect(h).toContain("1 em baixa frequência");
    }
  });

  it("sem encontro hoje não mostra a chamada de hoje", async () => {
    const c = await cenario();
    logado = sessao(c.coord, "coordenacao");
    const h = await paginaTurma("coordenacao", c.turmaId);
    expect(h).not.toContain("Encontro de hoje");
  });

  it("ordena por ?ordem=frequencia (menor primeiro) e cai em nome para valores inválidos", async () => {
    const c = await cenario();
    logado = sessao(c.coord, "coordenacao");
    const porFreq = await paginaTurma("coordenacao", c.turmaId, { ordem: "frequencia" });
    expect(primeiroNaLista(porFreq)).toBe("João Lima");
    expect(porFreq).toContain(`/coordenacao/turmas/${c.turmaId}?ordem=nome`);
    const porNome = await paginaTurma("coordenacao", c.turmaId, { ordem: "qualquer" });
    expect(primeiroNaLista(porNome)).toBe("Ana Souza");
    const emLista = await paginaTurma("coordenacao", c.turmaId, { ordem: ["frequencia"] });
    expect(primeiroNaLista(emLista)).toBe("João Lima");
  });

  it("turma encerrada mantém a frequência e não oferece a chamada de hoje (6.5)", async () => {
    const c = await cenario();
    const enc = await criarTurmaDireta({ nome: "Turma Velha", encerradaEm: "2021-01-01" });
    const m = await criarCatequizandoDireto({ nome: "Pedro Antigo" });
    await criarInscricaoDireta(enc, m, { dataEntrada: "2019-01-01", dataSaida: "2021-01-01" });
    await criarEncontroDireto(enc, { data: hojeCivil() });
    logado = sessao(c.coord, "coordenacao");
    const h = await paginaTurma("coordenacao", enc);
    expect(h).toContain("Pedro Antigo");
    expect(h).not.toContain("Encontro de hoje");
  });
});

describe("fichas do catequizando com frequência (5.5, 5.6, 8.2)", () => {
  it("mostra frequência por turma, presenças e progresso para a coordenação e o catequista da turma", async () => {
    const c = await cenario();
    for (const [id, papel] of [
      [c.coord, "coordenacao"],
      [c.resp, "catequista"],
    ] as const) {
      logado = sessao(id, papel);
      const h = await paginaFicha(papel, c.maria);
      expect(h).toContain("Frequência por turma");
      expect(h).toContain("Turma São José");
      expect(h).toContain("Presenças");
      expect(h).toContain("Progresso no programa");
      expect(h).toContain("A criação");
    }
  });

  it("o catequista de outra turma não vê a ficha nem o bloco de frequência", async () => {
    const c = await cenario();
    logado = sessao(c.outro, "catequista");
    await expect(paginaFicha("catequista", c.maria)).rejects.toMatchObject({
      url: "/acesso-negado",
    });
  });
});
