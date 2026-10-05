import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { PaginaVisitantes } from "@/app/(interno)/_presenca/paginas";
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

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

type Papel = "coordenacao" | "catequista";

async function html(
  s: SessaoUsuario,
  papel: Papel,
  turmaId: string,
  encontroId: string,
  termo?: string,
  aviso?: string,
): Promise<string> {
  const el = await PaginaVisitantes({ sessao: s, papel, turmaId, encontroId, termo, aviso });
  return renderToStaticMarkup(el);
}

async function cenario(extra: { turma?: Parameters<typeof criarTurmaDireta>[0] } = {}) {
  const resp = await criarUsuarioDireto("Ana");
  const outro = await criarUsuarioDireto("Bia");
  const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  const turmaId = await criarTurmaDireta(extra.turma);
  await designar(turmaId, resp);
  const maria = await criarCatequizandoDireto({ nome: "Maria Souza" });
  await criarInscricaoDireta(turmaId, maria, { dataEntrada: "2019-01-01" });
  return { resp, outro, coord, turmaId, maria };
}

describe("PaginaVisitantes (4.1, 4.4, 4.9)", () => {
  it("mostra título, contexto, busca inicial e link de volta nos dois papéis", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", temaId: tema });
    for (const [id, papel] of [
      [c.resp, "catequista"],
      [c.coord, "coordenacao"],
    ] as const) {
      const h = await html(sessao(id, papel), papel, c.turmaId, enc);
      expect(h).toContain("Visitantes");
      expect(h).toContain("Turma São José");
      expect(h).toContain("Tema 1 — A criação");
      expect(h).toContain("Digite o nome para buscar em outras turmas.");
      expect(h).toContain("Nenhum visitante neste encontro.");
      expect(h).toContain(`href="/${papel}/turmas/${c.turmaId}/encontros/${enc}/chamada"`);
      expect(h).toContain("Voltar para a chamada");
    }
  });

  it("busca por termo mostra só nome e turma de origem, sem dados pessoais (4.2)", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", temaId: tema });
    const outraTurma = await criarTurmaDireta({ nome: "Turma Santa Rita" });
    const pedro = await criarCatequizandoDireto({ nome: "Pedro Alves" });
    await criarInscricaoDireta(outraTurma, pedro, { dataEntrada: "2019-01-01" });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId, enc, "Pedro");
    expect(h).toContain("Pedro Alves");
    expect(h).toContain("Turma de origem: Turma Santa Rita");
    expect(h).toContain("Adicionar Pedro Alves");
    expect(h).not.toContain("11999990000");
    expect(h).not.toContain("@");
    const vazio = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId, enc, "Zzzz");
    expect(vazio).toContain("Nenhum catequizando encontrado em outras turmas.");
  });

  it("lista visitantes atuais com remoção e mostra o aviso", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", temaId: tema });
    const outraTurma = await criarTurmaDireta({ nome: "Turma Santa Rita" });
    const pedro = await criarCatequizandoDireto({ nome: "Pedro Alves" });
    await criarInscricaoDireta(outraTurma, pedro, { dataEntrada: "2019-01-01" });
    await criarPresencaDireta({
      encontroId: enc,
      turmaId: c.turmaId,
      catequizandoId: pedro,
      visitante: true,
      turmaOrigemId: outraTurma,
    });
    const h = await html(
      sessao(c.resp, "catequista"),
      "catequista",
      c.turmaId,
      enc,
      undefined,
      "visitante-adicionado",
    );
    expect(h).toContain("Pedro Alves");
    expect(h).toContain("Remover Pedro Alves");
    expect(h).toContain("Visitante adicionado.");
  });

  it("encontro sem tema recusa com o motivo, sem busca nem formulários", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07" });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId, enc, "Pedro");
    expect(h).toContain("Visitantes só podem ser registrados em encontros com tema do programa.");
    expect(h).not.toContain('role="search"');
    expect(h).not.toContain("<form");
    expect(h).toContain("Voltar para a chamada");
  });

  it("turma encerrada recusa, mas lista os visitantes em leitura (4.4)", async () => {
    const c = await cenario({ turma: { encerradaEm: "2020-12-01" } });
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, {
      data: "2020-03-07",
      temaId: tema,
      situacao: "realizado",
    });
    const outraTurma = await criarTurmaDireta({ nome: "Turma Santa Rita" });
    const pedro = await criarCatequizandoDireto({ nome: "Pedro Alves" });
    await criarInscricaoDireta(outraTurma, pedro, { dataEntrada: "2019-01-01" });
    await criarPresencaDireta({
      encontroId: enc,
      turmaId: c.turmaId,
      catequizandoId: pedro,
      visitante: true,
      turmaOrigemId: outraTurma,
    });
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao", c.turmaId, enc);
    expect(h).toContain("Esta turma está encerrada e não pode ser alterada.");
    expect(h).toContain("Pedro Alves");
    expect(h).not.toContain("Remover Pedro Alves");
    expect(h).not.toContain("<form");
  });

  it("catequista de outra turma vai a /acesso-negado e encontro alheio dá notFound", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", temaId: tema });
    await expect(
      html(sessao(c.outro, "catequista"), "catequista", c.turmaId, enc),
    ).rejects.toMatchObject({
      url: "/acesso-negado",
    });
    const outraTurma = await criarTurmaDireta({ nome: "Outra" });
    await designar(outraTurma, c.resp);
    await expect(
      html(sessao(c.resp, "catequista"), "catequista", outraTurma, enc),
    ).rejects.toBeInstanceOf(NaoEncontradoErro);
  });
});
