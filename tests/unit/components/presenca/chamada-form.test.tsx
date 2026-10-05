// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/presenca/actions", () => ({}));

import { ChamadaForm } from "@/components/presenca/chamada-form";
import { StatusPresenca } from "@/components/presenca/status-presenca";

const linhas = [
  { catequizandoId: "a", nome: "Ana", status: null },
  { catequizandoId: "b", nome: "Bruno", status: null },
  { catequizandoId: "c", nome: "Carla", status: null },
] as const;

const acao = () => vi.fn(async () => ({}));

function grupo(nome: string) {
  return screen.getByRole("group", { name: nome });
}

describe("ChamadaForm", () => {
  it("lista os inscritos sem nenhum status pré-selecionado", () => {
    render(<ChamadaForm linhas={linhas} visitantes={[]} action={acao()} modo="nova" />);
    expect(screen.getAllByRole("radio")).toHaveLength(9);
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
    expect(grupo("Ana")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar chamada" })).toBeInTheDocument();
  });

  it("pré-preenche as linhas que já têm status e usa o rótulo da correção", () => {
    render(
      <ChamadaForm
        linhas={[{ catequizandoId: "a", nome: "Ana", status: "justificado" }]}
        visitantes={[]}
        action={acao()}
        modo="correcao"
      />,
    );
    expect(within(grupo("Ana")).getByRole("radio", { name: "Justificado" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("usa nomes e valores de rádio por catequizando", () => {
    render(<ChamadaForm linhas={linhas} visitantes={[]} action={acao()} modo="nova" />);
    const r = within(grupo("Bruno")).getByRole("radio", { name: "Ausente" });
    expect(r).toHaveAttribute("name", "status:b");
    expect(r).toHaveAttribute("value", "ausente");
  });

  it("marca todos como presentes", async () => {
    const user = userEvent.setup();
    render(<ChamadaForm linhas={linhas} visitantes={[]} action={acao()} modo="nova" />);
    await user.click(screen.getByRole("button", { name: "Marcar todos como presentes" }));
    for (const nome of ["Ana", "Bruno", "Carla"]) {
      expect(within(grupo(nome)).getByRole("radio", { name: "Presente" })).toBeChecked();
    }
  });

  it("atualiza os totais ao marcar", async () => {
    const user = userEvent.setup();
    render(<ChamadaForm linhas={linhas} visitantes={[]} action={acao()} modo="nova" />);
    const totais = screen.getByLabelText("Totais da chamada");
    expect(totais).toHaveTextContent("Sem marcação: 3");
    await user.click(within(grupo("Ana")).getByRole("radio", { name: "Presente" }));
    await user.click(within(grupo("Bruno")).getByRole("radio", { name: "Ausente" }));
    expect(totais).toHaveTextContent("Presentes: 1");
    expect(totais).toHaveTextContent("Ausentes: 1");
    expect(totais).toHaveTextContent("Justificados: 0");
    expect(totais).toHaveTextContent("Sem marcação: 1");
  });

  it("destaca os faltantes com a mensagem e avisa no topo", () => {
    render(
      <ChamadaForm
        linhas={linhas}
        visitantes={[]}
        action={acao()}
        modo="nova"
        estadoInicial={{
          erro: "Marque a presença de todos os catequizandos.",
          faltantes: ["b"],
          valores: { "status:a": "presente" },
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Marque a presença de todos os catequizandos.",
    );
    expect(grupo("Bruno")).toHaveClass("presenca-linha-faltante");
    expect(within(grupo("Bruno")).getByText("Marque a presença deste catequizando.")).toBeVisible();
    expect(grupo("Ana")).not.toHaveClass("presenca-linha-faltante");
    expect(within(grupo("Ana")).queryByText(/Marque a presença/)).toBeNull();
  });

  it("mantém as marcações depois de um estado de erro", () => {
    render(
      <ChamadaForm
        linhas={linhas}
        visitantes={[]}
        action={acao()}
        modo="nova"
        estadoInicial={{
          erro: "Não foi possível concluir agora.",
          valores: { "status:a": "ausente", "status:c": "justificado" },
        }}
      />,
    );
    expect(within(grupo("Ana")).getByRole("radio", { name: "Ausente" })).toBeChecked();
    expect(within(grupo("Carla")).getByRole("radio", { name: "Justificado" })).toBeChecked();
    expect(
      within(grupo("Bruno"))
        .getAllByRole("radio")
        .every((r) => !(r as HTMLInputElement).checked),
    ).toBe(true);
  });

  it("reaplica as marcações devolvidas pela ação depois do envio", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      erro: "Marque a presença de todos os catequizandos.",
      faltantes: ["b", "c"],
      valores: { "status:a": "presente" },
    }));
    render(<ChamadaForm linhas={linhas} visitantes={[]} action={action} modo="nova" />);
    await user.click(within(grupo("Ana")).getByRole("radio", { name: "Presente" }));
    await user.click(screen.getByRole("button", { name: "Salvar chamada" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(within(grupo("Ana")).getByRole("radio", { name: "Presente" })).toBeChecked();
    expect(grupo("Bruno")).toHaveClass("presenca-linha-faltante");
  });

  it("mostra os visitantes à parte com o selo e a turma de origem", () => {
    render(
      <ChamadaForm
        linhas={linhas}
        visitantes={[{ catequizandoId: "v", nome: "Vítor", turmaOrigemNome: "Turma Azul" }]}
        action={acao()}
        modo="nova"
      />,
    );
    const secao = screen.getByRole("region", { name: "Visitantes" });
    expect(within(secao).getByText("Vítor")).toBeInTheDocument();
    expect(within(secao).getByText("Visitante")).toBeInTheDocument();
    expect(within(secao).getByText("Turma de origem: Turma Azul")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Vítor" })).toBeNull();
  });

  it("navega entre os rádios só com o teclado", async () => {
    const user = userEvent.setup();
    render(<ChamadaForm linhas={linhas} visitantes={[]} action={acao()} modo="nova" />);
    const presente = within(grupo("Ana")).getByRole("radio", { name: "Presente" });
    presente.focus();
    await user.keyboard("{ArrowRight}");
    expect(within(grupo("Ana")).getByRole("radio", { name: "Ausente" })).toBeChecked();
    expect(screen.getByLabelText("Totais da chamada")).toHaveTextContent("Ausentes: 1");
    await user.keyboard("{ArrowRight}");
    expect(within(grupo("Ana")).getByRole("radio", { name: "Justificado" })).toBeChecked();
  });
});

describe("StatusPresenca", () => {
  it.each([
    ["presente", "Presente"],
    ["ausente", "Ausente"],
    ["justificado", "Justificado"],
  ] as const)("mostra texto e ícone para %s", (status, rotulo) => {
    const { container } = render(<StatusPresenca status={status} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
    const icone = container.querySelector("svg");
    expect(icone).toHaveAttribute("aria-hidden", "true");
    expect(icone?.querySelector("path")).not.toBeNull();
  });
});
