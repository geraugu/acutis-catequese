// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChamadaDeHoje } from "@/components/presenca/chamada-de-hoje";
import { ResumoChamada } from "@/components/presenca/resumo-chamada";
import type { DataCivil } from "@/modules/compartilhado/datas";

const hoje = "2026-10-05" as DataCivil;
const contagem = { presentes: 8, ausentes: 2, justificados: 1, visitantes: 3 };

describe("ResumoChamada", () => {
  it("mostra a contagem em plural para encontro realizado (2.8)", () => {
    render(<ResumoChamada situacao="realizado" contagem={contagem} />);
    expect(
      screen.getByText("8 presentes · 2 ausentes · 1 justificado · 3 visitantes"),
    ).toBeTruthy();
  });

  it("usa o singular quando é 1", () => {
    render(
      <ResumoChamada
        situacao="realizado"
        contagem={{ presentes: 1, ausentes: 1, justificados: 1, visitantes: 1 }}
      />,
    );
    expect(screen.getByText("1 presente · 1 ausente · 1 justificado · 1 visitante")).toBeTruthy();
  });

  it("zero fica no plural", () => {
    render(
      <ResumoChamada
        situacao="realizado"
        contagem={{ presentes: 0, ausentes: 0, justificados: 0, visitantes: 0 }}
      />,
    );
    expect(
      screen.getByText("0 presentes · 0 ausentes · 0 justificados · 0 visitantes"),
    ).toBeTruthy();
  });

  it.each(["planejado", "cancelado"] as const)("não mostra nada para %s", (situacao) => {
    const { container } = render(<ResumoChamada situacao={situacao} contagem={contagem} />);
    expect(container.firstChild).toBeNull();
  });

  it("não mostra nada sem contagem", () => {
    const { container } = render(<ResumoChamada situacao="realizado" contagem={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});

const encontro = {
  id: "e1",
  data: hoje,
  horario: "09:00",
  temaTitulo: "Creio em Deus",
  situacao: "planejado" as const,
};

function renderizar(parcial: Partial<Parameters<typeof ChamadaDeHoje>[0]> = {}) {
  return render(
    <ChamadaDeHoje
      encontro={encontro}
      turmaEncerrada={false}
      hoje={hoje}
      hrefChamada="/catequista/turmas/t1/encontros/e1/chamada"
      {...parcial}
    />,
  );
}

describe("ChamadaDeHoje", () => {
  it("destaca o encontro planejado de hoje com o link para a chamada (6.3)", () => {
    renderizar();
    expect(screen.getByText("Encontro de hoje")).toBeTruthy();
    expect(screen.getByText(/09:00/)).toBeTruthy();
    expect(screen.getByText(/Creio em Deus/)).toBeTruthy();
    const link = screen.getByRole("link", { name: "Fazer chamada" });
    expect(link.getAttribute("href")).toBe("/catequista/turmas/t1/encontros/e1/chamada");
  });

  it("mostra 'Sem tema do programa' quando não há tema", () => {
    renderizar({ encontro: { ...encontro, temaTitulo: null } });
    expect(screen.getByText(/Sem tema do programa/)).toBeTruthy();
  });

  it("não mostra bloco em turma encerrada", () => {
    const { container } = renderizar({ turmaEncerrada: true });
    expect(container.firstChild).toBeNull();
  });

  it("não mostra bloco em encontro realizado", () => {
    const { container } = renderizar({ encontro: { ...encontro, situacao: "realizado" } });
    expect(container.firstChild).toBeNull();
  });

  it("não mostra bloco em encontro de outra data", () => {
    const { container } = renderizar({
      encontro: { ...encontro, data: "2026-10-12" as DataCivil },
    });
    expect(container.firstChild).toBeNull();
  });

  it("não mostra bloco sem encontro", () => {
    const { container } = renderizar({ encontro: null });
    expect(container.firstChild).toBeNull();
  });
});
