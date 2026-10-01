// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/programa/actions", () => ({}));

import { AcoesEncontro } from "@/components/programa/acoes-encontro";
import type { DataCivil } from "@/modules/compartilhado/datas";

beforeAll(() => {
  // jsdom não implementa showModal/close do <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const vazio = vi.fn(async () => ({}));
const planejado = {
  data: "2026-10-10" as DataCivil,
  situacao: "planejado" as const,
  tema: "Criação",
};

describe("AcoesEncontro", () => {
  it("planejado: realizar e cancelar com nome que inclui a data", () => {
    render(
      <AcoesEncontro encontro={planejado} realizar={vazio} cancelar={vazio} reabrir={vazio} />,
    );
    expect(
      screen.getByRole("button", { name: "Marcar como realizado Sábado, 10/10/2026" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reabrir/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar encontro de 10/10/2026" }));
    expect(
      screen.getByText("Cancelar o encontro de Sábado, 10/10/2026 (Criação)?"),
    ).toBeInTheDocument();
  });

  it("envia o motivo no FormData e mostra erro de campo como alerta", async () => {
    const cancelar = vi.fn(async (_a: unknown, dados: FormData) => {
      void dados;
      return { errosCampos: { motivo: "O motivo deve ter no máximo 200 caracteres" } };
    });
    render(
      <AcoesEncontro encontro={planejado} realizar={vazio} cancelar={cancelar} reabrir={vazio} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar encontro de 10/10/2026" }));
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Chuva forte" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar encontro" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O motivo deve ter no máximo 200 caracteres",
    );
    const dados = cancelar.mock.calls[0]?.[1] as FormData;
    expect(dados.get("motivo")).toBe("Chuva forte");
  });

  it("cancelado sem tema: Reabrir nomeando data e 'Sem tema do programa'", () => {
    render(
      <AcoesEncontro
        encontro={{ data: "2026-09-26" as DataCivil, situacao: "cancelado", tema: null }}
        realizar={vazio}
        cancelar={vazio}
        reabrir={vazio}
      />,
    );
    expect(screen.queryByRole("button", { name: /Marcar como realizado/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reabrir encontro de 26/09/2026" }));
    expect(
      screen.getByText("Reabrir o encontro de Sábado, 26/09/2026 (Sem tema do programa)?"),
    ).toBeInTheDocument();
  });
});
