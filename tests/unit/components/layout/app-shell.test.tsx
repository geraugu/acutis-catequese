// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/actions", () => ({ sairAction: vi.fn() }));

import { AppShell } from "@/components/layout/app-shell";
import { SairButton } from "@/components/auth/sair-button";
import type { SessaoUsuario } from "@/modules/auth/dal";

const coord: SessaoUsuario = {
  userId: "1",
  nome: "Maria da Silva",
  email: "m@x.com",
  papel: "coordenacao",
};
const cat: SessaoUsuario = {
  userId: "2",
  nome: "João Souza",
  email: "j@x.com",
  papel: "catequista",
};

describe("AppShell", () => {
  it("mostra nome, papel, Sair e itens da coordenação", () => {
    render(
      <AppShell sessao={coord} caminhoAtual="/coordenacao">
        <p>conteúdo</p>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Maria da Silva");
    expect(screen.getByText("Coordenação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    const link = within(nav).getByRole("link", { name: "Início" });
    expect(link).toHaveAttribute("href", "/coordenacao");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(within(nav).getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
    expect(screen.getByRole("main")).toHaveTextContent("conteúdo");
  });

  it("mostra Catequista e só os itens do catequista", () => {
    render(
      <AppShell sessao={cat}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByText("Catequista")).toBeInTheDocument();
    expect(screen.queryByText("Coordenação")).not.toBeInTheDocument();
    const links = within(screen.getByRole("navigation", { name: "Principal" })).getAllByRole(
      "link",
    );
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/catequista"]);
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("tem link para pular para o conteúdo", () => {
    render(
      <AppShell sessao={cat}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute(
      "href",
      "#conteudo",
    );
  });
});

describe("SairButton", () => {
  it("é um formulário com botão de envio operável por teclado", () => {
    const { container } = render(<SairButton />);
    const botao = screen.getByRole("button", { name: "Sair" });
    expect(botao).toHaveAttribute("type", "submit");
    expect(botao.closest("form")).not.toBeNull();
    expect(container.querySelector("form")).toContainElement(botao);
  });
});
