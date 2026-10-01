// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/programa/actions", () => ({}));

import { AcoesTema } from "@/components/programa/acoes-tema";
import { MSG_TEMA_EM_USO } from "@/modules/programa/mensagens";

beforeAll(() => {
  // jsdom não implementa showModal/close do <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const acao = vi.fn(async () => ({}));
const base = { id: "a", titulo: "Criação", ativo: true, encontros: 0 };

describe("AcoesTema", () => {
  it("tema ativo sem encontros: Desativar e Excluir nomeando o tema", () => {
    render(<AcoesTema tema={base} desativar={acao} reativar={acao} excluir={acao} />);
    expect(screen.queryByRole("button", { name: "Reativar Criação" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Desativar Criação" }));
    expect(screen.getByText("Desativar o tema Criação?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir Criação" }));
    expect(screen.getByText("Excluir o tema Criação?")).toBeInTheDocument();
  });

  it("tema com encontros não mostra Excluir", () => {
    render(
      <AcoesTema
        tema={{ ...base, encontros: 2 }}
        desativar={acao}
        reativar={acao}
        excluir={acao}
      />,
    );
    expect(screen.queryByRole("button", { name: "Excluir Criação" })).toBeNull();
    expect(screen.getByRole("button", { name: "Desativar Criação" })).toBeInTheDocument();
  });

  it("tema desativado mostra Reativar", () => {
    render(
      <AcoesTema
        tema={{ ...base, ativo: false }}
        desativar={acao}
        reativar={acao}
        excluir={acao}
      />,
    );
    expect(screen.getByRole("button", { name: "Reativar Criação" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar Criação" })).toBeNull();
  });

  it("mostra o erro do estado como alerta", async () => {
    const excluir = vi.fn(async () => ({ erro: MSG_TEMA_EM_USO }));
    render(<AcoesTema tema={base} desativar={acao} reativar={acao} excluir={excluir} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Criação" }));
    const confirmar = screen.getAllByRole("button", { name: "Excluir" }).at(-1)!;
    fireEvent.click(confirmar);
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG_TEMA_EM_USO);
  });

  it("mostra o erro da reativação como alerta", async () => {
    const reativar = vi.fn(async () => ({ erro: "Falhou." }));
    render(
      <AcoesTema
        tema={{ ...base, ativo: false }}
        desativar={acao}
        reativar={reativar}
        excluir={acao}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reativar Criação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falhou.");
  });
});
