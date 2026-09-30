// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/catequizandos/actions", () => ({}));

import { CamposFicha, FormularioFicha } from "@/components/catequizandos/formulario-ficha";
import { MSG_POSSIVEL_DUPLICADO } from "@/modules/catequizandos/mensagens";

const acao = vi.fn(async () => ({}));

describe("CamposFicha", () => {
  it("mostra os campos, um fieldset por sacramento e a dica das observações", () => {
    const { container } = render(<CamposFicha modo="criacao" estado={{}} pendente={false} />);
    expect(screen.getByLabelText("Nome")).toHaveAttribute("name", "nome");
    expect(screen.getByLabelText("Data de nascimento")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Telefone")).toHaveAttribute("name", "telefone");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Endereço")).toHaveAttribute("name", "endereco");
    const obs = screen.getByLabelText("Observações");
    expect(obs.tagName).toBe("TEXTAREA");
    const dica = document.getElementById(obs.getAttribute("aria-describedby") ?? "");
    expect(dica).toHaveTextContent(/acompanhamento pastoral/i);
    for (const [s, rotulo] of [
      ["batismo", "Batismo"],
      ["eucaristia", "Eucaristia"],
      ["crisma", "Crisma"],
    ]) {
      const grupo = screen.getByRole("group", { name: rotulo });
      expect(within(grupo).getByLabelText("Recebido")).toHaveAttribute("name", `${s}Recebido`);
      expect(container.querySelector(`input[name="${s}Data"]`)).toHaveAttribute("type", "date");
      expect(container.querySelector(`input[name="${s}Paroquia"]`)).not.toBeNull();
    }
    expect(screen.getByRole("button", { name: "Cadastrar catequizando" })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("liga os erros aos campos, inclusive crismaData", () => {
    render(
      <CamposFicha
        modo="criacao"
        estado={{ errosCampos: { nome: "Informe o nome.", crismaData: "Data inválida." } }}
        pendente={false}
      />,
    );
    const nome = screen.getByLabelText("Nome");
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(nome.getAttribute("aria-describedby")!)).toHaveTextContent(
      "Informe o nome.",
    );
    const grupo = screen.getByRole("group", { name: "Crisma" });
    const data = within(grupo).getByLabelText("Data");
    expect(data).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(data.getAttribute("aria-describedby")!)).toHaveTextContent(
      "Data inválida.",
    );
  });

  it("reapresenta valores, inclusive checkbox marcado", () => {
    render(
      <CamposFicha
        modo="edicao"
        estado={{
          valores: { nome: "Ana", batismoRecebido: "on", batismoParoquia: "São José" },
        }}
        pendente={false}
      />,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    const batismo = screen.getByRole("group", { name: "Batismo" });
    expect(within(batismo).getByLabelText("Recebido")).toBeChecked();
    expect(within(batismo).getByLabelText("Paróquia")).toHaveValue("São José");
    const crisma = screen.getByRole("group", { name: "Crisma" });
    expect(within(crisma).getByLabelText("Recebido")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("mostra erro geral e desabilita o botão quando pendente", () => {
    render(<CamposFicha modo="criacao" estado={{ erro: "Falhou." }} pendente />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });

  it("aviso de duplicidade com link e 'Salvar mesmo assim'", () => {
    render(
      <CamposFicha
        modo="criacao"
        estado={{ duplicado: { id: "abc", nome: "Ana Souza" }, valores: { nome: "Ana Souza" } }}
        pendente={false}
      />,
    );
    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent(MSG_POSSIVEL_DUPLICADO);
    expect(within(aviso).getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      "/coordenacao/catequizandos/abc",
    );
    const botao = screen.getByRole("button", { name: "Salvar mesmo assim" });
    expect(botao).toHaveAttribute("name", "confirmarDuplicidade");
    expect(botao).toHaveAttribute("value", "1");
    expect(botao).toHaveAttribute("type", "submit");
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Souza");
  });
});

describe("FormularioFicha", () => {
  it("com duplicado, o primeiro submit do form é o principal (Enter não confirma)", () => {
    const { container } = render(
      <FormularioFicha modo="criacao" acao={acao} valoresIniciais={{ nome: "Ana" }} />,
    );
    // Estado inicial sem duplicado; valida a ordem com CamposFicha dentro de um form.
    expect(container.querySelector("form")).not.toBeNull();
    const { container: c2 } = render(
      <form>
        <CamposFicha
          modo="criacao"
          estado={{ duplicado: { id: "abc", nome: "Ana" } }}
          pendente={false}
        />
      </form>,
    );
    const primeiro = c2.querySelector('button[type="submit"]');
    expect(primeiro).not.toHaveAttribute("name", "confirmarDuplicidade");
    expect(primeiro).toHaveTextContent("Cadastrar catequizando");
    expect(c2.querySelectorAll('button[type="submit"]')).toHaveLength(2);
  });

  it("usa valoresIniciais e renderiza dentro de um form", () => {
    const { container } = render(
      <FormularioFicha modo="edicao" acao={acao} valoresIniciais={{ nome: "Bia" }} />,
    );
    expect(container.querySelector("form.formulario")).not.toBeNull();
    expect(screen.getByLabelText("Nome")).toHaveValue("Bia");
  });
});
