// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TurmaDoCatequizando } from "@/components/turmas/historico-turmas";
import type { DataCivil } from "@/modules/compartilhado/datas";

const d = (s: string) => s as DataCivil;

describe("TurmaDoCatequizando", () => {
  it("mostra a turma atual como link, com a data de entrada", () => {
    render(
      <TurmaDoCatequizando
        baseTurma="/coordenacao/turmas"
        historico={[
          {
            turmaId: "t2",
            turmaNome: "Turma B",
            ciclo: 2,
            dataEntrada: d("2026-03-01"),
            dataSaida: null,
            motivoSaida: null,
          },
          {
            turmaId: "t1",
            turmaNome: "Turma A",
            ciclo: 1,
            dataEntrada: d("2025-02-10"),
            dataSaida: d("2026-02-28"),
            motivoSaida: "transferencia",
          },
        ]}
      />,
    );
    const secao = screen.getByRole("region", { name: "Turma" });
    const atual = within(secao).getByTestId("turma-atual");
    expect(within(atual).getByRole("link", { name: "Turma B" })).toHaveAttribute(
      "href",
      "/coordenacao/turmas/t2",
    );
    expect(atual).toHaveTextContent("desde 01/03/2026");
    const linhas = within(secao).getAllByRole("listitem");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent("Turma B");
    expect(linhas[0]).toHaveTextContent("01/03/2026–atual");
    expect(linhas[1]).toHaveTextContent("Turma A");
    expect(linhas[1]).toHaveTextContent("Ciclo 1");
    expect(linhas[1]).toHaveTextContent("10/02/2025–28/02/2026");
    expect(linhas[1]).toHaveTextContent("Transferência");
  });

  it("sem turma atual mostra 'Sem turma no momento'", () => {
    render(
      <TurmaDoCatequizando
        baseTurma="/coordenacao/turmas"
        historico={[
          {
            turmaId: "t1",
            turmaNome: "Turma A",
            ciclo: 1,
            dataEntrada: d("2025-02-10"),
            dataSaida: d("2025-12-01"),
            motivoSaida: "encerramento",
          },
        ]}
      />,
    );
    expect(screen.getByText("Sem turma no momento")).toBeInTheDocument();
    expect(screen.getByText(/Encerramento da turma/)).toBeInTheDocument();
  });

  it("sem histórico mostra só 'Sem turma no momento'", () => {
    render(<TurmaDoCatequizando baseTurma="/coordenacao/turmas" historico={[]} />);
    expect(screen.getByText("Sem turma no momento")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
