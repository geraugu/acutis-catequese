// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { HistoricoReservas } from "@/components/presenca/historico-reservas";
import { type AcaoReservar, OQueFalta } from "@/components/presenca/o-que-falta";
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

const data = (d: string) => d as DataCivil;

const opcao = (sobre: Partial<Record<string, unknown>> = {}) => ({
  encontroId: "e1",
  turmaId: "t2",
  turmaNome: "Turma Sábado",
  diaSemana: "sabado",
  data: data("2026-11-14"),
  horario: "15:00",
  temaId: "tema-1",
  conflito: false,
  ...sobre,
});

const tema = (numero: number, titulo: string, id = `tema-${numero}`) => ({
  id,
  numero,
  titulo,
});

const reserva = (sobre: Partial<Record<string, unknown>> = {}) => ({
  id: "r1",
  catequizandoId: "c1",
  temaId: "tema-1",
  temaNumero: 1,
  temaTitulo: "A Criação",
  turmaOrigemId: "t1",
  turmaOrigemNome: "Turma Quarta",
  encontroId: "e1",
  turmaDestinoId: "t2",
  turmaDestinoNome: "Turma Sábado",
  diaSemana: "sabado",
  data: data("2026-11-14"),
  horario: "15:00",
  situacao: "reservada",
  motivo: null,
  criadoEm: new Date("2026-10-01T10:00:00Z"),
  ...sobre,
});

const acoes = () => ({
  reservar: vi.fn<AcaoReservar>(async () => ({})),
  cancelar: vi.fn(async () => undefined),
});

describe("OQueFalta", () => {
  it("lista os temas a repor na ordem recebida, com número e título", () => {
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [
            { tema: tema(2, "O Pecado"), opcoes: [opcao()], reserva: null },
            { tema: tema(5, "A Aliança"), opcoes: [opcao({ encontroId: "e2" })], reserva: null },
          ],
        }}
        {...acoes()}
      />,
    );
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(["2. O Pecado", "5. A Aliança"]);
  });

  it("mostra turma, dia, data e horário de cada opção", () => {
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [{ tema: tema(2, "O Pecado"), opcoes: [opcao()], reserva: null }],
        }}
        {...acoes()}
      />,
    );
    expect(screen.getByText("Turma Sábado")).toBeInTheDocument();
    expect(screen.getByText("Sábado, 14/11/2026 · 15:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reservar/ })).toBeEnabled();
  });

  it("informa que não há reposição pendente", () => {
    render(<OQueFalta visao={{ origemTurmaIds: ["t1"], temas: [] }} {...acoes()} />);
    expect(screen.getByText("Nenhuma reposição pendente")).toBeInTheDocument();
  });

  it("informa que não há turma de origem e não lista temas", () => {
    render(<OQueFalta visao={{ origemTurmaIds: [], temas: [] }} {...acoes()} />);
    expect(screen.getByText("Sem turma de origem")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma reposição pendente")).not.toBeInTheDocument();
  });

  it("informa quando o tema não tem encontro futuro", () => {
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [{ tema: tema(3, "O Dilúvio"), opcoes: [], reserva: null }],
        }}
        {...acoes()}
      />,
    );
    expect(screen.getByText("3. O Dilúvio")).toBeInTheDocument();
    expect(screen.getByText("Não há encontro futuro com este tema.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reservar/ })).not.toBeInTheDocument();
  });

  it("mostra a reserva em destaque no lugar das opções", () => {
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [
            {
              tema: tema(1, "A Criação"),
              opcoes: [],
              reserva: reserva() as never,
            },
          ],
        }}
        {...acoes()}
      />,
    );
    const destaque = screen.getByRole("group", { name: "Reserva do tema 1. A Criação" });
    expect(within(destaque).getByText("Reservada")).toBeInTheDocument();
    expect(within(destaque).getByText("Turma Sábado")).toBeInTheDocument();
    expect(within(destaque).getByText(/15:00/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reservar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar reserva" })).toBeInTheDocument();
  });

  it("desabilita a opção em conflito e explica o motivo", () => {
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [
            {
              tema: tema(2, "O Pecado"),
              opcoes: [
                opcao({ conflito: true }),
                opcao({ encontroId: "e2", turmaNome: "Turma Domingo" }),
              ],
              reserva: null,
            },
          ],
        }}
        {...acoes()}
      />,
    );
    const botoes = screen.getAllByRole("button", { name: /Reservar/ });
    expect(botoes).toHaveLength(2);
    expect(botoes[0]).toBeDisabled();
    expect(botoes[1]).toBeEnabled();
    expect(screen.getByText(/Conflito de data/)).toBeInTheDocument();
  });

  it("envia o encontro e o tema ao reservar", async () => {
    const { reservar, cancelar } = acoes();
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [
            { tema: tema(2, "O Pecado"), opcoes: [opcao({ temaId: "tema-2" })], reserva: null },
          ],
        }}
        reservar={reservar}
        cancelar={cancelar}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Reservar/ }));
    await vi.waitFor(() => expect(reservar).toHaveBeenCalledTimes(1));
    const dados = reservar.mock.calls[0]![1] as FormData;
    expect(dados.get("encontroId")).toBe("e1");
    expect(dados.get("temaId")).toBe("tema-2");
  });

  it("mostra o erro devolvido pela ação ao reservar", async () => {
    const reservar = vi.fn<AcaoReservar>(async () => ({
      erro: "Este encontro não está mais disponível.",
    }));
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [{ tema: tema(2, "O Pecado"), opcoes: [opcao()], reserva: null }],
        }}
        reservar={reservar}
        cancelar={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Reservar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("não está mais disponível");
  });

  it("pede confirmação antes de cancelar a reserva", async () => {
    const { reservar, cancelar } = acoes();
    render(
      <OQueFalta
        visao={{
          origemTurmaIds: ["t1"],
          temas: [{ tema: tema(1, "A Criação"), opcoes: [], reserva: reserva() as never }],
        }}
        reservar={reservar}
        cancelar={cancelar}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    expect(cancelar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar a reserva" }));
    await vi.waitFor(() => expect(cancelar).toHaveBeenCalledWith("r1"));
  });
});

describe("HistoricoReservas", () => {
  it("mostra situação, turma, data e o motivo da reserva cancelada", () => {
    render(
      <HistoricoReservas
        reservas={[
          reserva({ id: "r2", situacao: "cancelada", motivo: "encontro-cancelado" }) as never,
          reserva({ id: "r3", situacao: "compareceu", turmaDestinoNome: "Turma Domingo" }) as never,
        ]}
      />,
    );
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(within(itens[0]!).getByText("Cancelada")).toBeInTheDocument();
    expect(within(itens[0]!).getByText("O encontro foi cancelado.")).toBeInTheDocument();
    expect(within(itens[0]!).getByText(/14\/11\/2026/)).toBeInTheDocument();
    expect(within(itens[1]!).getByText("Compareceu")).toBeInTheDocument();
    expect(within(itens[1]!).getByText("Turma Domingo")).toBeInTheDocument();
  });

  it("trata saída da turma e inativação como o mesmo motivo", () => {
    render(
      <HistoricoReservas
        reservas={[
          reserva({ id: "a", situacao: "cancelada", motivo: "saiu-da-turma" }) as never,
          reserva({ id: "b", situacao: "cancelada", motivo: "catequizando-inativo" }) as never,
        ]}
      />,
    );
    expect(screen.getAllByText("Saiu da turma de origem.")).toHaveLength(2);
  });

  it("informa quando ainda não há reservas", () => {
    render(<HistoricoReservas reservas={[]} />);
    expect(screen.getByText("Nenhuma reserva de reposição ainda.")).toBeInTheDocument();
  });
});
