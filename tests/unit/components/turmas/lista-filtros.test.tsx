// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FiltrosTurmas } from "@/components/turmas/filtros-turmas";
import { ListaTurmas } from "@/components/turmas/lista-turmas";
import type { TurmaResumo } from "@/modules/turmas/repositorio";

function turma(parcial: Partial<TurmaResumo>): TurmaResumo {
  return {
    id: "t1",
    nome: "Crisma A",
    ciclo: 2026,
    diaSemana: "quarta",
    horario: "19:30:00",
    local: "Sala 2",
    encerrada: false,
    catequistas: [{ id: "c1", nome: "Ana Souza" }],
    inscritosVigentes: 12,
    vagas: 20,
    ...parcial,
  };
}

describe("ListaTurmas", () => {
  it("mostra link com a base, ciclo, dia e horário, local, catequistas e ocupação", () => {
    render(<ListaTurmas turmas={[turma({})]} base="/catequista/turmas" />);
    const item = within(screen.getByRole("listitem"));
    expect(item.getByRole("link", { name: "Crisma A" })).toHaveAttribute(
      "href",
      "/catequista/turmas/t1",
    );
    expect(item.getByText("2026")).toBeInTheDocument();
    expect(item.getByText("Quarta-feira, 19:30")).toBeInTheDocument();
    expect(item.getByText("Sala 2")).toBeInTheDocument();
    expect(item.getByText("Ana Souza")).toBeInTheDocument();
    expect(item.getByText("12 de 20 vagas")).toBeInTheDocument();
    expect(item.queryByText("Lotada")).toBeNull();
    expect(item.queryByText("Encerrada")).toBeNull();
    expect(item.queryByText("Sem catequista")).toBeNull();
  });

  it("mostra inscritos sem vagas, Sem catequista e Lotada nas condições certas", () => {
    render(
      <ListaTurmas
        base="/coordenacao/turmas"
        turmas={[
          turma({ id: "a", nome: "A", catequistas: [], vagas: null, inscritosVigentes: 7 }),
          turma({ id: "b", nome: "B", inscritosVigentes: 20, vagas: 20 }),
        ]}
      />,
    );
    const [a, b] = screen.getAllByRole("listitem").map((i) => within(i));
    expect(a.getByText("Sem catequista")).toBeInTheDocument();
    expect(a.getByText("7 inscritos")).toBeInTheDocument();
    expect(a.queryByText("Lotada")).toBeNull();
    expect(b.getByText("Lotada")).toBeInTheDocument();
    expect(b.getByText("20 de 20 vagas")).toBeInTheDocument();
  });

  it("turma encerrada sem catequista mostra Encerrada e não Sem catequista", () => {
    render(
      <ListaTurmas
        base="/coordenacao/turmas"
        turmas={[turma({ encerrada: true, catequistas: [], local: null })]}
      />,
    );
    const item = within(screen.getByRole("listitem"));
    expect(item.getByText("Encerrada")).toBeInTheDocument();
    expect(item.queryByText("Sem catequista")).toBeNull();
  });
});

describe("FiltrosTurmas", () => {
  it("é um form GET com selects rotulados e pré-selecionados", () => {
    const { container } = render(
      <FiltrosTurmas situacao="encerradas" ciclo={2025} ciclos={[2026, 2025]} />,
    );
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByLabelText("Situação")).toHaveValue("encerradas");
    const ciclo = screen.getByLabelText("Ciclo");
    expect(ciclo).toHaveValue("2025");
    expect(
      within(ciclo)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["2026", "2025", "Todos"]);
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeInTheDocument();
  });

  it("pré-seleciona todos os ciclos", () => {
    render(<FiltrosTurmas situacao="todas" ciclo="todos" ciclos={[2026]} />);
    expect(screen.getByLabelText("Situação")).toHaveValue("todas");
    expect(screen.getByLabelText("Ciclo")).toHaveValue("todos");
  });
});
