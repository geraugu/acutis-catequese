// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/programa/actions", () => ({}));

import { CamposEncontro, FormularioEncontro } from "@/components/programa/formulario-encontro";

const temas = [
  { id: "t1", titulo: "Criação", numero: 1, ativo: true },
  { id: "t2", titulo: "Antigo", numero: null, ativo: false },
];

describe("FormularioEncontro", () => {
  it("mostra os campos rotulados, o horário inicial e o botão de criação", () => {
    render(
      <FormularioEncontro
        modo="criar"
        acao={vi.fn(async () => ({}))}
        temas={temas}
        valoresIniciais={{ horario: "09:30" }}
      />,
    );
    expect(screen.getByLabelText("Data")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Horário")).toHaveValue("09:30");
    const tema = screen.getByLabelText("Tema");
    expect(within(tema).getByRole("option", { name: "Sem tema do programa" })).toHaveValue("");
    expect(within(tema).getByRole("option", { name: "1. Criação" })).toHaveValue("t1");
    expect(within(tema).getByRole("option", { name: "Antigo (Desativado)" })).toHaveValue("t2");
    expect(screen.getByLabelText("Observações").tagName).toBe("TEXTAREA");
    expect(screen.getByRole("button", { name: "Criar encontro" })).toBeEnabled();
  });

  it("pré-seleciona o tema em edição", () => {
    render(
      <FormularioEncontro
        modo="editar"
        acao={vi.fn(async () => ({}))}
        temas={temas}
        valoresIniciais={{ data: "2026-10-04", horario: "10:00", temaId: "t2" }}
      />,
    );
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-04");
    expect(screen.getByLabelText("Tema")).toHaveValue("t2");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("mostra o alerta de tema repetido e o reenvio com confirmação depois do botão principal", () => {
    render(
      <CamposEncontro
        modo="criar"
        temas={temas}
        estado={{ temaRepetido: { data: "04/10/2026" }, valores: { temaId: "t1" } }}
        pendente={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Este tema já tem encontro nesta turma em 04/10/2026.",
    );
    const principal = screen.getByRole("button", { name: "Criar encontro" });
    const confirmar = screen.getByRole("button", { name: "Salvar mesmo assim" });
    expect(confirmar).toHaveAttribute("name", "confirmarTemaRepetido");
    expect(confirmar).toHaveAttribute("value", "1");
    expect(
      principal.compareDocumentPosition(confirmar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("não mostra a confirmação sem tema repetido", () => {
    render(<CamposEncontro modo="criar" temas={temas} estado={{}} pendente={false} />);
    expect(screen.queryByRole("button", { name: "Salvar mesmo assim" })).toBeNull();
  });

  it("liga os erros aos campos e mostra o erro geral", () => {
    render(
      <CamposEncontro
        modo="criar"
        temas={temas}
        estado={{
          erro: "Falhou.",
          errosCampos: { data: "Informe a data", horario: "Conflito", temaId: "Indisponível" },
        }}
        pendente={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
    for (const [rotulo, msg] of [
      ["Data", "Informe a data"],
      ["Horário", "Conflito"],
      ["Tema", "Indisponível"],
    ]) {
      const campo = screen.getByLabelText(rotulo);
      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(campo).toHaveAccessibleDescription(msg);
    }
  });

  it("desabilita os botões enquanto pendente", () => {
    render(
      <CamposEncontro
        modo="editar"
        temas={temas}
        estado={{ temaRepetido: { data: "04/10/2026" } }}
        pendente
      />,
    );
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });
});
