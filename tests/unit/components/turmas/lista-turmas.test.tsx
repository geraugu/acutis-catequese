// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListaTurmas } from "@/components/turmas/lista-turmas";
import type { TurmaResumo } from "@/modules/turmas/repositorio";

const turma = (id: string, nome: string): TurmaResumo => ({
  id,
  nome,
  ciclo: 1,
  diaSemana: "sabado",
  horario: "09:00",
  local: null,
  encerrada: false,
  catequistas: [],
  inscritosVigentes: 0,
  vagas: null,
});

describe("ListaTurmas — destaques", () => {
  it("mostra o destaque com link só na turma indicada", () => {
    render(
      <ListaTurmas
        turmas={[turma("t1", "Turma A"), turma("t2", "Turma B")]}
        base="/catequista/turmas"
        destaques={{ t2: { texto: "1 ficha pendente", href: "/catequista/turmas/t2/pendentes" } }}
      />,
    );
    const links = screen.getAllByRole("link", { name: "1 ficha pendente" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/catequista/turmas/t2/pendentes");
    const itens = screen.getAllByRole("listitem");
    expect(itens[0]).not.toHaveTextContent(/pendente/);
    expect(itens[1]).toHaveTextContent("1 ficha pendente");
  });

  it("sem destaques não mostra nada a mais", () => {
    render(<ListaTurmas turmas={[turma("t1", "Turma A")]} base="/x" />);
    expect(screen.queryByText(/pendente/)).toBeNull();
  });
});
