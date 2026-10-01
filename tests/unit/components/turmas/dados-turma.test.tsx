// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DadosTurma } from "@/components/turmas/dados-turma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { TurmaDetalhe } from "@/modules/turmas/repositorio";

function turma(parcial: Partial<TurmaDetalhe> = {}): TurmaDetalhe {
  return {
    id: "t1",
    nome: "Turma A",
    ciclo: 2026,
    diaSemana: "sabado",
    horario: "09:30",
    local: "Salão",
    encerrada: false,
    catequistas: [{ id: "u1", nome: "Maria" }],
    inscritosVigentes: 2,
    vagas: null,
    observacoes: null,
    encerradaEm: null,
    vigentes: [],
    anteriores: [],
    ...parcial,
  };
}

describe("DadosTurma", () => {
  it("mostra 'Sem catequista' numa turma aberta sem catequista", () => {
    render(<DadosTurma turma={turma({ catequistas: [] })} />);
    expect(screen.getByText("Sem catequista")).toBeInTheDocument();
  });

  it("não mostra 'Sem catequista' numa turma encerrada (4.5)", () => {
    render(
      <DadosTurma
        turma={turma({
          catequistas: [],
          encerrada: true,
          encerradaEm: "2026-06-30" as DataCivil,
        })}
      />,
    );
    expect(screen.queryByText("Sem catequista")).not.toBeInTheDocument();
  });

  it("mostra o selo 'Lotada' quando os vigentes atingem as vagas", () => {
    render(<DadosTurma turma={turma({ vagas: 2, inscritosVigentes: 2 })} />);
    expect(screen.getByText("Lotada")).toBeInTheDocument();
  });

  it("não mostra 'Lotada' com vaga sobrando", () => {
    render(<DadosTurma turma={turma({ vagas: 3, inscritosVigentes: 2 })} />);
    expect(screen.queryByText("Lotada")).not.toBeInTheDocument();
  });

  it("mostra a situação Encerrada com a data", () => {
    render(
      <DadosTurma turma={turma({ encerrada: true, encerradaEm: "2026-06-30" as DataCivil })} />,
    );
    expect(screen.getByText("Encerrada")).toBeInTheDocument();
    expect(screen.getByText("Encerrada em 30/06/2026")).toBeInTheDocument();
    expect(screen.queryByText("Aberta")).not.toBeInTheDocument();
  });

  it("mostra a ocupação 'n de v vagas' só quando há vagas", () => {
    const { unmount } = render(<DadosTurma turma={turma({ vagas: 5, inscritosVigentes: 2 })} />);
    expect(screen.getByText("Ocupação")).toBeInTheDocument();
    expect(screen.getByText("2 de 5 vagas")).toBeInTheDocument();
    unmount();
    render(<DadosTurma turma={turma({ vagas: null })} />);
    expect(screen.queryByText("Ocupação")).not.toBeInTheDocument();
    expect(screen.queryByText(/vagas/)).not.toBeInTheDocument();
  });
});
