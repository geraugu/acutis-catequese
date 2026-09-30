// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/catequizandos/actions", () => ({}));

import { AcoesEstado } from "@/components/catequizandos/acoes-estado";
import type { EstadoCatequizando } from "@/modules/catequizandos/domain/estado";

beforeAll(() => {
  // jsdom não implementa showModal/close do <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function montar(estado: EstadoCatequizando) {
  const acoes = {
    inativar: vi.fn(async () => ({})),
    reativar: vi.fn(async () => ({})),
    confirmar: vi.fn(async () => ({})),
    recusar: vi.fn(async () => ({})),
  };
  render(<AcoesEstado nome="João Lima" estado={estado} {...acoes} />);
  return acoes;
}

function rotulosAbrir() {
  return screen.getAllByRole("button").map((b) => b.textContent);
}

describe("AcoesEstado", () => {
  it("ativo: só Inativar", () => {
    montar("ativo");
    expect(rotulosAbrir()).toEqual(["Inativar"]);
  });

  it("inativo: só Reativar", () => {
    montar("inativo");
    expect(rotulosAbrir()).toEqual(["Reativar"]);
  });

  it("pendente: Confirmar ficha e Recusar ficha", () => {
    montar("pendente");
    expect(rotulosAbrir()).toEqual(["Confirmar ficha", "Recusar ficha"]);
  });

  const casos: Array<
    [EstadoCatequizando, string, string, "inativar" | "reativar" | "confirmar" | "recusar"]
  > = [
    ["ativo", "Inativar", "Inativar João Lima?", "inativar"],
    ["inativo", "Reativar", "Reativar João Lima?", "reativar"],
    ["pendente", "Confirmar ficha", "Confirmar a ficha de João Lima?", "confirmar"],
    ["pendente", "Recusar ficha", "Recusar a ficha de João Lima?", "recusar"],
  ];

  it.each(casos)(
    "%s/%s: título nomeado e confirmar chama só a action certa",
    async (estado, abrir, titulo, chave) => {
      const acoes = montar(estado);
      fireEvent.click(screen.getByRole("button", { name: abrir }));
      const dialogo = screen.getByRole("dialog");
      expect(within(dialogo).getByRole("heading", { name: titulo })).toBeInTheDocument();
      fireEvent.click(within(dialogo).getByRole("button", { name: abrir }));
      await waitFor(() => expect(acoes[chave]).toHaveBeenCalledTimes(1));
      for (const [k, fn] of Object.entries(acoes)) {
        if (k !== chave) expect(fn).not.toHaveBeenCalled();
      }
    },
  );
});
