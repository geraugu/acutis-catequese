import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { PaginaChamada } from "@/app/(interno)/_presenca/paginas";
import { adicionarVisitante } from "@/modules/presenca/repositorio";
import { criarUsuarioDireto } from "../turmas/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
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

const sessao = (userId: string): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel: "catequista",
});

async function html(userId: string, turmaId: string, encontroId: string): Promise<string> {
  return renderToStaticMarkup(
    await PaginaChamada({
      sessao: sessao(userId),
      papel: "catequista",
      turmaId,
      encontroId,
      aviso: undefined,
    }),
  );
}

/** Turma visitada com um inscrito e um encontro planejado com tema; Davi vem de outra turma. */
async function cenario(comReserva = true) {
  const resp = await criarUsuarioDireto("Ana");
  const visitada = await criarTurmaDireta({ nome: "Turma Sábado" });
  await designar(visitada, resp);
  const origem = await criarTurmaDireta({ nome: "Turma Quarta" });
  const tema = await criarTemaDireto("A Criação");
  const maria = await criarCatequizandoDireto({ nome: "Maria Souza" });
  await criarInscricaoDireta(visitada, maria, { dataEntrada: "2019-01-01" });
  const davi = await criarCatequizandoDireto({ nome: "Davi Reposição" });
  await criarInscricaoDireta(origem, davi, { dataEntrada: "2019-01-01" });
  const encontro = await criarEncontroDireto(visitada, {
    data: "2020-03-07",
    temaId: tema,
    situacao: "planejado",
  });
  if (comReserva) {
    await criarReservaDireta({
      catequizandoId: davi,
      temaId: tema,
      encontroId: encontro,
      turmaOrigemId: origem,
    });
  }
  return { resp, visitada, origem, tema, davi, encontro };
}

describe("PaginaChamada com reservas (5.1, 5.2, 5.3)", () => {
  it("mostra o bloco com o nome e a turma de origem, separado dos inscritos", async () => {
    const c = await cenario();
    const h = await html(c.resp, c.visitada, c.encontro);
    expect(h).toContain("Reposições reservadas");
    expect(h).toContain("Davi Reposição");
    expect(h).toContain("Turma de origem: Turma Quarta");
    expect(h).toContain("Confirmar presente");
    expect(h).toContain("Marcar ausência");
    expect(h).toContain("Maria Souza");
  });

  it("sem reserva a página não mostra o bloco", async () => {
    const c = await cenario(false);
    const h = await html(c.resp, c.visitada, c.encontro);
    expect(h).not.toContain("Reposições reservadas");
    expect(h).toContain("Salvar chamada");
  });

  it("confirmar presente move o catequizando para os visitantes e resolve a reserva", async () => {
    const c = await cenario();
    expect(await adicionarVisitante({ encontroId: c.encontro, turmaId: c.visitada }, c.davi)).toBe(
      "ok",
    );
    const h = await html(c.resp, c.visitada, c.encontro);
    expect(h).toContain("Compareceu");
    expect(h).not.toContain("Confirmar presente");
    expect(h).toContain("Visitante");
    expect(h).toContain("Davi Reposição");
  });

  it("reserva cancelada não aparece no bloco", async () => {
    const c = await cenario(false);
    await criarReservaDireta({
      catequizandoId: c.davi,
      temaId: c.tema,
      encontroId: c.encontro,
      turmaOrigemId: c.origem,
      situacao: "cancelada",
    });
    const h = await html(c.resp, c.visitada, c.encontro);
    expect(h).not.toContain("Reposições reservadas");
  });
});
