// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AlertasFrequencia } from "@/components/presenca/alertas-frequencia";
import { FormularioLimite, type AcaoLimite } from "@/components/presenca/formulario-limite";
import type { ContagemFrequencia } from "@/modules/presenca/domain/frequencia";
import type { EstadoPresenca } from "@/modules/presenca/actions";

function contagem(presentes: number, ausentes: number, justificados = 0): ContagemFrequencia {
  return { presentes, ausentes, justificados, total: presentes + ausentes + justificados };
}

const alerta = (id: string, nome: string, c: ContagemFrequencia, href?: string) => ({
  catequizandoId: id,
  nome,
  turmaId: "t1",
  turmaNome: "Turma A",
  contagem: c,
  href,
});

describe("AlertasFrequencia", () => {
  it("exibe o limite em vigor (7.10)", () => {
    render(<AlertasFrequencia alertas={[]} limite={70} />);
    expect(screen.getByText("Limite de frequência: 70%")).toBeTruthy();
  });

  it("mostra mensagem positiva quando não há alertas (7.8)", () => {
    render(<AlertasFrequencia alertas={[]} limite={75} />);
    expect(screen.getByText("Nenhum catequizando em baixa frequência. Tudo em dia!")).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("lista na ordem recebida com percentual, contagens, turma e selo (7.2, 7.3, 7.9)", () => {
    render(
      <AlertasFrequencia
        alertas={[
          alerta("a", "Zélia", contagem(1, 3), "/catequizandos/a"),
          alerta("b", "Ana", contagem(2, 1, 1)),
        ]}
        limite={75}
      />,
    );
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toContain("Zélia");
    expect(itens[0].textContent).toContain("25%");
    expect(itens[0].textContent).toContain("1 presente · 3 ausentes · 0 justificados");
    expect(itens[0].textContent).toContain("Turma A");
    expect(itens[0].textContent).toContain("Baixa frequência");
    expect(screen.getByRole("link", { name: "Zélia" }).getAttribute("href")).toBe(
      "/catequizandos/a",
    );
    expect(itens[1].textContent).toContain("Ana");
    expect(itens[1].textContent).toContain("50%");
    expect(itens[1].textContent).toContain("2 presentes · 1 ausente · 1 justificado");
    expect(screen.queryByRole("link", { name: "Ana" })).toBeNull();
  });
});

describe("FormularioLimite", () => {
  it("inicia com o limite atual e envia o percentual à ação (7.6)", async () => {
    const acao = vi.fn<AcaoLimite>(async () => ({}));
    render(<FormularioLimite limiteAtual={75} salvarLimiteAction={acao} />);
    const campo = screen.getByLabelText("Limite de frequência (%)") as HTMLInputElement;
    expect(campo.value).toBe("75");
    expect(campo.getAttribute("inputmode")).toBe("numeric");
    await userEvent.clear(campo);
    await userEvent.type(campo, "60");
    await userEvent.click(screen.getByRole("button", { name: "Salvar limite" }));
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
    expect((acao.mock.calls[0][1] as FormData).get("percentual")).toBe("60");
  });

  it("mostra o erro junto ao campo e mantém o valor digitado (7.7)", async () => {
    const acao = vi.fn(async (): Promise<EstadoPresenca> => ({
      errosCampos: { percentual: "Informe um número entre 0 e 100." },
      valores: { percentual: "150" },
    }));
    render(<FormularioLimite limiteAtual={75} salvarLimiteAction={acao} />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar limite" }));
    const campo = (await screen.findByLabelText("Limite de frequência (%)")) as HTMLInputElement;
    await waitFor(() => expect(campo.getAttribute("aria-invalid")).toBe("true"));
    expect(campo.value).toBe("150");
    const erro = screen.getByText("Informe um número entre 0 e 100.");
    expect(campo.getAttribute("aria-describedby")).toBe(erro.id);
  });

  it("exibe a mensagem geral em alerta", async () => {
    const acao = vi.fn(async (): Promise<EstadoPresenca> => ({ erro: "Falha ao salvar." }));
    render(<FormularioLimite limiteAtual={75} salvarLimiteAction={acao} />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar limite" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Falha ao salvar.");
  });
});
