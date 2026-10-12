// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type AcaoConfirmarReserva,
  type AcaoMarcarAusencia,
  ReservasDaChamada,
} from "@/components/presenca/reservas-da-chamada";
import type { ReservaDaChamada } from "@/modules/presenca/reposicao-repositorio";

const reserva = (sobre: Partial<ReservaDaChamada> = {}): ReservaDaChamada => ({
  reservaId: "r1",
  catequizandoId: "c1",
  nome: "Davi Souza",
  turmaOrigemId: "t1",
  turmaOrigemNome: "Turma Quarta",
  situacao: "reservada",
  motivo: null,
  ...sobre,
});

const acoes = () => ({
  confirmar: vi.fn<AcaoConfirmarReserva>(async () => ({})),
  ausente: vi.fn<AcaoMarcarAusencia>(async () => undefined),
});

describe("ReservasDaChamada", () => {
  it("não renderiza nada quando não há reservas ativas", () => {
    const { container } = render(
      <ReservasDaChamada
        reservas={[reserva({ situacao: "cancelada", motivo: "encontro-cancelado" })]}
        {...acoes()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada com lista vazia", () => {
    const { container } = render(<ReservasDaChamada reservas={[]} {...acoes()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra nome e turma de origem com as duas ações", () => {
    render(<ReservasDaChamada reservas={[reserva()]} {...acoes()} />);
    expect(screen.getByRole("heading", { name: "Reposições reservadas" })).toBeInTheDocument();
    expect(screen.getByText("Davi Souza")).toBeInTheDocument();
    expect(screen.getByText("Turma de origem: Turma Quarta")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar presente: Davi Souza" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar ausência: Davi Souza" })).toBeInTheDocument();
  });

  it("confirma o comparecimento pelo catequizando", async () => {
    const { confirmar, ausente } = acoes();
    render(<ReservasDaChamada reservas={[reserva()]} confirmar={confirmar} ausente={ausente} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar presente: Davi Souza" }));
    await vi.waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(confirmar.mock.calls[0]![0]).toBe("c1");
    expect(ausente).not.toHaveBeenCalled();
  });

  it("marca a ausência pelo catequizando", async () => {
    const { confirmar, ausente } = acoes();
    render(<ReservasDaChamada reservas={[reserva()]} confirmar={confirmar} ausente={ausente} />);
    fireEvent.click(screen.getByRole("button", { name: "Marcar ausência: Davi Souza" }));
    await vi.waitFor(() => expect(ausente).toHaveBeenCalledWith("c1"));
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("mostra a situação já resolvida, sem botões", () => {
    render(
      <ReservasDaChamada
        reservas={[
          reserva({ reservaId: "r2", catequizandoId: "c2", nome: "Elisa", situacao: "compareceu" }),
          reserva({
            reservaId: "r3",
            catequizandoId: "c3",
            nome: "Caio",
            situacao: "nao_compareceu",
          }),
        ]}
        {...acoes()}
      />,
    );
    const itens = screen.getAllByRole("listitem");
    expect(within(itens[0]!).getByText("Compareceu")).toBeInTheDocument();
    expect(within(itens[1]!).getByText("Não compareceu")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("mostra o erro devolvido ao confirmar", async () => {
    const confirmar = vi.fn<AcaoConfirmarReserva>(async () => ({
      erro: "Não foi possível agora.",
    }));
    render(
      <ReservasDaChamada reservas={[reserva()]} confirmar={confirmar} ausente={acoes().ausente} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar presente: Davi Souza" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível agora.");
  });
});
