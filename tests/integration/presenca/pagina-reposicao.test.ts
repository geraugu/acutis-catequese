import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { PaginaReposicao } from "@/app/(interno)/_presenca/paginas";
import { criarUsuarioDireto } from "../turmas/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroPlanejadoDireto,
  criarEncontroRealizadoDireto,
  criarInscricaoDireta,
  criarReservaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers-reposicao";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT;${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

async function html(
  s: SessaoUsuario,
  papel: "coordenacao" | "catequista",
  catequizandoId: string,
  aviso?: string,
) {
  return renderToStaticMarkup(await PaginaReposicao({ sessao: s, papel, catequizandoId, aviso }));
}

/** Catequizando na turma de origem com tema 1 trabalhado; destino planejado em outra turma. */
async function cenario() {
  const resp = await criarUsuarioDireto("Ana");
  const outro = await criarUsuarioDireto("Bia");
  const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  const origem = await criarTurmaDireta({ nome: "Turma Quarta" });
  const destino = await criarTurmaDireta({ nome: "Turma Sábado" });
  await designar(origem, resp);
  const tema = await criarTemaDireto("A Criação");
  const catequizando = await criarCatequizandoDireto({ nome: "Davi Souza" });
  await criarInscricaoDireta(origem, catequizando, { dataEntrada: "2019-01-01" });
  await criarEncontroRealizadoDireto(origem, tema, "2026-09-05");
  const encontro = await criarEncontroPlanejadoDireto(destino, tema, "2099-03-07");
  return { resp, outro, coord, origem, destino, tema, catequizando, encontro };
}

describe("PaginaReposicao (1.1 a 1.4, 2.1, 3.1, 3.6, 6.4)", () => {
  it("coordenação abre a página de qualquer catequizando, com tema e opção", async () => {
    const c = await cenario();
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao", c.catequizando);
    expect(h).toContain("O que falta");
    expect(h).toContain("Davi Souza");
    expect(h).toContain("A Criação");
    expect(h).toContain("Turma Sábado");
    expect(h).toContain("Reservar");
    expect(h).toContain(`href="/coordenacao/catequizandos/${c.catequizando}"`);
  });

  it("catequista da turma de origem abre a página", async () => {
    const c = await cenario();
    const h = await html(sessao(c.resp, "catequista"), "catequista", c.catequizando);
    expect(h).toContain("A Criação");
    expect(h).toContain(`href="/catequista/catequizandos/${c.catequizando}"`);
  });

  it("catequista de fora é enviado a acesso negado, sem dados do catequizando", async () => {
    const c = await cenario();
    await expect(html(sessao(c.outro, "catequista"), "catequista", c.catequizando)).rejects.toThrow(
      "NEXT_REDIRECT;/acesso-negado",
    );
  });

  it("id inexistente ou malformado não revela nada", async () => {
    const c = await cenario();
    await expect(
      html(sessao(c.coord, "coordenacao"), "coordenacao", "00000000-0000-4000-8000-000000000000"),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(html(sessao(c.coord, "coordenacao"), "coordenacao", "../x")).rejects.toThrow(
      "NEXT_REDIRECT;/acesso-negado",
    );
  });

  it("mostra a reserva em destaque no lugar das opções e o histórico", async () => {
    const c = await cenario();
    await criarReservaDireta({
      catequizandoId: c.catequizando,
      temaId: c.tema,
      encontroId: c.encontro,
      turmaOrigemId: c.origem,
    });
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao", c.catequizando);
    expect(h).toContain("Cancelar reserva");
    expect(h).not.toContain("Reservar</button>");
    expect(h).toContain("Histórico de reservas");
    expect(h).toContain("Reservada");
  });

  it("exibe o aviso de ?aviso=reserva-criada", async () => {
    const c = await cenario();
    const h = await html(
      sessao(c.coord, "coordenacao"),
      "coordenacao",
      c.catequizando,
      "reserva-criada",
    );
    expect(h).toContain("Reposição reservada.");
  });

  it("catequizando sem turma de origem recebe o estado vazio", async () => {
    const c = await cenario();
    const solto = await criarCatequizandoDireto({ nome: "Sem Turma" });
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao", solto);
    expect(h).toContain("Sem turma de origem");
  });
});
