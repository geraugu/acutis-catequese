import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { PaginaCronograma } from "@/app/(interno)/_encontros/paginas";
import { criarUsuarioDireto } from "../turmas/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarPresencaDireta,
  criarTurmaDireta,
} from "./helpers";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT;${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

function somaDias(data: string, n: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function html(
  s: SessaoUsuario,
  papel: "coordenacao" | "catequista",
  turmaId: string,
  aviso?: string,
) {
  const el = await PaginaCronograma({ sessao: s, papel, turmaId, aviso });
  return renderToStaticMarkup(el);
}

async function cenario(extra: Parameters<typeof criarTurmaDireta>[0] = {}) {
  const resp = await criarUsuarioDireto("Ana");
  const turmaId = await criarTurmaDireta(extra);
  await designar(turmaId, resp);
  return { resp, turmaId };
}

describe("PaginaCronograma — aba Encontros (5.1, 5.2, 5.3, 10.2)", () => {
  it("título 'Encontros' em h2, sem link de volta nem nome da turma no título (5.1)", async () => {
    const c = await cenario({ nome: "Turma Cronograma" });
    await criarEncontroDireto(c.turmaId, { data: somaDias(hojeCivil(), 3) });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).toContain("<h2>Encontros</h2>");
    expect(h).not.toContain("<h1");
    expect(h).not.toContain("Voltar para");
    expect(h).not.toContain("Encontros —");
    expect(h).not.toContain("Turma Cronograma");
  });

  it("mostra próximo encontro em destaque, progresso e ações do usuário (5.2)", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: somaDias(hojeCivil(), 3) });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).toContain("Próximo encontro");
    expect(h).toContain("Progresso no programa");
    expect(h).toContain("Novo encontro");
    expect(h).toContain(`href="/catequista/turmas/${c.turmaId}/encontros/novo"`);
    expect(h).toContain(`/catequista/turmas/${c.turmaId}/encontros/${enc}/editar`);
  });

  it("turma encerrada é só consulta: sem Novo encontro nem ações (5.3)", async () => {
    const c = await cenario({ encerradaEm: "2020-12-01" });
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", situacao: "realizado" });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).toContain("<h2>Encontros</h2>");
    expect(h).not.toContain("Novo encontro");
    expect(h).not.toContain(`/encontros/${enc}/editar`);
    expect(h).toContain('role="status"');
  });
});

describe("PaginaCronograma — chamada (2.8, 3.4, 6.3)", () => {
  it("encontro de hoje planejado tem 'Fazer chamada' com o href certo", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: hojeCivil() });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).toContain("Fazer chamada");
    expect(h).toContain(`href="/catequista/turmas/${c.turmaId}/encontros/${enc}/chamada"`);
  });

  it("realizado tem 'Corrigir chamada' e o resumo das contagens", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, {
      data: somaDias(hojeCivil(), -7),
      situacao: "realizado",
    });
    const a = await criarCatequizandoDireto({ nome: "Maria" });
    const b = await criarCatequizandoDireto({ nome: "João" });
    await criarInscricaoDireta(c.turmaId, a, { dataEntrada: "2019-01-01" });
    await criarInscricaoDireta(c.turmaId, b, { dataEntrada: "2019-01-01" });
    await criarPresencaDireta({ encontroId: enc, turmaId: c.turmaId, catequizandoId: a });
    await criarPresencaDireta({
      encontroId: enc,
      turmaId: c.turmaId,
      catequizandoId: b,
      status: "ausente",
    });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).toContain("Corrigir chamada");
    expect(h).toContain(`href="/catequista/turmas/${c.turmaId}/encontros/${enc}/chamada"`);
    expect(h).toContain("1 presente · 1 ausente · 0 justificados · 0 visitantes");
  });

  it("cancelado e data futura não têm link de chamada", async () => {
    const c = await cenario();
    await criarEncontroDireto(c.turmaId, {
      data: somaDias(hojeCivil(), -2),
      situacao: "cancelado",
    });
    await criarEncontroDireto(c.turmaId, { data: somaDias(hojeCivil(), 5) });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).not.toContain("Fazer chamada");
    expect(h).not.toContain("Corrigir chamada");
    expect(h).not.toContain("/chamada");
  });

  it("turma encerrada não tem link de chamada, mas mantém o resumo", async () => {
    const c = await cenario({ encerradaEm: "2020-12-01" });
    const enc = await criarEncontroDireto(c.turmaId, { data: "2020-03-07", situacao: "realizado" });
    const a = await criarCatequizandoDireto();
    await criarPresencaDireta({ encontroId: enc, turmaId: c.turmaId, catequizandoId: a });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).not.toContain("/chamada");
    expect(h).not.toContain("Corrigir chamada");
    expect(h).toContain("1 presente");
  });

  it("coordenação vê o link com o prefixo do próprio papel", async () => {
    const c = await cenario();
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    const enc = await criarEncontroDireto(c.turmaId, { data: hojeCivil() });
    const h = await html(sessao(coord, "coordenacao"), "coordenacao", c.turmaId);
    expect(h).toContain(`href="/coordenacao/turmas/${c.turmaId}/encontros/${enc}/chamada"`);
  });

  it("encontro reaberto (planejado) mantém presenças sem mostrar resumo (3.4)", async () => {
    const c = await cenario();
    const enc = await criarEncontroDireto(c.turmaId, { data: hojeCivil() });
    const a = await criarCatequizandoDireto();
    await criarPresencaDireta({ encontroId: enc, turmaId: c.turmaId, catequizandoId: a });
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.turmaId);
    expect(h).toContain("Fazer chamada");
    expect(h).not.toContain("presente ·");
  });

  describe("aviso do ?aviso= (2.3, 2.7)", () => {
    async function comAviso(aviso: string) {
      const c = await cenario();
      return html(sessao(c.resp, "catequista"), "catequista", c.turmaId, aviso);
    }

    it("mostra 'Chamada salva.' para chamada-salva", async () => {
      expect(await comAviso("chamada-salva")).toContain("Chamada salva.");
    });

    it("mostra 'Chamada atualizada.' para chamada-atualizada", async () => {
      expect(await comAviso("chamada-atualizada")).toContain("Chamada atualizada.");
    });

    it("mantém o aviso do programa (encontro-criado)", async () => {
      expect(await comAviso("encontro-criado")).toContain("Encontro criado.");
    });

    it("aviso desconhecido não renderiza mensagem de aviso", async () => {
      const h = await comAviso("xyz");
      expect(h).not.toContain('role="status"');
    });
  });
});
