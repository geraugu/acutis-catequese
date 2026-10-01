// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/programa/actions", () => ({
  marcarRealizadoAction: vi.fn(async () => ({})),
  cancelarEncontroAction: vi.fn(async () => ({})),
  reabrirEncontroAction: vi.fn(async () => ({})),
}));

import { Cronograma } from "@/components/programa/cronograma";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { EncontroResumo } from "@/modules/programa/repositorio";

const d = (s: string) => s as DataCivil;
const hoje = d("2026-10-01");
const base = "/coordenacao/turmas/t1/encontros";

function encontro(p: Partial<EncontroResumo> & { id: string; data: DataCivil }): EncontroResumo {
  return {
    turmaId: "t1",
    horario: "19:30",
    situacao: "planejado",
    observacoes: null,
    motivoCancelamento: null,
    tema: null,
    ...p,
  };
}

const encontros: EncontroResumo[] = [
  encontro({
    id: "c",
    data: d("2026-10-10"),
    tema: { id: "x", titulo: "Criação", ativo: true, numero: 1 },
  }),
  encontro({ id: "a", data: d("2026-09-20") }),
  encontro({
    id: "b",
    data: d("2026-09-26"),
    situacao: "cancelado",
    motivoCancelamento: "Chuva forte",
  }),
  encontro({ id: "r", data: d("2026-09-12"), situacao: "realizado" }),
];

describe("Cronograma", () => {
  it("lista em ordem cronológica com data com dia e tema", () => {
    render(<Cronograma encontros={encontros} hoje={hoje} base={base} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(4);
    expect(itens[0]).toHaveTextContent("Sábado, 12/09/2026");
    expect(itens[1]).toHaveTextContent("Domingo, 20/09/2026");
    expect(itens[3]).toHaveTextContent("Sábado, 10/10/2026");
    expect(itens[3]).toHaveTextContent("1. Criação");
    expect(itens[0]).toHaveTextContent("Sem tema do programa");
  });

  it("mostra os selos e o motivo do cancelamento", () => {
    render(<Cronograma encontros={encontros} hoje={hoje} base={base} />);
    const itens = screen.getAllByRole("listitem");
    expect(within(itens[3]).getByText("Próximo encontro")).toBeInTheDocument();
    expect(within(itens[1]).getByText("Aguardando confirmação")).toBeInTheDocument();
    expect(within(itens[0]).queryByText("Aguardando confirmação")).toBeNull();
    expect(itens[2]).toHaveTextContent("Cancelado");
    expect(itens[2]).toHaveTextContent("Chuva forte");
  });

  it("sem acoes não mostra nenhuma ação", () => {
    render(<Cronograma encontros={encontros} hoje={hoje} base={base} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("com acoes mostra as ações conforme a situação", () => {
    render(<Cronograma encontros={encontros} hoje={hoje} base={base} acoes />);
    const itens = screen.getAllByRole("listitem");
    // Planejado: Editar, Marcar como realizado e Cancelar.
    expect(within(itens[3]).getByRole("link", { name: /Editar/ })).toHaveAttribute(
      "href",
      `${base}/c/editar`,
    );
    expect(
      within(itens[3]).getByRole("button", { name: /Marcar como realizado/ }),
    ).toBeInTheDocument();
    expect(within(itens[3]).getByRole("button", { name: /Cancelar encontro/ })).toBeInTheDocument();
    expect(within(itens[3]).queryByRole("button", { name: /Reabrir/ })).toBeNull();
    // Realizado e cancelado: só Reabrir.
    for (const i of [0, 2]) {
      expect(within(itens[i]).getByRole("button", { name: /Reabrir/ })).toBeInTheDocument();
      expect(within(itens[i]).queryByRole("link", { name: /Editar/ })).toBeNull();
      expect(within(itens[i]).queryByRole("button", { name: /Marcar como realizado/ })).toBeNull();
    }
  });
});
