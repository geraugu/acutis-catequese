import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { PaginaChamada } from "@/app/(interno)/_presenca/paginas";
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

async function html(
  s: SessaoUsuario,
  papel: "coordenacao" | "catequista",
  turmaId: string,
  encontroId: string,
  aviso?: string,
): Promise<string> {
  const el = await PaginaChamada({ sessao: s, papel, turmaId, encontroId, aviso });
  return renderToStaticMarkup(el);
}

async function cenario(extra: { turma?: Parameters<typeof criarTurmaDireta>[0] } = {}) {
  const resp = await criarUsuarioDireto("Ana");
  const outro = await criarUsuarioDireto("Bia");
  const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  const turmaId = await criarTurmaDireta(extra.turma);
  await designar(turmaId, resp);
  const maria = await criarCatequizandoDireto({ nome: "Maria Souza" });
  const joao = await criarCatequizandoDireto({ nome: "João Lima" });
  await criarInscricaoDireta(turmaId, maria, { dataEntrada: "2019-01-01" });
  await criarInscricaoDireta(turmaId, joao, { dataEntrada: "2019-01-01" });
  return { resp, outro, coord, turmaId, maria, joao };
}

describe("PaginaChamada (1.4, 2.1, 2.5, 2.7, 3.1, 3.5, 9.1, 10.1, 10.5)", () => {
  it("abre para o catequista responsável e para a coordenação, com o topo da página", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", temaId: tema });
    for (const [id, papel] of [
      [c.resp, "catequista"],
      [c.coord, "coordenacao"],
    ] as const) {
      const h = await html(sessao(id, papel), papel, c.turmaId, enc);
      expect(h).toContain("Fazer chamada");
      expect(h).toContain("Turma São José");
      expect(h).toContain("Tema 1 — A criação");
      expect(h).toContain("09:00");
      expect(h).toContain(`href="/${papel}/turmas/${c.turmaId}/encontros"`);
      expect(h).toContain("Maria Souza");
      expect(h).toContain("João Lima");
    }
  });

  it("catequista de outra turma vai a /acesso-negado (1.4)", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07" });
    await expect(
      PaginaChamada({
        sessao: sessao(c.outro, "catequista"),
        papel: "catequista",
        turmaId: c.turmaId,
        encontroId: enc,
        aviso: undefined,
      }),
    ).rejects.toMatchObject({ url: "/acesso-negado" });
  });

  it("encontro planejado até hoje lista os inscritos sem status (3.1)", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07" });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId, enc);
    expect(h).toContain("Sem tema do programa");
    expect(h).not.toMatch(/checked/);
    expect(h).toContain("Salvar chamada");
    expect(h).not.toContain("Adicionar visitante");
  });

  it("encontro realizado vem com os status preenchidos, em correção (3.5)", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, {
      data: "2020-03-07",
      temaId: tema,
      situacao: "realizado",
    });
    await criarPresencaDireta({ encontroId: enc, turmaId: c.turmaId, catequizandoId: c.maria });
    await criarPresencaDireta({
      encontroId: enc,
      turmaId: c.turmaId,
      catequizandoId: c.joao,
      status: "justificado",
    });
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao", c.turmaId, enc);
    expect(h).toContain("Corrigir chamada");
    expect(h).toContain('checked="" value="presente"');
    expect(h).toContain('checked="" value="justificado"');
    expect(h).toContain(`/coordenacao/turmas/${c.turmaId}/encontros/${enc}/chamada/visitantes`);
  });

  it("mostra visitantes e quem ainda não viu o tema (4.9, 8.5)", async () => {
    const c = await cenario();
    const tema = await criarTemaDireto("A criação");
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", temaId: tema });
    const outraTurma = await criarTurmaDireta({ nome: "Turma Maria" });
    const visita = await criarCatequizandoDireto({ nome: "Pedro Visita" });
    await criarInscricaoDireta(outraTurma, visita, { dataEntrada: "2019-01-01" });
    await criarPresencaDireta({
      encontroId: enc,
      turmaId: c.turmaId,
      catequizandoId: visita,
      visitante: true,
      turmaOrigemId: outraTurma,
    });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId, enc);
    expect(h).toContain("Pedro Visita");
    expect(h).toContain("Turma de origem: Turma Maria");
    expect(h).toContain("Ainda não viram: Tema 1 — A criação");
  });

  it("cancelado, data futura e turma encerrada mostram o motivo, sem formulário (2.5, 9.1)", async () => {
    const c = await cenario();
    const s = sessao(c.resp, "catequista");
    const cancelado = await criarEncontroDireto(c.turmaId, {
      data: "2020-03-07",
      situacao: "cancelado",
      motivoCancelamento: "Chuva",
    });
    const futuro = await criarEncontroDireto(c.turmaId, { data: "2099-03-07" });
    for (const [enc, msg] of [
      [cancelado, "Este encontro foi cancelado e não tem chamada."],
      [futuro, "A chamada só fica disponível a partir da data do encontro."],
    ] as const) {
      const h = await html(s, "catequista", c.turmaId, enc);
      expect(h).toContain(msg);
      expect(h).not.toContain("<form");
    }

    const enc = await cenario({ turma: { encerradaEm: "2020-12-01" } });
    const realizado = await criarEncontroDireto(enc.turmaId, {
      data: "2020-03-07",
      situacao: "realizado",
    });
    await criarPresencaDireta({
      encontroId: realizado,
      turmaId: enc.turmaId,
      catequizandoId: enc.maria,
      status: "ausente",
    });
    const h = await html(sessao(enc.coord, "coordenacao"), "coordenacao", enc.turmaId, realizado);
    expect(h).toContain("Esta turma está encerrada e não aceita chamada.");
    expect(h).not.toContain("<form");
    expect(h).toContain("Maria Souza");
    expect(h).toContain("Ausente");
  });

  it("aceita o aviso de sucesso de ?aviso= (10.1)", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07" });
    const h = await html(
      sessao(c.resp, "catequista"),
      "catequista",
      c.turmaId,
      enc,
      "chamada-salva",
    );
    expect(h).toContain('role="status"');
  });

  it("encontro de outra turma ou id inválido na URL resulta em não encontrado", async () => {
    const c = await cenario();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const enc = await criarEncontroDireto(outra, { data: "2020-03-07" });
    await expect(
      html(sessao(c.coord, "coordenacao"), "coordenacao", c.turmaId, enc),
    ).rejects.toBeInstanceOf(NaoEncontradoErro);
    await expect(
      html(sessao(c.coord, "coordenacao"), "coordenacao", c.turmaId, "x"),
    ).rejects.toBeInstanceOf(NaoEncontradoErro);
  });
});
