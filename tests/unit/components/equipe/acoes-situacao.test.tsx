// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/equipe/actions", () => ({}));

import { AcoesSituacao } from "@/components/equipe/acoes-situacao";

beforeAll(() => {
  // jsdom não implementa showModal/close do <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function montar(situacao: "ativo" | "inativo", erro?: string) {
  const inativar = vi.fn(async () => (erro ? { erro } : {}));
  const reativar = vi.fn(async () => ({}));
  render(
    <AcoesSituacao
      nome="Maria Souza"
      situacao={situacao}
      inativar={inativar}
      reativar={reativar}
    />,
  );
  return { inativar, reativar };
}

describe("AcoesSituacao", () => {
  it("ativo: abre o diálogo nomeado e confirmar envia inativar", async () => {
    const { inativar, reativar } = montar("ativo");
    fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
    expect(screen.getByRole("heading", { name: "Inativar Maria Souza?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Inativar" }));
    await waitFor(() => expect(inativar).toHaveBeenCalledTimes(1));
    expect(reativar).not.toHaveBeenCalled();
  });

  it("inativo: confirmar envia reativar", async () => {
    const { inativar, reativar } = montar("inativo");
    fireEvent.click(screen.getByRole("button", { name: "Reativar" }));
    expect(screen.getByRole("heading", { name: "Reativar Maria Souza?" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(reativar).toHaveBeenCalledTimes(1));
    expect(inativar).not.toHaveBeenCalled();
  });

  it("Cancelar fecha o diálogo sem enviar", () => {
    const { inativar } = montar("ativo");
    fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("heading", { name: /Inativar Maria/ })).toBeNull();
    expect(inativar).not.toHaveBeenCalled();
  });

  it("exibe o erro de proteção como alerta", async () => {
    montar("ativo", "Você não pode inativar a si mesmo.");
    fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Inativar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Você não pode inativar a si mesmo.",
    );
  });
});
