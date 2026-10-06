import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { criarLink } from "@/modules/autocadastro/repositorio";
import { PaginaEditarEncontro, PaginaNovoEncontro } from "@/app/(interno)/_encontros/paginas";
import { PaginaChamada, PaginaVisitantes } from "@/app/(interno)/_presenca/paginas";
import { PaginaFila, PaginaRevisao } from "@/app/(interno)/_pendentes/paginas";
import EditarTurmaPage from "@/app/(interno)/coordenacao/turmas/[id]/editar/page";
import { criarEncontroDireto } from "../programa/helpers";
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
  requireSession: async () => logado,
}));

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

const html = (el: unknown) =>
  renderToStaticMarkup(el as Parameters<typeof renderToStaticMarkup>[0]);

/** Links de volta: texto e destino certos, sem cabeçalho da turma nem barra de abas (7.1, 7.2, 7.3). */
function semMoldura(h: string) {
  expect(h).not.toContain("abas-turma");
  expect(h).not.toContain("Voltar para as turmas");
  expect(h).not.toContain("Voltar para minhas turmas");
}

function link(h: string, texto: string, href: string) {
  expect(h).toContain(`href="${href}">${texto}</a>`);
}

async function ficha(turmaId: string, coord: string): Promise<string> {
  await criarLink(turmaId, "tok-volta", coord);
  const l = await prisma.linkAutocadastro.findFirstOrThrow({ where: { turmaId } });
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
      linkId: l.id,
      consentidoEm: new Date(),
      versaoConsentimento: "v1",
    },
  });
  return c.id;
}

describe("links de volta das páginas de tarefa (7.1, 7.2, 7.3)", () => {
  it("encontros e chamada voltam para Encontros; visitantes volta para a chamada", async () => {
    const turmaId = await criarTurmaDireta();
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    const ana = await criarUsuarioDireto("Ana");
    await designar(turmaId, ana);
    const enc = await criarEncontroDireto(turmaId, { data: "2020-03-07" });

    for (const [id, papel] of [
      [coord, "coordenacao"],
      [ana, "catequista"],
    ] as const) {
      const s = sessao(id, papel);
      logado = s;
      const base = `/${papel}/turmas/${turmaId}/encontros`;

      const chamada = html(
        await PaginaChamada({ sessao: s, papel, turmaId, encontroId: enc, aviso: undefined }),
      );
      link(chamada, "← Voltar para Encontros", base);
      semMoldura(chamada);

      const novo = html(await PaginaNovoEncontro({ sessao: s, papel, turmaId }));
      link(novo, "← Voltar para Encontros", base);
      semMoldura(novo);

      const editar = html(
        await PaginaEditarEncontro({ sessao: s, papel, turmaId, encontroId: enc }),
      );
      link(editar, "← Voltar para Encontros", base);
      semMoldura(editar);

      const visitantes = html(
        await PaginaVisitantes({
          sessao: s,
          papel,
          turmaId,
          encontroId: enc,
          termo: undefined,
          aviso: undefined,
        }),
      );
      link(visitantes, "Voltar para a chamada", `${base}/${enc}/chamada`);
      expect(visitantes).not.toContain("Voltar para Encontros");
      semMoldura(visitantes);
    }
  });

  it("a fila volta para Equipe e link e a revisão volta para a fila", async () => {
    const turmaId = await criarTurmaDireta();
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    const ana = await criarUsuarioDireto("Ana");
    await designar(turmaId, ana);
    const fichaId = await ficha(turmaId, coord);

    for (const [id, area] of [
      [coord, "coordenacao"],
      [ana, "catequista"],
    ] as const) {
      logado = sessao(id, area);
      const base = `/${area}/turmas/${turmaId}`;

      const fila = html(await PaginaFila({ area, turmaId, aviso: undefined }));
      link(fila, "← Voltar para Equipe e link", `${base}/equipe`);
      expect(fila).not.toContain("Voltar para Turma São José");
      semMoldura(fila);

      const revisao = html(await PaginaRevisao({ area, turmaId, fichaId, aviso: undefined }));
      link(revisao, "← Voltar para as fichas pendentes", `${base}/pendentes`);
      semMoldura(revisao);
    }
  });

  it("a edição da turma volta para o Resumo", async () => {
    const turmaId = await criarTurmaDireta();
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    logado = sessao(coord, "coordenacao");

    const h = html(await EditarTurmaPage({ params: Promise.resolve({ id: turmaId }) }));
    link(h, "← Voltar para Resumo", `/coordenacao/turmas/${turmaId}`);
    semMoldura(h);
  });

  it("a edição da turma encerrada também volta para o Resumo", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-01" });
    const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
    logado = sessao(coord, "coordenacao");

    const h = html(await EditarTurmaPage({ params: Promise.resolve({ id: turmaId }) }));
    link(h, "← Voltar para Resumo", `/coordenacao/turmas/${turmaId}`);
  });
});
