import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { designar } from "@/modules/turmas/repositorio";
import { salvarLimite } from "@/modules/presenca/repositorio";
import { PaginaFrequencia } from "@/app/(interno)/_presenca/paginas";
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

async function html(
  s: SessaoUsuario,
  papel: "coordenacao" | "catequista",
  aviso?: string,
): Promise<string> {
  return renderToStaticMarkup(await PaginaFrequencia({ sessao: s, papel, aviso }));
}

/** Catequizando com 3 chamadas na turma: 2 presenças e 1 falta (67%). */
async function comFrequencia(
  turmaId: string,
  nome: string,
  estado?: "ativo" | "inativo",
  mes = "03",
) {
  const id = await criarCatequizandoDireto({ nome, estado });
  await criarInscricaoDireta(turmaId, id, { dataEntrada: "2019-01-01" });
  for (const [i, status] of (["presente", "presente", "ausente"] as const).entries()) {
    const enc = await criarEncontroDireto(turmaId, {
      data: `2020-${mes}-0${i + 1}`,
      situacao: "realizado",
    });
    await criarPresencaDireta({ encontroId: enc, turmaId, catequizandoId: id, status });
  }
  return id;
}

async function cenario() {
  const resp = await criarUsuarioDireto("Ana");
  const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  const minha = await criarTurmaDireta({ nome: "Turma Minha" });
  const alheia = await criarTurmaDireta({ nome: "Turma Alheia" });
  await designar(minha, resp);
  const maria = await comFrequencia(minha, "Maria Souza");
  const pedro = await comFrequencia(alheia, "Pedro Alheio");
  await salvarLimite(70);
  return { resp, coord, minha, alheia, maria, pedro };
}

describe("PaginaFrequencia (1.2, 7.6, 7.7, 7.10, 7.11, 10.1)", () => {
  it("coordenação vê os alertas de todas as turmas abertas e o formulário com o limite atual", async () => {
    const c = await cenario();
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao");
    expect(h).toContain("Frequência");
    expect(h).toContain("Limite de frequência: 70%");
    expect(h).toContain("Maria Souza");
    expect(h).toContain("Pedro Alheio");
    expect(h).toContain("Turma Minha");
    expect(h).toContain("Turma Alheia");
    expect(h).toContain(`href="/coordenacao/catequizandos/${c.maria}"`);
    expect(h).toContain("<form");
    expect(h).toContain('value="70"');
  });

  it("catequista vê só as suas turmas e nenhum formulário (7.7)", async () => {
    const c = await cenario();
    const h = await html(sessao(c.resp, "catequista"), "catequista");
    expect(h).toContain("Maria Souza");
    expect(h).not.toContain("Pedro Alheio");
    expect(h).toContain(`href="/catequista/catequizandos/${c.maria}"`);
    expect(h).not.toContain("<form");
    expect(h).toContain("Limite de frequência: 70%");
  });

  it("o limite alterado vale na carga seguinte (7.11)", async () => {
    const c = await cenario();
    const s = sessao(c.coord, "coordenacao");
    await salvarLimite(60);
    const sem = await html(s, "coordenacao");
    expect(sem).toContain("Limite de frequência: 60%");
    expect(sem).not.toContain("Maria Souza");
    expect(sem).toContain("Nenhum catequizando em baixa frequência");
    await salvarLimite(67);
    const com = await html(s, "coordenacao");
    expect(com).toContain("Maria Souza");
    expect(com).toContain("67%");
  });

  it("turma encerrada e catequizando desligado ficam fora (9.3-9.5)", async () => {
    const c = await cenario();
    const encerrada = await criarTurmaDireta({ nome: "Turma Velha", encerradaEm: "2020-12-01" });
    await comFrequencia(encerrada, "Aluno Encerrado");
    await comFrequencia(c.minha, "Aluno Inativo", "inativo", "04");
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao");
    expect(h).not.toContain("Aluno Encerrado");
    expect(h).not.toContain("Aluno Inativo");
  });

  it("estado vazio: catequista sem turmas e sem alertas", async () => {
    const outra = await criarUsuarioDireto("Sem Turma");
    const h = await html(sessao(outra, "catequista"), "catequista");
    expect(h).toContain("Nenhum catequizando em baixa frequência");
    expect(h).not.toContain("<form");
  });

  it("exibe o aviso de ?aviso=limite-salvo (10.1)", async () => {
    const c = await cenario();
    const h = await html(sessao(c.coord, "coordenacao"), "coordenacao", "limite-salvo");
    expect(h).toContain('role="status"');
    expect(h).toContain("Limite salvo.");
  });
});
