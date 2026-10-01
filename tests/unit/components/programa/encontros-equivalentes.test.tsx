// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EncontrosEquivalentes } from "@/components/programa/encontros-equivalentes";
import { type DataCivil, formatarDataComDia } from "@/modules/compartilhado/datas";
import type { EncontroEquivalente } from "@/modules/programa/repositorio";

const d = (s: string) => s as DataCivil;
const encontros: EncontroEquivalente[] = [
  {
    id: "e1",
    turmaId: "t1",
    turmaNome: "Turma A",
    data: d("2026-10-10"),
    horario: "19:30",
    situacao: "planejado",
  },
  {
    id: "e2",
    turmaId: "t2",
    turmaNome: "Turma B",
    data: d("2026-09-20"),
    horario: "09:00",
    situacao: "realizado",
  },
];

describe("EncontrosEquivalentes", () => {
  it("lista turma (link), data com dia, horário e situação numa tabela acessível", () => {
    render(<EncontrosEquivalentes encontros={encontros} baseTurma="/coordenacao/turmas" />);
    const tabela = screen.getByRole("table");
    expect(tabela.querySelector("caption")).not.toBeNull();
    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Turma", "Data", "Horário", "Situação"]);
    expect(screen.getByRole("link", { name: "Turma A" }).getAttribute("href")).toBe(
      "/coordenacao/turmas/t1",
    );
    expect(screen.getByText(formatarDataComDia(d("2026-09-20")))).toBeTruthy();
    expect(screen.getByText("Realizado")).toBeTruthy();
  });

  it("mostra mensagem quando não há encontros", () => {
    render(<EncontrosEquivalentes encontros={[]} baseTurma="/coordenacao/turmas" />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Nenhuma turma trabalhou este tema ainda.")).toBeTruthy();
  });
});
