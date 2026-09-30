// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Aviso } from "@/components/comum/aviso";
import { Confirmacao } from "@/components/comum/confirmacao";
import { Paginacao } from "@/components/comum/paginacao";

beforeAll(() => {
  // jsdom não implementa showModal/close do <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("Aviso", () => {
  it("mostra a mensagem com role=status", () => {
    render(<Aviso mensagem="Ficha salva." />);
    expect(screen.getByRole("status")).toHaveTextContent("Ficha salva.");
  });

  it("não renderiza nada com mensagem nula", () => {
    const { container } = render(<Aviso mensagem={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Paginacao", () => {
  const base = "/coordenacao/catequizandos";

  it("omite parâmetros vazios e pagina=1, preservando os demais", () => {
    render(
      <Paginacao
        base={base}
        pagina={2}
        totalPaginas={3}
        parametros={{ q: "ana", estado: undefined, sem: "" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", `${base}?q=ana`);
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      `${base}?q=ana&pagina=3`,
    );
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
  });

  it("sem parâmetros, a página 1 é a própria base", () => {
    render(<Paginacao base={base} pagina={2} totalPaginas={2} parametros={{}} />);
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", base);
    expect(screen.queryByRole("link", { name: "Próxima" })).not.toBeInTheDocument();
  });

  it("não renderiza com uma única página", () => {
    const { container } = render(
      <Paginacao base={base} pagina={1} totalPaginas={1} parametros={{}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Confirmacao", () => {
  function montar(erro?: string) {
    const acao = vi.fn(async () => (erro ? { erro } : {}));
    render(
      <Confirmacao
        rotuloAbrir="Inativar"
        titulo="Inativar Ana?"
        texto="A ficha deixa de aparecer na lista padrão."
        rotuloConfirmar="Confirmar inativação"
        perigo
        acao={acao}
      />,
    );
    return acao;
  }

  it("abre com título, foco em Cancelar e confirmar chama a ação", async () => {
    const acao = montar();
    fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
    const dialogo = screen.getByRole("dialog", { name: "Inativar Ana?" });
    expect(within(dialogo).getByText(/deixa de aparecer/)).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar inativação" }));
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
  });

  it("mostra o erro da ação como alerta dentro do diálogo", async () => {
    montar("Não foi possível inativar.");
    fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar inativação" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível inativar.");
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toBe(alerta);
  });

  it("Cancelar fecha o diálogo", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
