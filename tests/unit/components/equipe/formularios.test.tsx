// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/equipe/actions", () => ({}));

import { CamposMembro, FormularioMembro } from "@/components/equipe/formulario-membro";
import { CamposSenha, FormularioSenha } from "@/components/equipe/formulario-senha";

const acao = vi.fn(async () => ({}));

describe("CamposMembro", () => {
  it("modo criação: tem senha e catequista pré-selecionado", () => {
    render(<CamposMembro modo="criacao" estado={{}} pendente={false} />);
    expect(screen.getByLabelText("Senha inicial")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Catequista")).toBeChecked();
    expect(screen.getByLabelText("Coordenação")).not.toBeChecked();
    expect(screen.getByText(/não registre dados sensíveis/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("modo edição: sem campo de senha", () => {
    const { container } = render(<CamposMembro modo="edicao" estado={{}} pendente={false} />);
    expect(container.querySelector('input[name="senha"]')).toBeNull();
    expect(screen.queryByLabelText(/senha/i)).toBeNull();
  });

  it("liga erros aos campos, reapresenta valores e mantém a senha vazia", () => {
    render(
      <CamposMembro
        modo="criacao"
        pendente={false}
        estado={{
          erro: "Revise os campos.",
          errosCampos: { nome: "Informe o nome.", senha: "Senha curta." },
          valores: { nome: "", email: "a@b.com", papel: "coordenacao", observacoes: "obs" },
        }}
      />,
    );
    const nome = screen.getByLabelText("Nome");
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(nome).toHaveAttribute("aria-describedby", "membro-nome-erro");
    expect(document.getElementById("membro-nome-erro")).toHaveTextContent("Informe o nome.");
    const senha = screen.getByLabelText("Senha inicial");
    expect(senha).toHaveAttribute("aria-describedby", "membro-senha-erro");
    expect(senha).toHaveValue("");
    expect(screen.getByLabelText("E-mail")).toHaveValue("a@b.com");
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Coordenação")).toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent("Revise os campos.");
  });

  it("desabilita o botão durante o envio", () => {
    render(<CamposMembro modo="criacao" estado={{}} pendente />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("FormularioMembro renderiza com a action recebida", () => {
    render(<FormularioMembro modo="edicao" acao={acao} valoresIniciais={{ nome: "Ana" }} />);
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
  });
});

describe("CamposSenha", () => {
  it("único campo, erro ligado e vazio", () => {
    render(
      <CamposSenha
        pendente={false}
        estado={{ erro: "Falhou.", errosCampos: { senha: "Senha curta." } }}
      />,
    );
    const senha = screen.getByLabelText("Nova senha");
    expect(senha).toHaveValue("");
    expect(senha).toHaveAttribute("aria-invalid", "true");
    expect(senha).toHaveAttribute("aria-describedby", "senha-nova-erro");
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
  });

  it("FormularioSenha renderiza", () => {
    render(<FormularioSenha acao={acao} />);
    expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeEnabled();
  });
});
