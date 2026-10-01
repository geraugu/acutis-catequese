// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/programa/actions", () => ({
  moverTemaAction: vi.fn(async () => {}),
  desativarTemaAction: vi.fn(async () => ({})),
  reativarTemaAction: vi.fn(async () => ({})),
  excluirTemaAction: vi.fn(async () => ({})),
}));

import { ListaTemas } from "@/components/programa/lista-temas";

const temas = [
  {
    id: "a",
    titulo: "Criação",
    descricao: "Deus cria",
    ativo: true,
    posicao: 1,
    encontros: 3,
    numero: 1,
  },
  { id: "b", titulo: "Aliança", descricao: null, ativo: true, posicao: 2, encontros: 1, numero: 2 },
  {
    id: "c",
    titulo: "Profetas",
    descricao: null,
    ativo: true,
    posicao: 3,
    encontros: 0,
    numero: 3,
  },
  {
    id: "d",
    titulo: "Antigo",
    descricao: null,
    ativo: false,
    posicao: 4,
    encontros: 0,
    numero: null,
  },
];

function item(titulo: string) {
  return screen.getByText(titulo, { selector: ".lista-temas-titulo" }).closest("li")!;
}

describe("ListaTemas", () => {
  it("mostra numeração, selo Desativado, descrição e contagem de encontros", () => {
    render(<ListaTemas temas={temas} gestao />);
    expect(within(item("Criação")).getByText("1.")).toBeInTheDocument();
    expect(within(item("Criação")).getByText("Deus cria")).toBeInTheDocument();
    expect(within(item("Criação")).getByText("3 encontros")).toBeInTheDocument();
    expect(within(item("Aliança")).getByText("2.")).toBeInTheDocument();
    expect(within(item("Aliança")).getByText("1 encontro")).toBeInTheDocument();
    expect(within(item("Profetas")).getByText("Nenhum encontro")).toBeInTheDocument();
    expect(within(item("Antigo")).getByText("Desativado")).toHaveClass(
      "situacao",
      "situacao-inativo",
    );
  });

  it("com gestão: links, Subir/Descer desabilitados nos limites e Editar", () => {
    render(<ListaTemas temas={temas} gestao />);
    expect(screen.getByRole("link", { name: "Criação" })).toHaveAttribute(
      "href",
      "/coordenacao/programa/a",
    );
    expect(screen.getByRole("button", { name: "Subir Criação" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descer Criação" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Subir Profetas" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Descer Profetas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Subir Aliança" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Subir Antigo" })).toBeNull();
    expect(screen.getByRole("link", { name: "Editar Criação" })).toHaveAttribute(
      "href",
      "/coordenacao/programa/a/editar",
    );
    expect(screen.getByRole("link", { name: "Editar Antigo" })).toHaveAttribute(
      "href",
      "/coordenacao/programa/d/editar",
    );
    expect(screen.queryByRole("button", { name: "Descer Antigo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reativar Antigo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar Criação" })).toBeInTheDocument();
  });

  it("sem gestão: nenhum link nem ação", () => {
    render(<ListaTemas temas={temas} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Criação")).toBeInTheDocument();
  });
});
