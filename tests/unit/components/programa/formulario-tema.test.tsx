// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/programa/actions", () => ({}));

import { CamposTema, FormularioTema } from "@/components/programa/formulario-tema";

describe("FormularioTema", () => {
  it("mostra título, descrição (textarea) e o botão de criação", () => {
    render(<FormularioTema modo="criar" acao={vi.fn(async () => ({}))} />);
    expect(screen.getByLabelText("Título")).toHaveAttribute("name", "titulo");
    expect(screen.getByLabelText("Descrição").tagName).toBe("TEXTAREA");
    expect(screen.getByRole("button", { name: "Criar tema" })).toBeEnabled();
  });

  it("usa valores iniciais e o botão de edição", () => {
    render(
      <FormularioTema
        modo="editar"
        acao={vi.fn(async () => ({}))}
        valoresIniciais={{ titulo: "Criação", descricao: "Deus cria" }}
      />,
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Criação");
    expect(screen.getByLabelText("Descrição")).toHaveValue("Deus cria");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("liga os erros aos campos e mostra o erro geral", () => {
    render(
      <CamposTema
        modo="criar"
        estado={{
          erro: "Falhou.",
          errosCampos: { titulo: "Informe o título", descricao: "Longa demais" },
        }}
        pendente={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
    for (const [rotulo, msg] of [
      ["Título", "Informe o título"],
      ["Descrição", "Longa demais"],
    ]) {
      const campo = screen.getByLabelText(rotulo);
      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(document.getElementById(campo.getAttribute("aria-describedby")!)).toHaveTextContent(
        msg,
      );
    }
  });
});
