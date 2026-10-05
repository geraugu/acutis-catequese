// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FrequenciaTurma } from "@/components/presenca/frequencia-turma";
import type { ContagemFrequencia } from "@/modules/presenca/domain/frequencia";

function contagem(presentes: number, ausentes: number, justificados = 0): ContagemFrequencia {
  return { presentes, ausentes, justificados, total: presentes + ausentes + justificados };
}

const hrefOrdenar = (ordem: "nome" | "frequencia") => `/turma?ordem=${ordem}`;

function renderizar(
  itens: { catequizandoId: string; nome: string; contagem: ContagemFrequencia; href?: string }[],
  opcoes: { limite?: number; ordem?: "nome" | "frequencia" } = {},
) {
  return render(
    <FrequenciaTurma
      itens={itens}
      limite={opcoes.limite ?? 75}
      ordem={opcoes.ordem ?? "nome"}
      hrefOrdenar={hrefOrdenar}
    />,
  );
}

function nomesNaOrdem(): string[] {
  return screen
    .getAllByRole("listitem")
    .map((li) => li.querySelector(".presenca-inscrito-nome")!.textContent!);
}

describe("FrequenciaTurma", () => {
  it("mostra 'Sem encontros registrados' no lugar do percentual da turma e do catequizando (6.2, 5.4)", () => {
    renderizar([{ catequizandoId: "a", nome: "Ana", contagem: contagem(0, 0) }]);
    expect(screen.getAllByText("Sem encontros registrados")).toHaveLength(2);
    expect(screen.queryByText(/NaN|%/)).toBeNull();
    expect(screen.getByText("0 em baixa frequência")).toBeTruthy();
  });

  it("soma as contagens para o percentual da turma (6.2)", () => {
    renderizar([
      { catequizandoId: "a", nome: "Ana", contagem: contagem(3, 1) },
      { catequizandoId: "b", nome: "Bia", contagem: contagem(1, 3) },
    ]);
    expect(screen.getByText("50%", { selector: ".presenca-frequencia *" })).toBeTruthy();
  });

  it("não alerta quem está exatamente no limite: 3 de 4 com limite 75 (7.4)", () => {
    renderizar([{ catequizandoId: "a", nome: "Ana", contagem: contagem(3, 1) }]);
    expect(screen.queryByText("Baixa frequência")).toBeNull();
    expect(screen.getByText("0 em baixa frequência")).toBeTruthy();
  });

  it("alerta quando abaixo do limite sem arredondar: 2 de 3 com limite 67 aparece como 67% (7.4)", () => {
    renderizar([{ catequizandoId: "a", nome: "Ana", contagem: contagem(2, 1) }], { limite: 67 });
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("67%")).toBeTruthy();
    expect(within(item).getByText("Baixa frequência")).toBeTruthy();
  });

  it("o selo tem texto além da cor e ícone (7.9)", () => {
    renderizar([{ catequizandoId: "a", nome: "Ana", contagem: contagem(1, 3) }]);
    const selo = screen.getByText("Baixa frequência").closest(".presenca-selo-baixa")!;
    expect(selo.querySelector("svg")).toBeTruthy();
  });

  it("conta só os catequizandos em alerta (6.4)", () => {
    renderizar([
      { catequizandoId: "a", nome: "Ana", contagem: contagem(1, 3) },
      { catequizandoId: "b", nome: "Bia", contagem: contagem(4, 0) },
      { catequizandoId: "c", nome: "Caio", contagem: contagem(0, 0) },
      { catequizandoId: "d", nome: "Davi", contagem: contagem(0, 2) },
    ]);
    expect(screen.getByText("2 em baixa frequência")).toBeTruthy();
    expect(screen.getAllByText("Baixa frequência")).toHaveLength(2);
  });

  it("mostra as contagens e o link do nome quando há href (5.4)", () => {
    renderizar([
      { catequizandoId: "a", nome: "Ana", contagem: contagem(2, 1, 1), href: "/catequizandos/a" },
      { catequizandoId: "b", nome: "Bia", contagem: contagem(1, 0) },
    ]);
    expect(screen.getByText("2 presentes · 1 ausente · 1 justificado")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ana" }).getAttribute("href")).toBe("/catequizandos/a");
    expect(screen.queryByRole("link", { name: "Bia" })).toBeNull();
  });

  it("usa o singular quando N é 1", () => {
    renderizar([{ catequizandoId: "a", nome: "Ana", contagem: contagem(1, 1, 1) }]);
    expect(screen.getByText("1 presente · 1 ausente · 1 justificado")).toBeTruthy();
  });

  it("ordena por nome (5.5)", () => {
    renderizar(
      [
        { catequizandoId: "c", nome: "Caio", contagem: contagem(0, 0) },
        { catequizandoId: "a", nome: "Ana", contagem: contagem(1, 3) },
        { catequizandoId: "b", nome: "Bia", contagem: contagem(4, 0) },
      ],
      { ordem: "nome" },
    );
    expect(nomesNaOrdem()).toEqual(["Ana", "Bia", "Caio"]);
  });

  it("ordena por menor frequência com sem encontros por último (5.5)", () => {
    renderizar(
      [
        { catequizandoId: "c", nome: "Caio", contagem: contagem(0, 0) },
        { catequizandoId: "b", nome: "Bia", contagem: contagem(4, 0) },
        { catequizandoId: "a", nome: "Ana", contagem: contagem(1, 3) },
      ],
      { ordem: "frequencia" },
    );
    expect(nomesNaOrdem()).toEqual(["Ana", "Bia", "Caio"]);
  });

  it("oferece os dois links de ordenação, com o ativo em aria-current", () => {
    renderizar([{ catequizandoId: "a", nome: "Ana", contagem: contagem(1, 0) }], {
      ordem: "frequencia",
    });
    const porNome = screen.getByRole("link", { name: "Ordenar por nome" });
    const porFreq = screen.getByRole("link", { name: "Ordenar por menor frequência" });
    expect(porNome.getAttribute("href")).toBe("/turma?ordem=nome");
    expect(porFreq.getAttribute("href")).toBe("/turma?ordem=frequencia");
    expect(porFreq.getAttribute("aria-current")).toBe("true");
    expect(porNome.getAttribute("aria-current")).toBeNull();
  });

  it("mostra mensagem quando não há inscritos", () => {
    renderizar([]);
    expect(screen.getByText("Nenhum catequizando inscrito.")).toBeTruthy();
  });
});
