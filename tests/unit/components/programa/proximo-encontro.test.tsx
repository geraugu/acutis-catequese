// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProximoEncontro } from "@/components/programa/proximo-encontro";
import { type DataCivil, formatarDataComDia } from "@/modules/compartilhado/datas";
import type { EncontroResumo } from "@/modules/programa/repositorio";
import { formatarHorario } from "@/modules/turmas/domain/turma";

const data = "2026-10-10" as DataCivil;
const link = "/catequista/turmas/t1/encontros";

const encontro: EncontroResumo = {
  id: "e1",
  turmaId: "t1",
  data,
  horario: "19:30",
  situacao: "planejado",
  observacoes: null,
  motivoCancelamento: null,
  tema: { id: "x", titulo: "Criação", ativo: true, numero: 1 },
};

describe("ProximoEncontro", () => {
  it("mostra data com dia, horário, tema e link para o cronograma", () => {
    render(<ProximoEncontro encontro={encontro} linkCronograma={link} />);
    expect(screen.getByText(formatarDataComDia(data), { exact: false })).toBeTruthy();
    expect(screen.getByText(formatarHorario("19:30"), { exact: false })).toBeTruthy();
    expect(screen.getByText("1. Criação")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver cronograma" }).getAttribute("href")).toBe(link);
  });

  it("mostra 'Sem tema do programa' quando o encontro não tem tema", () => {
    render(<ProximoEncontro encontro={{ ...encontro, tema: null }} linkCronograma={link} />);
    expect(screen.getByText("Sem tema do programa")).toBeTruthy();
  });

  it("mostra 'Nenhum encontro planejado' sem encontro, mantendo o link", () => {
    render(<ProximoEncontro encontro={null} linkCronograma={link} />);
    expect(screen.getByText("Nenhum encontro planejado")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver cronograma" }).getAttribute("href")).toBe(link);
  });
});
