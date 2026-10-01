// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/turmas/actions", () => ({}));

import {
  DesligarCatequizando,
  EncerrarTurma,
  RemoverCatequista,
} from "@/components/turmas/acoes-turma";
import { DesignarCatequista } from "@/components/turmas/designar-catequista";

type Acao = (anterior: unknown, dados: FormData) => Promise<{ erro?: string }>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("DesignarCatequista", () => {
  it("sem elegíveis mostra o estado vazio no lugar do formulário", () => {
    render(<DesignarCatequista acao={vi.fn(async () => ({}))} elegiveis={[]} />);
    expect(screen.getByText("Nenhum catequista disponível")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Designar" })).toBeNull();
    expect(screen.queryByLabelText(/catequista/i)).toBeNull();
  });

  it("envia o userId escolhido e mostra o erro como alerta", async () => {
    const acao = vi.fn<Acao>(async () => ({ erro: "Catequista indisponível." }));
    render(
      <DesignarCatequista
        acao={acao}
        elegiveis={[
          { id: "u1", nome: "Ana Lima" },
          { id: "u2", nome: "Bruno Reis" },
        ]}
      />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("name", "userId");
    expect(screen.getByRole("option", { name: "Bruno Reis" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "u2" } });
    fireEvent.click(screen.getByRole("button", { name: "Designar" }));
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
    expect(acao.mock.calls[0][1].get("userId")).toBe("u2");
    expect(await screen.findByRole("alert")).toHaveTextContent("Catequista indisponível.");
  });
});

describe("EncerrarTurma", () => {
  function abrir(vigentes: number) {
    const acao = vi.fn(async () => ({}));
    render(<EncerrarTurma turma="Crisma A" vigentes={vigentes} acao={acao} />);
    fireEvent.click(screen.getByRole("button", { name: "Encerrar turma" }));
    return { acao, dialogo: screen.getByRole("dialog") };
  }

  it("plural: informa a contagem de desligados e confirma", async () => {
    const { acao, dialogo } = abrir(12);
    expect(within(dialogo).getByText(/12 catequizandos serão desligados/)).toBeInTheDocument();
    expect(within(dialogo).getByRole("heading")).toHaveTextContent("Crisma A");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Encerrar turma" }));
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
  });

  it("singular", () => {
    const { dialogo } = abrir(1);
    expect(within(dialogo).getByText(/1 catequizando será desligado/)).toBeInTheDocument();
  });

  it("zero", () => {
    const { dialogo } = abrir(0);
    expect(within(dialogo).getByText(/Nenhum catequizando será desligado/)).toBeInTheDocument();
  });
});

describe("RemoverCatequista", () => {
  it("nomeia o catequista e a turma e confirma", async () => {
    const acao = vi.fn(async () => ({}));
    render(<RemoverCatequista catequista="Ana Lima" turma="Crisma A" acao={acao} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent("Ana Lima");
    expect(dialogo).toHaveTextContent("Crisma A");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
  });
});

describe("DesligarCatequizando", () => {
  it("nomeia e envia a data de saída com padrão hoje", async () => {
    const acao = vi.fn<Acao>(async () => ({}));
    render(
      <DesligarCatequizando
        catequizando="Pedro Alves"
        turma="Crisma A"
        hoje="2026-10-01"
        acao={acao}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Desligar" }));
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent("Pedro Alves");
    expect(dialogo).toHaveTextContent("Crisma A");
    const data = within(dialogo).getByLabelText(/data de saída/i);
    expect(data).toHaveAttribute("type", "date");
    expect(data).toHaveAttribute("name", "dataSaida");
    expect(data).toHaveValue("2026-10-01");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desligar" }));
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
    expect(acao.mock.calls[0][1].get("dataSaida")).toBe("2026-10-01");
  });
});

describe("DesligarCatequizando com erro de campo", () => {
  it("mostra o erro de data de saída como alerta no diálogo", async () => {
    const acao = vi.fn(async () => ({ errosCampos: { dataSaida: "Data inválida" } }));
    render(
      <DesligarCatequizando
        catequizando="Pedro Alves"
        turma="Crisma A"
        hoje="2026-10-01"
        acao={acao}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Desligar" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desligar" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Data inválida");
  });
});
