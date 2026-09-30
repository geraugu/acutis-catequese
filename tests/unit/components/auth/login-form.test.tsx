// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/actions", () => ({ entrarAction: vi.fn() }));

import { CamposLogin, LoginForm } from "@/components/auth/login-form";

describe("CamposLogin", () => {
  it("renderiza campos rotulados com autocomplete e botão Entrar", () => {
    render(<CamposLogin estado={{}} pendente={false} />);
    const email = screen.getByLabelText("E-mail");
    const senha = screen.getByLabelText("Senha");
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("aria-required", "true");
    expect(senha).toHaveAttribute("autocomplete", "current-password");
    expect(senha).toHaveAttribute("type", "password");
    expect(senha).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("inclui callbackUrl oculto quando informado", () => {
    const { container } = render(
      <CamposLogin estado={{}} pendente={false} callbackUrl="/coordenacao" />,
    );
    const oculto = container.querySelector('input[type="hidden"][name="callbackUrl"]');
    expect(oculto).toHaveValue("/coordenacao");
  });

  it("não inclui callbackUrl quando ausente", () => {
    const { container } = render(<CamposLogin estado={{}} pendente={false} />);
    expect(container.querySelector('input[name="callbackUrl"]')).toBeNull();
  });

  it("mostra erros de campo ligados por aria-describedby e aria-invalid", () => {
    render(
      <CamposLogin
        estado={{
          errosCampos: { email: "Informe o e-mail.", senha: "Informe a senha." },
          email: "x",
        }}
        pendente={false}
      />,
    );
    const email = screen.getByLabelText("E-mail");
    const senha = screen.getByLabelText("Senha");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(senha).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Informe o e-mail.");
    expect(senha).toHaveAccessibleDescription("Informe a senha.");
    expect(email).toHaveValue("x");
  });

  it("mostra erro geral em role=alert", () => {
    render(<CamposLogin estado={{ erro: "E-mail ou senha inválidos." }} pendente={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-invalid");
  });

  it("desabilita o botão enquanto pendente", () => {
    render(<CamposLogin estado={{}} pendente />);
    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled();
  });

  it("ordem de tab: e-mail → senha → Entrar", async () => {
    const user = userEvent.setup();
    render(<CamposLogin estado={{}} pendente={false} />);
    await user.tab();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Senha")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Entrar" })).toHaveFocus();
  });
});

describe("LoginForm", () => {
  it("renderiza um formulário com os campos", () => {
    render(<LoginForm callbackUrl="/catequista" />);
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
});
