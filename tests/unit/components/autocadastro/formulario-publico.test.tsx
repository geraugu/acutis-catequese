// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/catequizandos/actions", () => ({}));
vi.mock("@/modules/autocadastro/actions-publicas", () => ({}));

import { FormularioPublico } from "@/components/autocadastro/formulario-publico";
import type { EstadoEnvio } from "@/modules/autocadastro/actions-publicas";
import { TEXTO_CONSENTIMENTO } from "@/modules/autocadastro/domain/consentimento";
import {
  CAMPO_CONSENTIMENTO,
  MSG_CONSENTIMENTO,
  MSG_INDISPONIVEL,
  MSG_LIMITE,
  MSG_RECEBIDA,
} from "@/modules/autocadastro/mensagens";

const acao = vi.fn(async (): Promise<EstadoEnvio> => ({ tipo: "inicial" }));

function renderizar(estadoInicial?: EstadoEnvio) {
  return render(<FormularioPublico acao={acao} estadoInicial={estadoInicial} />);
}

describe("FormularioPublico", () => {
  it("mostra os campos com prefixo, o consentimento desmarcado e o botão de envio", () => {
    const { container } = renderizar();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("id", "autocadastro-nome");
    const caixa = screen.getByRole("checkbox", { name: TEXTO_CONSENTIMENTO });
    expect(caixa).toHaveAttribute("name", CAMPO_CONSENTIMENTO);
    expect(caixa).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Enviar ficha" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Cadastrar catequizando" })).toBeNull();
    expect(container.textContent).not.toMatch(/acompanhamento pastoral/i);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("liga os erros de campo e de consentimento, com resumo, preservando os valores", () => {
    renderizar({
      tipo: "invalido",
      errosCampos: { nome: "Informe o nome." },
      valores: { nome: "", telefone: "11999990000" },
      erroConsentimento: MSG_CONSENTIMENTO,
    });
    const nome = screen.getByLabelText("Nome");
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Telefone")).toHaveValue("11999990000");
    const caixa = screen.getByRole("checkbox", { name: TEXTO_CONSENTIMENTO });
    expect(caixa).toHaveAttribute("aria-invalid", "true");
    expect(caixa).not.toBeChecked();
    const erro = document.getElementById(caixa.getAttribute("aria-describedby") ?? "");
    expect(erro).toHaveTextContent(MSG_CONSENTIMENTO);
    expect(screen.getByRole("alert")).toHaveTextContent(/corrija/i);
  });

  it("mostra a mensagem de limite mantendo o formulário", () => {
    renderizar({ tipo: "limite" });
    expect(screen.getByRole("alert")).toHaveTextContent(MSG_LIMITE);
    expect(screen.getByRole("button", { name: "Enviar ficha" })).toBeInTheDocument();
  });

  it("troca o formulário pela mensagem de indisponível", () => {
    renderizar({ tipo: "indisponivel" });
    expect(screen.getByText(MSG_INDISPONIVEL)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("troca o formulário pelo recebimento sem repetir os dados", () => {
    const { container } = renderizar({ tipo: "recebida" });
    expect(screen.getByRole("status")).toHaveTextContent(MSG_RECEBIDA);
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input, textarea")).toBeNull();
  });
});
