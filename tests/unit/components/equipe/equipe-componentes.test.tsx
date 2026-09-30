// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Aviso } from "@/components/comum/aviso";
import { Paginacao } from "@/components/comum/paginacao";
import { BuscaEquipe } from "@/components/equipe/busca-equipe";
import { ListaMembros } from "@/components/equipe/lista-membros";
import { mensagemDeAviso } from "@/modules/equipe/mensagens";
import type { MembroResumo } from "@/modules/equipe/repositorio";

const membros: MembroResumo[] = [
  {
    id: "a1",
    nome: "Ana Souza",
    email: "ana@x.com",
    papel: "catequista",
    telefone: "11987654321",
    situacao: "ativo",
  },
  {
    id: "b2",
    nome: "Bruno Lima",
    email: "b@x.com",
    papel: "coordenacao",
    telefone: null,
    situacao: "inativo",
  },
];

describe("ListaMembros", () => {
  it("mostra nome como link, papel, telefone formatado e situação", () => {
    render(<ListaMembros membros={membros} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    const ana = within(itens[0]);
    expect(ana.getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      "/coordenacao/equipe/a1",
    );
    expect(ana.getByText("Catequista")).toBeInTheDocument();
    expect(ana.getByText("(11) 98765-4321")).toBeInTheDocument();
    expect(ana.getByText("Ativo")).toBeInTheDocument();
    const bruno = within(itens[1]);
    expect(bruno.getByText("—")).toBeInTheDocument();
    expect(bruno.getByText("Inativo")).toBeInTheDocument();
  });

  it("mostra estado vazio com Limpar busca", () => {
    render(<ListaMembros membros={[]} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("link", { name: "Limpar busca" })).toHaveAttribute(
      "href",
      "/coordenacao/equipe",
    );
  });
});

describe("BuscaEquipe", () => {
  it("é um form GET com rótulos e valores atuais", () => {
    render(<BuscaEquipe termo="ana" situacao="todos" />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/coordenacao/equipe");
    expect(screen.getByLabelText("Nome, e-mail ou telefone")).toHaveValue("ana");
    expect(screen.getByLabelText("Nome, e-mail ou telefone")).toHaveAttribute("name", "q");
    const sel = screen.getByLabelText("Situação");
    expect(sel).toHaveAttribute("name", "situacao");
    expect(sel).toHaveValue("todos");
    expect(
      within(sel)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Ativos", "Inativos", "Todos"]);
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute("type", "submit");
  });
});

describe("Paginacao", () => {
  it("gera links preservando a busca", () => {
    render(
      <Paginacao
        base="/coordenacao/equipe"
        pagina={2}
        totalPaginas={3}
        parametros={{ q: "ana", situacao: "inativo" }}
      />,
    );
    expect(screen.getByRole("link", { name: /anterior/i })).toHaveAttribute(
      "href",
      "/coordenacao/equipe?q=ana&situacao=inativo",
    );
    expect(screen.getByRole("link", { name: /próxima/i })).toHaveAttribute(
      "href",
      "/coordenacao/equipe?q=ana&situacao=inativo&pagina=3",
    );
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
  });

  it("omite links nas pontas e não renderiza com uma página", () => {
    const { rerender, container } = render(
      <Paginacao base="/coordenacao/equipe" pagina={1} totalPaginas={2} parametros={{}} />,
    );
    expect(screen.queryByRole("link", { name: /anterior/i })).toBeNull();
    expect(screen.getByRole("link", { name: /próxima/i })).toHaveAttribute(
      "href",
      "/coordenacao/equipe?pagina=2",
    );
    rerender(<Paginacao base="/coordenacao/equipe" pagina={1} totalPaginas={1} parametros={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Aviso", () => {
  it("anuncia mensagem de código conhecido como status", () => {
    render(<Aviso mensagem={mensagemDeAviso("senha-redefinida")} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Senha redefinida. Repasse a nova senha pessoalmente.",
    );
  });

  it("ignora código desconhecido", () => {
    const { container } = render(<Aviso mensagem={mensagemDeAviso("<script>")} />);
    expect(container).toBeEmptyDOMElement();
  });
});
