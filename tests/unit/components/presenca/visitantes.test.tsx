// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/presenca/actions", () => ({}));

import { BuscaVisitante } from "@/components/presenca/busca-visitante";
import { ListaVisitantes } from "@/components/presenca/lista-visitantes";
import { SemTemaDoEncontro } from "@/components/presenca/sem-tema-do-encontro";

beforeAll(() => {
  // jsdom não implementa showModal/close do <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const visitantes = [{ catequizandoId: "v1", nome: "Davi", turmaOrigemNome: "Turma B" }];

describe("ListaVisitantes", () => {
  it("identifica o visitante com a turma de origem", () => {
    render(<ListaVisitantes visitantes={visitantes} remover={vi.fn(async () => ({}))} />);
    expect(screen.getByText("Davi")).toBeInTheDocument();
    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Turma de origem: Turma B")).toBeInTheDocument();
  });

  it("mostra o estado vazio", () => {
    render(<ListaVisitantes visitantes={[]} remover={vi.fn(async () => ({}))} />);
    expect(screen.getByText("Nenhum visitante neste encontro.")).toBeInTheDocument();
  });

  it("pede confirmação nomeando o visitante antes de remover", async () => {
    const remover = vi.fn(async () => ({}));
    render(<ListaVisitantes visitantes={visitantes} remover={remover} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover Davi" }));
    expect(remover).not.toHaveBeenCalled();
    expect(screen.getByText("Remover o visitante Davi?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    await vi.waitFor(() => expect(remover).toHaveBeenCalledWith("v1"));
  });
});

describe("BuscaVisitante", () => {
  const candidato = {
    catequizandoId: "c1",
    nome: "Elisa",
    turmaOrigemNome: "Turma C",
    // Campos extras não podem aparecer na tela (LGPD).
    telefone: "11999990000",
    email: "elisa@exemplo.com",
  };

  it("exibe só nome e turma de origem do candidato", () => {
    const { container } = render(
      <BuscaVisitante termo="Eli" candidatos={[candidato]} adicionar={vi.fn(async () => ({}))} />,
    );
    expect(screen.getByLabelText("Buscar catequizando pelo nome")).toHaveValue("Eli");
    expect(screen.getByText("Elisa")).toBeInTheDocument();
    expect(screen.getByText("Turma de origem: Turma C")).toBeInTheDocument();
    expect(container.textContent).not.toContain("11999990000");
    expect(container.textContent).not.toContain("elisa@exemplo.com");
  });

  it("mostra o estado vazio da busca e o estado inicial", () => {
    const adicionar = vi.fn(async () => ({}));
    const { rerender } = render(
      <BuscaVisitante termo="zz" candidatos={[]} adicionar={adicionar} />,
    );
    expect(
      screen.getByText("Nenhum catequizando encontrado em outras turmas."),
    ).toBeInTheDocument();
    rerender(<BuscaVisitante termo={null} candidatos={[]} adicionar={adicionar} />);
    expect(screen.queryByText(/Nenhum catequizando/)).not.toBeInTheDocument();
  });

  it("adiciona só depois de confirmar", async () => {
    const adicionar = vi.fn(async () => ({}));
    render(<BuscaVisitante termo="Eli" candidatos={[candidato]} adicionar={adicionar} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Elisa" }));
    expect(adicionar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    await vi.waitFor(() => expect(adicionar).toHaveBeenCalledWith("c1"));
  });
});

describe("SemTemaDoEncontro", () => {
  it("lista os inscritos que ainda não cumpriram o tema", () => {
    render(
      <SemTemaDoEncontro
        tema="Criação"
        inscritos={[
          { catequizandoId: "a", nome: "Ana" },
          { catequizandoId: "b", nome: "Bruno" },
        ]}
      />,
    );
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
  });

  it("informa quando todos já cumpriram", () => {
    render(<SemTemaDoEncontro tema="Criação" inscritos={[]} />);
    expect(screen.getByText("Todos os inscritos já cumpriram este tema.")).toBeInTheDocument();
  });
});
