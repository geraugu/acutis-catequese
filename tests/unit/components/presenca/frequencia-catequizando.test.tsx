// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FrequenciaCatequizando } from "@/components/presenca/frequencia-catequizando";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { ContagemFrequencia, StatusPresenca } from "@/modules/presenca/domain/frequencia";
import type { ProgressoCatequizando } from "@/modules/presenca/domain/progresso-catequizando";

type Props = Parameters<typeof FrequenciaCatequizando>[0];

const d = (s: string) => s as DataCivil;

function contagem(presentes: number, ausentes: number, justificados = 0): ContagemFrequencia {
  return { presentes, ausentes, justificados, total: presentes + ausentes + justificados };
}

const progressoVazio: ProgressoCatequizando = { cumpridos: [], total: 0, pendentes: [] };

function renderizar(parcial: Partial<Props> = {}) {
  return render(
    <FrequenciaCatequizando
      turmas={[]}
      limite={75}
      presencas={[]}
      progresso={progressoVazio}
      {...parcial}
    />,
  );
}

const turmas: Props["turmas"] = [
  { turmaId: "t2", turmaNome: "Turma B", ciclo: 2026, atual: true, contagem: contagem(1, 3) },
  { turmaId: "t1", turmaNome: "Turma A", ciclo: 2025, atual: false, contagem: contagem(1, 3) },
];

describe("FrequenciaCatequizando", () => {
  it("mostra a frequência de cada turma, com a atual em destaque (5.6)", () => {
    renderizar({ turmas });
    const itens = screen
      .getAllByRole("listitem")
      .filter((li) => li.className.includes("presenca-inscrito"));
    expect(itens).toHaveLength(2);
    expect(itens[0].className).toContain("presenca-turma-atual");
    expect(within(itens[0]).getByText("Turma atual")).toBeTruthy();
    expect(within(itens[0]).getByText("Turma B")).toBeTruthy();
    expect(within(itens[0]).getByText(/2026/)).toBeTruthy();
    expect(within(itens[0]).getByText("25%")).toBeTruthy();
    expect(within(itens[0]).getByText("1 presente · 3 ausentes · 0 justificados")).toBeTruthy();
    expect(itens[1].className).not.toContain("presenca-turma-atual");
    expect(within(itens[1]).queryByText("Turma atual")).toBeNull();
  });

  it("mostra o selo de baixa frequência só na turma atual abaixo do limite (5.7)", () => {
    renderizar({ turmas });
    expect(screen.getAllByText("Baixa frequência")).toHaveLength(1);
    const atual = screen.getByText("Turma B").closest("li")!;
    expect(within(atual).getByText("Baixa frequência")).toBeTruthy();
  });

  it("não mostra o selo quando a turma atual está no limite ou acima", () => {
    renderizar({ turmas: [{ ...turmas[0], contagem: contagem(3, 1) }] });
    expect(screen.queryByText("Baixa frequência")).toBeNull();
  });

  it("mostra 'Sem encontros registrados' quando não há registros", () => {
    renderizar({ turmas: [{ ...turmas[0], contagem: contagem(0, 0) }] });
    expect(screen.getByText("Sem encontros registrados")).toBeTruthy();
    expect(screen.queryByText(/NaN|%/)).toBeNull();
    expect(screen.queryByText("Baixa frequência")).toBeNull();
  });

  it("lista as presenças na ordem recebida com data e dia da semana (8.2)", () => {
    const presencas: Props["presencas"] = [
      {
        data: d("2026-03-14"),
        horario: "09:00",
        turmaNome: "Turma B",
        temaTitulo: "Batismo",
        status: "presente" as StatusPresenca,
        visitante: false,
      },
      {
        data: d("2026-03-07"),
        turmaNome: "Turma C",
        temaTitulo: null,
        status: "ausente",
        visitante: true,
      },
    ];
    renderizar({ presencas });
    const lista = screen.getByRole("list", { name: "Presenças" });
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toContain("14/03/2026");
    expect(itens[0].textContent).toMatch(/sábado/i);
    expect(itens[0].textContent).toContain("09:00");
    expect(within(itens[0]).getByText("Batismo")).toBeTruthy();
    expect(within(itens[0]).getByText("Presente")).toBeTruthy();
    expect(within(itens[0]).queryByText("Visitante")).toBeNull();
    expect(itens[1].textContent).toContain("07/03/2026");
    expect(within(itens[1]).getByText("Sem tema do programa")).toBeTruthy();
    expect(within(itens[1]).getByText("Ausente")).toBeTruthy();
    expect(within(itens[1]).getByText("Visitante")).toBeTruthy();
    expect(within(itens[1]).getByText("Turma C")).toBeTruthy();
  });

  it("mostra o estado vazio das presenças", () => {
    renderizar();
    expect(screen.getByText("Nenhuma presença registrada.")).toBeTruthy();
  });

  it("mostra o progresso, a origem de cada cumprimento e os pendentes na ordem do programa (8.3, 10.5)", () => {
    const progresso: ProgressoCatequizando = {
      cumpridos: [
        {
          temaId: "a",
          titulo: "Criação",
          numero: 1,
          turmaNome: "Turma B",
          data: d("2026-03-14"),
          visitante: false,
        },
        {
          temaId: "b",
          titulo: "Pecado",
          numero: 2,
          turmaNome: "Turma C",
          data: d("2026-03-21"),
          visitante: true,
        },
      ],
      total: 4,
      pendentes: [
        { id: "c", titulo: "Aliança", numero: 3 },
        { id: "d", titulo: "Profetas", numero: 4 },
      ],
    };
    renderizar({ progresso });
    expect(screen.getByText("2 de 4 temas")).toBeTruthy();
    expect(screen.getByText("Cumprido na turma Turma B em 14/03/2026")).toBeTruthy();
    expect(screen.getByText("Cumprido por reposição na turma Turma C em 21/03/2026")).toBeTruthy();
    expect(screen.getByText(/1\. Criação/)).toBeTruthy();
    const pendentes = screen.getByRole("list", { name: "Temas pendentes" });
    expect(
      within(pendentes)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["3. Aliança", "4. Profetas"]);
  });

  it("mostra os estados vazios do progresso", () => {
    renderizar({
      progresso: {
        cumpridos: [
          {
            temaId: "a",
            titulo: "Criação",
            numero: 1,
            turmaNome: "Turma B",
            data: d("2026-03-14"),
            visitante: false,
          },
        ],
        total: 1,
        pendentes: [],
      },
    });
    expect(screen.getByText("1 de 1 temas")).toBeTruthy();
    expect(screen.getByText("Todos os temas cumpridos.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Temas pendentes" })).toBeNull();
  });

  it("mostra mensagem quando nenhum tema foi cumprido", () => {
    renderizar({
      progresso: { cumpridos: [], total: 2, pendentes: [{ id: "c", titulo: "X", numero: 1 }] },
    });
    expect(screen.getByText("0 de 2 temas")).toBeTruthy();
    expect(screen.getByText("Nenhum tema cumprido ainda.")).toBeTruthy();
  });
});
