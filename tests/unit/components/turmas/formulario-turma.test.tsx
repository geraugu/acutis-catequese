// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/turmas/actions", () => ({}));

import { CamposTurma, FormularioTurma } from "@/components/turmas/formulario-turma";

const acao = vi.fn(async () => ({}));

describe("CamposTurma", () => {
  it("mostra os campos rotulados e o botão de criação", () => {
    render(<CamposTurma modo="criar" estado={{}} pendente={false} />);
    expect(screen.getByLabelText("Nome")).toHaveAttribute("name", "nome");
    expect(screen.getByLabelText("Ciclo (ano)")).toHaveAttribute("type", "number");
    const dia = screen.getByLabelText("Dia da semana");
    expect(dia.tagName).toBe("SELECT");
    expect(dia).toHaveAttribute("name", "diaSemana");
    expect(within(dia).getByRole("option", { name: "Terça-feira" })).toHaveValue("terca");
    expect(within(dia).getAllByRole("option")).toHaveLength(8);
    expect(screen.getByLabelText("Horário")).toHaveAttribute("type", "time");
    expect(screen.getByLabelText("Local")).toHaveAttribute("name", "local");
    expect(screen.getByLabelText("Observações").tagName).toBe("TEXTAREA");
    const vagas = screen.getByLabelText("Vagas");
    expect(vagas).toHaveAttribute("type", "number");
    expect(document.getElementById(vagas.getAttribute("aria-describedby")!)).toHaveTextContent(
      /sem limite/i,
    );
    expect(screen.getByRole("button", { name: "Criar turma" })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("liga os erros aos campos e mostra o erro geral", () => {
    render(
      <CamposTurma
        modo="criar"
        estado={{
          erro: "Algo deu errado.",
          errosCampos: {
            nome: "Informe o nome",
            horario: "Horário inválido",
            vagas: "Vagas inválidas",
          },
        }}
        pendente={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Algo deu errado.");
    for (const [rotulo, msg] of [
      ["Nome", "Informe o nome"],
      ["Horário", "Horário inválido"],
      ["Vagas", "Vagas inválidas"],
    ]) {
      const campo = screen.getByLabelText(rotulo);
      expect(campo).toHaveAttribute("aria-invalid", "true");
      const ids = campo.getAttribute("aria-describedby")!.split(" ");
      expect(ids.map((id) => document.getElementById(id)?.textContent).join(" ")).toContain(msg);
    }
    expect(screen.getByLabelText("Local")).not.toHaveAttribute("aria-invalid");
  });

  it("reapresenta valores e mostra o botão pendente", () => {
    render(
      <CamposTurma
        modo="editar"
        estado={{ valores: { nome: "Turma A", diaSemana: "sabado", horario: "09:30", vagas: "" } }}
        pendente
      />,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Turma A");
    expect(screen.getByLabelText("Dia da semana")).toHaveValue("sabado");
    expect(screen.getByLabelText("Horário")).toHaveValue("09:30");
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
  });
});

describe("FormularioTurma", () => {
  it("usa os valores iniciais na edição e o texto de salvar", () => {
    render(
      <FormularioTurma
        modo="editar"
        acao={acao}
        valoresIniciais={{
          nome: "Turma B",
          ciclo: "2026",
          diaSemana: "quarta",
          horario: "19:00",
          local: "Sala 2",
          observacoes: "Obs",
          vagas: "20",
        }}
      />,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Turma B");
    expect(screen.getByLabelText("Ciclo (ano)")).toHaveValue(2026);
    expect(screen.getByLabelText("Dia da semana")).toHaveValue("quarta");
    expect(screen.getByLabelText("Horário")).toHaveValue("19:00");
    expect(screen.getByLabelText("Local")).toHaveValue("Sala 2");
    expect(screen.getByLabelText("Observações")).toHaveValue("Obs");
    expect(screen.getByLabelText("Vagas")).toHaveValue(20);
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });
});
